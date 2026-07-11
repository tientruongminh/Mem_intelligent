'use client';

import '@xyflow/react/dist/style.css';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
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
  ArrowLeft,
  Check,
  GitCommitHorizontal,
  LayoutGrid,
  Lock,
  Pencil,
  Unlock,
  X,
} from 'lucide-react';
import { apiFetch, formatDate, percent } from '../../../../../lib/api';
import { LoadingState, PageHeader } from '../../../../../components/ui';

type Direction = 'horizontal' | 'vertical';
type WorkflowData = { title: string; confidence: number; isLocked: boolean; direction: Direction };
type Selection = { kind: 'node' | 'edge'; id: string } | null;

function WorkflowCard({ data, selected }: NodeProps<Node<WorkflowData>>) {
  const vertical = data.direction === 'vertical';
  return (
    <div
      className={`w-56 border bg-white shadow-panel ${selected ? 'border-teal ring-2 ring-teal/15' : 'border-line'}`}
      style={{ borderRadius: 7 }}
    >
      <Handle
        type="target"
        position={vertical ? Position.Top : Position.Left}
        className="!h-3 !w-3 !border-2 !border-white !bg-teal"
      />
      <div className="flex items-start justify-between gap-3 border-b border-line px-3 py-2.5">
        <p className="text-sm font-semibold leading-5">{data.title}</p>
        {data.isLocked && <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-coral" />}
      </div>
      <div className="flex items-center justify-between px-3 py-2 text-xs text-[#667085]">
        <span>Confidence</span>
        <span className="font-bold text-teal">{percent(data.confidence)}</span>
      </div>
      <Handle
        type="source"
        position={vertical ? Position.Bottom : Position.Right}
        className="!h-3 !w-3 !border-2 !border-white !bg-teal"
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
    interactionWidth: 28,
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: '#596b7f' },
    style: { stroke: '#596b7f', strokeWidth: 1.8 },
    labelStyle: { fill: '#354154', fontSize: 11, fontWeight: 600 },
    labelBgStyle: { fill: '#fff', fillOpacity: 0.94 },
    labelBgPadding: [7, 4] as [number, number],
    labelBgBorderRadius: 4,
  }));
  return { nodes, edges };
}

