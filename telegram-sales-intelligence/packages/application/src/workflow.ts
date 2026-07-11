import {
  NotFoundError,
  WorkflowValidationError,
  normalizeWorkflowTitle,
  type ActorContext,
  type DomainRepositories,
  type UUID,
  type WorkflowAnalysisProposal,
  type WorkflowOperation,
} from '@tsi/domain';
import type { AiProvider } from './ports.js';

export class WorkflowValidator {
  constructor(
    private readonly repositories: DomainRepositories,
    private readonly confidenceThreshold = 0.55,
  ) {}

  async validate(input: {
    actor: ActorContext;
    conversationId: UUID;
    proposal: WorkflowAnalysisProposal;
  }): Promise<WorkflowOperation[]> {
    const graph = await this.repositories.workflows.getOrCreateGraph(
      input.actor.organizationId,
      input.conversationId,
    );
    const accepted: WorkflowOperation[] = [];
    const knownTitles = new Set(graph.nodes.map((node) => normalizeWorkflowTitle(node.title)));

    for (const operation of input.proposal.operations) {
      if (operation.type === 'NO_CHANGE') {
        accepted.push(operation);
        continue;
      }
      if ((operation.confidence ?? 0) < this.confidenceThreshold) continue;
      const evidenceIds = operation.evidenceMessageIds ?? [];
      if (!evidenceIds.length)
        throw new WorkflowValidationError('Every workflow change requires evidence');
      const evidence = await this.repositories.messages.findByIds(
        input.actor.organizationId,
        input.conversationId,
        evidenceIds,
      );
      if (evidence.length !== new Set(evidenceIds).size) {
        throw new WorkflowValidationError(
          'Evidence must exist and belong to the same conversation',
        );
      }

      if (operation.type === 'UPDATE_NODE' && operation.nodeId) {
        const node = await this.repositories.workflows.findNode(
          input.actor.organizationId,
          operation.nodeId,
        );
        if (!node || node.workflowGraphId !== graph.id) {
          throw new WorkflowValidationError('Node does not belong to this workflow');
        }
        if (node.isLocked)
          throw new WorkflowValidationError('Locked nodes cannot be updated by AI');
      }
      if (operation.type === 'ADD_NODE' && operation.title) {
        const normalized = normalizeWorkflowTitle(operation.title);
        if (knownTitles.has(normalized)) {
          throw new WorkflowValidationError(`Duplicate workflow node: ${operation.title}`);
        }
        knownTitles.add(normalized);
      }
      if (
        operation.type === 'ADD_EDGE' &&
        operation.fromNodeId === operation.toNodeId &&
        !operation.allowSelfEdge
      ) {
        throw new WorkflowValidationError('Self edges require allowSelfEdge=true');
      }
      accepted.push(operation);
    }
    return accepted;
  }
}

export class AnalyzeConversationWorkflow {
  constructor(
    private readonly repositories: DomainRepositories,
    private readonly ai: AiProvider,
    private readonly validateOutput: (value: unknown) => WorkflowAnalysisProposal,
  ) {}

  async execute(input: { actor: ActorContext; conversationId: UUID }): Promise<unknown> {
    const conversation = await this.repositories.conversations.findById(
      input.actor.organizationId,
      input.conversationId,
    );
    if (!conversation) throw new NotFoundError('Conversation');
    const graph = await this.repositories.workflows.getOrCreateGraph(
      input.actor.organizationId,
      conversation.id,
    );
    const messages = await this.repositories.messages.listRecent(
      input.actor.organizationId,
      conversation.id,
      100,
    );
    const aiResult = await this.ai.generateStructured<WorkflowAnalysisProposal>({
      schemaName: 'dynamic_workflow_analysis',
      systemPrompt:
        'Analyze sales messages into dynamic nodes and edges. Never close conversations, set outcomes, send messages, delete data, or execute SQL.',
      input: {
        conversationId: conversation.id,
        previousConversationId: conversation.previousConversationId,
        currentRevision: graph.currentRevision,
        currentNodes: graph.nodes,
        currentEdges: graph.edges,
        newMessages: messages,
      },
      validate: this.validateOutput,
    });
    const validator = new WorkflowValidator(this.repositories);
    const operations = await validator.validate({
      actor: input.actor,
      conversationId: conversation.id,
      proposal: aiResult.data,
    });
    return this.repositories.transaction.run(() =>
      this.repositories.workflows.applyAnalysis({
        organizationId: input.actor.organizationId,
        conversationId: conversation.id,
        graphId: graph.id,
        baseRevision: graph.currentRevision,
        modelName: aiResult.model,
        promptVersion: 'workflow-v1',
        inputSnapshot: { messageIds: messages.map((message) => message.id) },
        output: aiResult.data as unknown as Record<string, unknown>,
        operations: operations as unknown as Array<Record<string, unknown>>,
      }),
    );
  }
}
