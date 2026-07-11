'use client';

import '@xyflow/react/dist/style.css';
import { useParams, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'motion/react';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from '@xyflow/react';
import {
  Check,
  Focus,
  GitCommitHorizontal,
  LayoutGrid,
  Lock,
  Maximize2,
  MousePointerClick,
  Pencil,
  Unlock,
  X,
} from 'lucide-react';
import { apiFetch, formatDate, percent } from '../../../../../lib/api';
import { SlidePanel, StaggerGrid, StaggerItem } from '../../../../../components/motion';
import { BackLink, LoadingState, PageHeader } from '../../../../../components/ui';

type Direction = 'horizontal' | 'vertical';
type WorkflowData = {
  title: string;
  confidence: number;
  isLocked: boolean;
  direction: Direction;
};
type Selection = { kind: 'node' | 'edge'; id: string } | null;

const ACCENT = '#1D4ED8';
const EDGE_IDLE = '#94A3B8';
const EDGE_ACTIVE = '#1D4ED8';

function confidenceColor(value: number) {
  if (value >= 0.75) return '#059669';
  if (value >= 0.5) return '#1D4ED8';
  return '#D97706';
}

function WorkflowCard({ data, selected }: NodeProps<Node<WorkflowData>>) {
  const vertical = data.direction === 'vertical';
  const pct = Math.round(data.confidence * 100);

  return (
    <div
      className={`wf-node ${selected ? 'wf-node-selected' : 'border-line'} ${data.isLocked ? 'wf-node-locked' : ''}`}
    >
      <div
        className="h-1"
        style={{ background: confidenceColor(data.confidence), opacity: selected ? 1 : 0.85 }}
      />
      <Handle
        type="target"
        position={vertical ? Position.Top : Position.Left}
        className="!h-3 !w-3 !border-2 !border-white !bg-accent !transition-transform hover:!scale-125"
      />
      <div className="flex items-start justify-between gap-2 px-3.5 pb-1 pt-3">
        <p className="text-sm font-semibold leading-snug text-ink">{data.title}</p>
        {data.isLocked && (
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-warning-muted text-warning">
            <Lock className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
        )}
      </div>
      <div className="space-y-1.5 px-3.5 pb-3.5">
        <div className="flex items-center justify-between text-[11px] text-ink-subtle">
          <span>Độ tin cậy</span>
          <span className="font-semibold tabular-nums text-ink">{pct}%</span>
        </div>
        <div className="wf-confidence-track">
          <div
            className="wf-confidence-fill"
            style={{ width: `${pct}%`, background: confidenceColor(data.confidence) }}
          />
        </div>
      </div>
      <Handle
        type="source"
        position={vertical ? Position.Bottom : Position.Right}
        className="!h-3 !w-3 !border-2 !border-white !bg-accent !transition-transform hover:!scale-125"
      />
    </div>
  );
}

function layoutGraph(source: any, direction: Direction) {
  const nodes: Node<WorkflowData>[] = (source?.nodes ?? []).map((node: any, index: number) => {
    const saved = node.metadataJson?.position;
    const fallback =
      direction === 'horizontal'
        ? { x: (index % 4) * 300, y: Math.floor(index / 4) * 185 + (index % 2) * 24 }
        : { x: (index % 3) * 300, y: Math.floor(index / 3) * 185 };
    return {
      id: node.id,
      type: 'workflow',
      position: saved ?? fallback,
      data: { title: node.title, confidence: node.confidence, isLocked: node.isLocked, direction },
    };
  });
  const edges: Edge[] = (source?.edges ?? []).map((edge: any) => ({
    id: edge.id,
    source: edge.fromNodeId,
    target: edge.toNodeId,
    label: edge.label,
    type: 'smoothstep',
    interactionWidth: 36,
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: EDGE_IDLE },
    style: { stroke: EDGE_IDLE, strokeWidth: 2 },
    labelStyle: { fill: '#334155', fontSize: 11, fontWeight: 600 },
    labelBgStyle: { fill: '#fff', fillOpacity: 0.96 },
    labelBgPadding: [8, 4] as [number, number],
    labelBgBorderRadius: 6,
  }));
  return { nodes, edges };
}