export default function WorkflowPage() {
  const conversationId = String(useParams().id);
  const initialNode = useSearchParams().get('node');
  const queryClient = useQueryClient();
  const [direction, setDirection] = useState<Direction>('horizontal');
  const [selection, setSelection] = useState<Selection>(
    initialNode ? { kind: 'node', id: initialNode } : null,
  );
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
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
    if (initialNode && nodes.length)
      setTimeout(
        () => instance?.fitView({ nodes: [{ id: initialNode }], padding: 1.2, duration: 450 }),
        60,
      );
  }, [initialNode, instance, nodes.length]);

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
  if (workflow.isLoading) return <LoadingState />;
  const selected = detail.data;

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
    setTimeout(() => instance?.fitView({ padding: 0.24, duration: 350 }), 40);
  };

  return (
    <div className="-m-4 lg:-m-8">
      <div className="border-b border-line bg-white px-4 py-4 lg:px-8">
        <Link
          href={`/conversations/${conversationId}`}
          className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-teal"
        >
          <ArrowLeft className="h-4 w-4" /> Transaction
        </Link>
        <PageHeader
          title="Conversation Workflow"
          description={`Revision ${workflow.data?.currentRevision ?? 0} · Kéo node để lưu vị trí, chọn node hoặc đường nối để xem evidence.`}
          actions={
            <div className="flex border border-line bg-white p-1" style={{ borderRadius: 7 }}>
              <button
                title="Bố cục ngang"
                className={`grid h-8 w-9 place-items-center ${direction === 'horizontal' ? 'bg-[#e7f6f8] text-teal' : 'text-[#667085]'}`}
                onClick={() => changeDirection('horizontal')}
              >
                <GitCommitHorizontal className="h-4 w-4" />
              </button>
              <button
                title="Bố cục dọc"
                className={`grid h-8 w-9 place-items-center ${direction === 'vertical' ? 'bg-[#e7f6f8] text-teal' : 'text-[#667085]'}`}
                onClick={() => changeDirection('vertical')}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          }
        />
      </div>
      <div className="relative h-[calc(100vh-174px)] min-h-[590px] bg-[#eef2f6]">
        <ReactFlow
          nodes={nodes}
          edges={edges.map((edge) => ({
            ...edge,
            animated: selection?.kind === 'edge' && selection.id === edge.id,
            style: {
              ...edge.style,
              stroke:
                selection?.kind === 'edge' && selection.id === edge.id ? '#087f8c' : '#596b7f',
              strokeWidth: selection?.kind === 'edge' && selection.id === edge.id ? 2.8 : 1.8,
            },
          }))}
          nodeTypes={{ workflow: WorkflowCard }}
          onInit={setInstance}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_event, node) => {
            setSelection({ kind: 'node', id: node.id });
            setEditing(false);
          }}
          onEdgeClick={(_event, edge) => {
            setSelection({ kind: 'edge', id: edge.id });
            setEditing(false);
          }}
          onNodeDragStop={(_event, node) =>
            mutate.mutate({ path: `/workflow/nodes/${node.id}`, body: { position: node.position } })
          }
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.3}
          maxZoom={1.65}
          nodesDraggable
          nodesConnectable={false}
          edgesFocusable
          edgesReconnectable={false}
        >
          <Background color="#c8d0da" gap={24} size={1} />
          <Controls position="bottom-left" />
          <MiniMap
            position="bottom-right"
            pannable
            zoomable
            nodeColor="#087f8c"
            maskColor="rgba(238,242,246,.75)"
          />
        </ReactFlow>

        {selection && (
          <aside className="absolute inset-y-0 right-0 z-10 w-full max-w-md overflow-y-auto border-l border-line bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-line bg-white px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase text-[#778195]">
                  Workflow {selection.kind}
                </p>
                <h2 className="mt-1 font-semibold">
                  {selected?.title ?? selected?.label ?? 'Đang tải...'}
                </h2>
              </div>
              <button
                className="btn-secondary h-8 w-8 px-0"
                title="Đóng"
                onClick={() => setSelection(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {detail.isLoading ? (
              <div className="p-5">
                <LoadingState />
              </div>
            ) : (
              selected && (
                <div className="space-y-6 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#667085]">Confidence</span>
                    <span className="font-bold text-teal">{percent(selected.confidence)}</span>
                  </div>
                  {selection.kind === 'edge' && (
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-y border-line py-3 text-center text-xs">
                      <span>{selected.fromNode?.title}</span>
                      <span className="text-teal">→</span>
                      <span>{selected.toNode?.title}</span>
                    </div>
                  )}
                  {editing ? (
                    <div className="space-y-3">
                      <label>
                        <span className="label">
                          {selection.kind === 'node' ? 'Tiêu đề' : 'Nhãn đường nối'}
                        </span>
                        <input
                          className="field"
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
                        />
                      </label>
                      <label>
                        <span className="label">Mô tả</span>
                        <textarea
                          className="field h-28 py-2"
                          value={description}
                          onChange={(event) => setDescription(event.target.value)}
                        />
                      </label>
                      <button
                        className="btn-primary"
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
                        <Check className="h-4 w-4" /> Lưu
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold uppercase text-[#778195]">Mô tả</p>
                      <p className="mt-2 text-sm leading-6 text-[#465469]">
                        {selected.description || 'Chưa có mô tả.'}
                      </p>
                    </div>
                  )}
                  {selection.kind === 'node' && selected.metadataJson && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-[#778195]">Metadata AI</p>
                      <pre className="mt-2 overflow-x-auto border border-line bg-[#f8fafc] p-3 text-xs leading-5">
                        {JSON.stringify(selected.metadataJson, null, 2)}
                      </pre>
                    </div>
                  )}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase text-[#778195]">
                        Message reference
                      </p>
                      <span className="text-xs text-[#778195]">
                        {selected.evidences?.length ?? 0}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {selected.evidences?.map((evidence: any) => (
                        <div
                          key={evidence.id}
                          className="border-l-2 border-teal bg-[#f7f9fb] px-4 py-3"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold">{evidence.message.senderType}</span>
                            <span className="text-[#778195]">
                              {formatDate(evidence.message.sentAt)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6">{evidence.excerpt}</p>
                          <p className="mt-2 text-xs text-[#778195]">
                            Relevance {percent(evidence.relevanceScore)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 border-t border-line pt-5">
                    <button
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
                        className="btn-secondary flex-1"
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
                </div>
              )
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