export default function WorkflowPage() {
  const conversationId = String(useParams().id);
  const initialNode = useSearchParams().get('node');
  const queryClient = useQueryClient();
  const reduce = useReducedMotion();
  const [direction, setDirection] = useState<Direction>('horizontal');
  const [selection, setSelection] = useState<Selection>(
    initialNode ? { kind: 'node', id: initialNode } : null,
  );
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [savedHint, setSavedHint] = useState('');
  const [instance, setInstance] = useState<ReactFlowInstance<Node<WorkflowData>, Edge> | null>(
    null,
  );

  const workflow = useQuery({
    queryKey: ['workflow', conversationId],
    queryFn: () => apiFetch<any>(`/conversations/${conversationId}/workflow`),
  });
  const initialGraph = useMemo(
    () => layoutGraph(workflow.data, direction),
    [workflow.data, direction],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<WorkflowData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    setNodes(initialGraph.nodes);
    setEdges(initialGraph.edges);
  }, [initialGraph, setEdges, setNodes]);

  useEffect(() => {
    if (initialNode && nodes.length) {
      setTimeout(
        () => instance?.fitView({ nodes: [{ id: initialNode }], padding: 1.2, duration: 450 }),
        60,
      );
    }
  }, [initialNode, instance, nodes.length]);

  useEffect(() => {
    if (!selection) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelection(null);
        setEditing(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selection]);

  const detail = useQuery({
    queryKey: ['workflow-selection', selection?.kind, selection?.id],
    queryFn: () =>
      apiFetch<any>(`/workflow/${selection!.kind === 'node' ? 'nodes' : 'edges'}/${selection!.id}`),
    enabled: Boolean(selection),
  });

  const mutate = useMutation({
    mutationFn: ({
      path,
      method = 'PATCH',
      body,
    }: {
      path: string;
      method?: string;
      body?: unknown;
    }) => apiFetch(path, { method, body: body ? JSON.stringify(body) : undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['workflow-selection'] });
      setEditing(false);
    },
  });

  const flashSaved = useCallback((text: string) => {
    setSavedHint(text);
    window.setTimeout(() => setSavedHint(''), 1800);
  }, []);

  const changeDirection = (next: Direction) => {
    setDirection(next);
    const graph = layoutGraph(
      {
        ...workflow.data,
        nodes: workflow.data?.nodes?.map((node: any) => ({ ...node, metadataJson: null })),
      },
      next,
    );
    setNodes(graph.nodes);
    setTimeout(() => instance?.fitView({ padding: 0.24, duration: reduce ? 0 : 350 }), 40);
  };

  const styledNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        selected: selection?.kind === 'node' && selection.id === node.id,
      })),
    [nodes, selection],
  );

  const styledEdges = useMemo(
    () =>
      edges.map((edge) => {
        const active = selection?.kind === 'edge' && selection.id === edge.id;
        return {
          ...edge,
          selected: active,
          animated: active,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 16,
            height: 16,
            color: active ? EDGE_ACTIVE : EDGE_IDLE,
          },
          style: {
            ...edge.style,
            stroke: active ? EDGE_ACTIVE : EDGE_IDLE,
            strokeWidth: active ? 2.8 : 2,
          },
        };
      }),
    [edges, selection],
  );

  if (workflow.isLoading) return <LoadingState text="Đang tải workflow..." />;
  const selected = detail.data;
  const nodeCount = nodes.length;
  const edgeCount = edges.length;

  return (
    <div className="-m-4 lg:-m-8">
      <div className="border-b border-line bg-surface px-4 py-4 lg:px-8">
        <BackLink href={`/conversations/${conversationId}`} label="Quay lại giao dịch" />
        <PageHeader
          title="Workflow"
          description={`Phiên bản ${workflow.data?.currentRevision ?? 0} · Kéo thả node, click để xem bằng chứng tin nhắn.`}
          meta={`${nodeCount} bước · ${edgeCount} liên kết`}
        />
      </div>

      <div className="relative h-[calc(100dvh-174px)] min-h-[590px] wf-canvas">
        {!selection && nodeCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="wf-hint"
          >
            <MousePointerClick className="mr-1.5 inline h-3.5 w-3.5 opacity-70" />
            Click node hoặc đường nối để mở chi tiết · Kéo để sắp xếp
          </motion.div>
        )}

        {nodeCount === 0 ? (
          <div className="flex h-full items-center justify-center p-6">
            <div className="panel max-w-md p-8 text-center">
              <p className="text-sm font-medium text-ink">Chưa có workflow</p>
              <p className="mt-2 text-sm text-ink-muted">
                Worker sẽ tạo sơ đồ sau khi có đủ tin nhắn trong giao dịch.
              </p>
            </div>
          </div>
        ) : (
          <ReactFlow
            className="wf-flow"
            nodes={styledNodes}
            edges={styledEdges}
            nodeTypes={{ workflow: WorkflowCard }}
            onInit={setInstance}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onPaneClick={() => {
              setSelection(null);
              setEditing(false);
            }}
            onNodeClick={(_event, node) => {
              setSelection({ kind: 'node', id: node.id });
              setEditing(false);
              if (instance) {
                const { x, y } = node.position;
                instance.setCenter(x + 120, y + 48, {
                  zoom: instance.getZoom(),
                  duration: reduce ? 0 : 260,
                });
              }
            }}
            onEdgeClick={(_event, edge) => {
              setSelection({ kind: 'edge', id: edge.id });
              setEditing(false);
            }}
            onNodeDragStop={(_event, node) => {
              mutate.mutate({ path: `/workflow/nodes/${node.id}`, body: { position: node.position } });
              flashSaved('Đã lưu vị trí node');
            }}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            minZoom={0.25}
            maxZoom={1.8}
            nodesDraggable
            nodesConnectable={false}
            elementsSelectable
            selectNodesOnDrag={false}
            nodeDragThreshold={2}
            panOnScroll
            zoomOnScroll
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} color="#CBD5E1" gap={22} size={1.2} />
            <Controls position="bottom-left" showInteractive={false} />
            <MiniMap
              position="bottom-right"
              pannable
              zoomable
              nodeColor={ACCENT}
              maskColor="rgba(248,250,252,0.82)"
              className="!bottom-4 !right-4"
            />
            <Panel position="top-left" className="!m-4">
              <div className="wf-toolbar">
                <div className="seg-control">
                  <button
                    type="button"
                    title="Bố cục ngang"
                    className={direction === 'horizontal' ? 'seg-btn-active' : 'seg-btn'}
                    onClick={() => changeDirection('horizontal')}
                  >
                    <GitCommitHorizontal className="h-3.5 w-3.5" />
                    Ngang
                  </button>
                  <button
                    type="button"
                    title="Bố cục dọc"
                    className={direction === 'vertical' ? 'seg-btn-active' : 'seg-btn'}
                    onClick={() => changeDirection('vertical')}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Dọc
                  </button>
                </div>
                <button
                  type="button"
                  className="btn-icon"
                  title="Căn vừa màn hình"
                  onClick={() => instance?.fitView({ padding: 0.22, duration: reduce ? 0 : 320 })}
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
                {initialNode && (
                  <button
                    type="button"
                    className="btn-icon"
                    title="Focus node từ insight"
                    onClick={() =>
                      instance?.fitView({
                        nodes: [{ id: initialNode }],
                        padding: 1.1,
                        duration: reduce ? 0 : 400,
                      })
                    }
                  >
                    <Focus className="h-4 w-4" />
                  </button>
                )}
              </div>
            </Panel>
            {savedHint && (
              <Panel position="top-center" className="!mt-4">
                <motion.span
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-full border border-success/25 bg-success-muted px-3 py-1 text-xs font-medium text-success-foreground shadow-sm"
                >
                  {savedHint}
                </motion.span>
              </Panel>
            )}
          </ReactFlow>
        )}

        {selection ? (
          <SlidePanel
            open
            onClose={() => {
              setSelection(null);
              setEditing(false);
            }}
          >
              <div className="flex h-full flex-col">
                <div className="flex shrink-0 items-start justify-between border-b border-line px-5 py-4">
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-medium text-ink-subtle">
                      {selection.kind === 'node' ? 'Bước workflow' : 'Liên kết'} · Esc để đóng
                    </p>
                    <h2 className="mt-1 truncate font-semibold tracking-tight text-ink">
                      {selected?.title ?? selected?.label ?? 'Đang tải...'}
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="btn-icon shrink-0"
                    aria-label="Đóng panel"
                    onClick={() => {
                      setSelection(null);
                      setEditing(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto chat-scroll">
                  {detail.isLoading ? (
                    <div className="p-5">
                      <LoadingState text="Đang tải chi tiết..." />
                    </div>
                  ) : (
                    selected && (
                      <div className="space-y-5 p-5">
                        <div className="rounded-xl border border-line bg-canvas-subtle/60 p-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-ink-muted">Độ tin cậy</span>
                            <span className="font-semibold tabular-nums text-accent">
                              {percent(selected.confidence)}
                            </span>
                          </div>
                          <div className="wf-confidence-track mt-2">
                            <div
                              className="wf-confidence-fill"
                              style={{
                                width: `${Math.round(selected.confidence * 100)}%`,
                                background: confidenceColor(selected.confidence),
                              }}
                            />
                          </div>
                        </div>

                        {selection.kind === 'edge' && (
                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border border-line bg-surface px-3 py-3 text-center text-xs">
                            <span className="truncate font-medium">{selected.fromNode?.title}</span>
                            <span className="text-accent">→</span>
                            <span className="truncate font-medium">{selected.toNode?.title}</span>
                          </div>
                        )}

                        {editing ? (
                          <div className="space-y-3 rounded-xl border border-accent/20 bg-accent-muted/30 p-4">
                            <label className="block">
                              <span className="label">
                                {selection.kind === 'node' ? 'Tiêu đề bước' : 'Nhãn liên kết'}
                              </span>
                              <input
                                className="field"
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                              />
                            </label>
                            <label className="block">
                              <span className="label">Mô tả</span>
                              <textarea
                                className="field h-28 py-2"
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                              />
                            </label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="btn-primary flex-1"
                                disabled={mutate.isPending}
                                onClick={() =>
                                  mutate.mutate({
                                    path: `/workflow/${selection.kind === 'node' ? 'nodes' : 'edges'}/${selection.id}`,
                                    body:
                                      selection.kind === 'node'
                                        ? { title, description }
                                        : { label: title, description },
                                  })
                                }
                              >
                                <Check className="h-4 w-4" />
                                {mutate.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                              </button>
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setEditing(false)}
                              >
                                Huỷ
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs font-medium text-ink-subtle">Mô tả</p>
                            <p className="mt-2 text-sm leading-6 text-ink-muted">
                              {selected.description || 'Chưa có mô tả cho mục này.'}
                            </p>
                          </div>
                        )}

                        {selection.kind === 'node' && selected.metadataJson && (
                          <details className="rounded-xl border border-line bg-surface">
                            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ink">
                              Metadata AI
                            </summary>
                            <pre className="max-h-44 overflow-auto border-t border-line bg-canvas-subtle p-3 text-xs leading-5 text-ink-muted">
                              {JSON.stringify(selected.metadataJson, null, 2)}
                            </pre>
                          </details>
                        )}

                        <div>
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-sm font-medium text-ink">Bằng chứng tin nhắn</p>
                            <span className="rounded-full bg-canvas-subtle px-2 py-0.5 text-xs tabular-nums text-ink-muted">
                              {selected.evidences?.length ?? 0}
                            </span>
                          </div>
                          {selected.evidences?.length ? (
                            <StaggerGrid className="space-y-2.5">
                              {selected.evidences.map((evidence: any) => (
                                <StaggerItem key={evidence.id} className="wf-evidence">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-medium text-ink">
                                      {evidence.message.senderType === 'EMPLOYEE'
                                        ? 'Sale'
                                        : 'Khách hàng'}
                                    </span>
                                    <span className="text-ink-subtle">
                                      {formatDate(evidence.message.sentAt)}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-sm leading-6 text-ink">{evidence.excerpt}</p>
                                  <p className="mt-2 text-xs text-ink-subtle">
                                    Liên quan {percent(evidence.relevanceScore)}
                                  </p>
                                </StaggerItem>
                              ))}
                            </StaggerGrid>
                          ) : (
                            <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-muted">
                              Chưa có bằng chứng tin nhắn được gắn.
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>

                {selected && !detail.isLoading && (
                  <div className="flex shrink-0 gap-2 border-t border-line bg-surface p-4">
                    <button
                      type="button"
                      className="btn-secondary flex-1"
                      onClick={() => {
                        setEditing(true);
                        setTitle(selection.kind === 'node' ? selected.title : selected.label);
                        setDescription(selected.description ?? '');
                      }}
                    >
                      <Pencil className="h-4 w-4" /> Sửa
                    </button>
                    {selection.kind === 'node' && (
                      <button
                        type="button"
                        className="btn-secondary flex-1"
                        disabled={mutate.isPending}
                        onClick={() =>
                          mutate.mutate({
                            path: `/workflow/nodes/${selection.id}/${selected.isLocked ? 'unlock' : 'lock'}`,
                            method: 'POST',
                          })
                        }
                      >
                        {selected.isLocked ? (
                          <Unlock className="h-4 w-4" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                        {selected.isLocked ? 'Mở khóa' : 'Khóa'}
                      </button>
                    )}
                  </div>
                )}
              </div>
          </SlidePanel>
        ) : null}
      </div>
    </div>
  );
}
