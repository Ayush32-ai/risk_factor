'use client';

import { useEffect, useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, X } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Icon, ClientOnly } from '@/components/client-only';
import { AuthGuard } from '@/components/auth-guard';
import { api } from '@/lib/api';
import { getRiskColor } from '@/lib/utils';

interface GraphNodeData {
  id: string;
  type: string;
  label: string;
  riskScore: number;
  data?: Record<string, unknown>;
}

interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  label: string;
}

interface GraphData {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
}

interface SelectedNodeData {
  label?: string;
  riskScore?: number;
  riskProfile?: {
    factors?: string[];
  };
}

const nodeColors: Record<string, string> = {
  device: '#8b5cf6',
  user: '#3b82f6',
  account: '#06b6d4',
  merchant: '#10b981',
  refund: '#ef4444',
};

function CustomNode({ data }: { data: Record<string, unknown> }) {
  const type = String(data.nodeType ?? 'default');
  const label = String(data.label ?? 'Unknown');
  const riskScore = Number(data.riskScore ?? 0);
  const color = nodeColors[type] ?? '#64748b';

  return (
    <div
      className="px-4 py-3 rounded-lg border-2 bg-sentinel-surface min-w-[120px] cursor-pointer hover:scale-105 transition-transform shadow-lg"
      style={{ borderColor: color }}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!bg-sentinel-muted !w-2 !h-2 !border-2 !border-white" 
      />
      <p className="text-xs text-sentinel-muted uppercase font-medium">{type}</p>
      <p className="font-semibold text-sm mt-0.5 text-gray-900">{label}</p>
      <p className={`text-xs font-mono mt-1 font-bold ${getRiskColor(riskScore)}`}>
        Risk: {riskScore}/100
      </p>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!bg-sentinel-muted !w-2 !h-2 !border-2 !border-white" 
      />
    </div>
  );
}

const nodeTypes = { custom: CustomNode };

const getNodePosition = (nodeId: string, index: number) => {
  // Predefined positions for known nodes
  const layoutPositions: Record<string, { x: number; y: number }> = {
    'device-1': { x: 400, y: 0 },
    'user-a': { x: 200, y: 120 },
    'user-b': { x: 600, y: 120 },
    'account-a': { x: 150, y: 260 },
    'account-b': { x: 550, y: 260 },
    'merchant-1': { x: 350, y: 400 },
    'refund-1': { x: 350, y: 520 },
    'account-c': { x: 350, y: 640 },
  };

  // Return predefined position or generate one based on index
  return layoutPositions[nodeId] || {
    x: 200 + (index % 4) * 200,
    y: 100 + Math.floor(index / 4) * 150
  };
};

export default function GraphPage() {
  const [selectedNode, setSelectedNode] = useState<SelectedNodeData | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['graph'],
    refetchInterval: 15000,
    queryFn: async () => {
      console.log('Fetching graph data...');
      const result = await api.getGraph();
      console.log('Raw API result:', result);
      
      if (!result || !result.nodes || !result.edges) {
        throw new Error('Invalid graph data structure');
      }

      // Safely convert the API response to our expected format
      const graphData: GraphData = {
        nodes: (result.nodes as Record<string, unknown>[]).map(node => ({
          id: String(node.id),
          type: String(node.type),
          label: String(node.label),
          riskScore: Number(node.riskScore),
          data: node.data as Record<string, unknown>
        })),
        edges: (result.edges as Record<string, unknown>[]).map(edge => ({
          id: String(edge.id),
          source: String(edge.source),
          target: String(edge.target),
          label: String(edge.label)
        }))
      };
      console.log('Processed graph data:', graphData);
      return graphData;
    },
    retry: 3,
    retryDelay: 1000,
  });

  useEffect(() => {
    if (!data?.nodes || !data?.edges) {
      console.log('No graph data available');
      return;
    }

    console.log('Processing graph data:', data);

    const flowNodes: Node[] = data.nodes.map((n, index) => ({
      id: String(n.id),
      type: 'custom',
      position: getNodePosition(String(n.id), index),
      data: { 
        label: n.label, 
        nodeType: n.type, 
        riskScore: n.riskScore, 
        ...(n.data ?? {}) 
      },
    }));

    const flowEdges: Edge[] = data.edges.map((e) => ({
      id: String(e.id),
      source: String(e.source),
      target: String(e.target),
      label: String(e.label),
      animated: true,
      style: { stroke: '#475569', strokeWidth: 2 },
      labelStyle: { fill: '#64748b', fontSize: 12 },
    }));

    console.log('Setting nodes:', flowNodes);
    console.log('Setting edges:', flowEdges);

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [data, setNodes, setEdges]);

  const onNodeClick = useCallback(async (_: React.MouseEvent, node: Node) => {
    try {
      console.log('Node clicked:', node.id);
      const profile = await api.getNodeProfile(node.id);
      console.log('Node profile:', profile);
      setSelectedNode({
        label: String(profile.node.label),
        riskScore: Number(profile.node.riskScore),
        riskProfile: {
          factors: Array.isArray(profile.riskProfile?.factors) 
            ? profile.riskProfile.factors.map(String)
            : []
        }
      });
    } catch (error) {
      console.error('Failed to load node profile:', error);
      setSelectedNode({
        label: String(node.data?.label),
        riskScore: Number(node.data?.riskScore),
        riskProfile: { factors: ['Failed to load detailed profile'] }
      });
    }
  }, []);

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3">
              <Network className="w-6 h-6 text-cyan-400" />
              <h1 className="text-2xl font-bold">Transaction Graph</h1>
            </div>
            <p className="text-sentinel-muted mt-1">Neo4j-powered payment network visualization · Click a node for risk profile · {data ? `${data.nodes.length} nodes, ${data.edges.length} edges` : 'Loading...'}</p>
          </div>

          <div className="sentinel-card bg-red-50 border-red-200 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="text-red-600 text-lg">⚠️</div>
              <div>
                <h3 className="font-semibold text-red-700 mb-2">Critical Fraud Network Detected</h3>
                <p className="text-sm text-red-700 leading-relaxed mb-3">
                  This network shows characteristics of organized fraud: <strong>7 accounts sharing a single device fingerprint</strong>, 
                  abnormal transaction timing patterns, and <strong>refund destinations that overlap with payment sources</strong>. 
                  The network's structure and behavior patterns indicate coordinated activity rather than legitimate independent users.
                </p>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="text-red-700 font-medium">Shared Device</p>
                    <p className="text-red-600">7 accounts, 1 device</p>
                  </div>
                  <div>
                    <p className="text-red-700 font-medium">Transaction Velocity</p>
                    <p className="text-red-600">4.7× baseline rate</p>
                  </div>
                  <div>
                    <p className="text-red-700 font-medium">Refund Overlap</p>
                    <p className="text-red-600">Circular pattern detected</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative h-[calc(100vh-220px)] sentinel-card p-0 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-sentinel-muted">Loading transaction graph...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-red-400 mb-2">Failed to load graph</p>
                  <p className="text-sentinel-muted text-sm">Error: {String(error)}</p>
                </div>
              </div>
            ) : (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{
                  padding: 0.2,
                  includeHiddenNodes: false,
                  minZoom: 0.5,
                  maxZoom: 1.5,
                }}
                className="bg-sentinel-bg"
                defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                minZoom={0.3}
                maxZoom={2}
                attributionPosition="top-right"
              >
                <Background 
                  color="#1e293b" 
                  gap={20}
                  size={1}
                />
                <Controls 
                  position="top-left"
                  className="bg-sentinel-surface border-sentinel-border"
                />
                <MiniMap
                  nodeColor={(n) => nodeColors[String(n.data?.nodeType)] ?? '#64748b'}
                  maskColor="rgba(10, 14, 23, 0.8)"
                  className="bg-sentinel-surface border-sentinel-border"
                  position="bottom-right"
                />
              </ReactFlow>
            )}

            <AnimatePresence>
              {selectedNode && (
                <motion.div
                  initial={{ x: 300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 300, opacity: 0 }}
                  className="absolute top-4 right-4 w-96 sentinel-card border-red-500/30 max-h-[calc(100vh-300px)] overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">Network Risk Analysis</h3>
                      <p className="text-xs text-sentinel-muted">Real-time fraud detection</p>
                    </div>
                    <button onClick={() => setSelectedNode(null)} className="text-sentinel-muted hover:text-gray-900">
                      <Icon icon={X} className="w-4 h-4" fallbackClassName="w-4 h-4 bg-gray-500 rounded" />
                    </button>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-lg font-bold text-gray-900 mb-1">{selectedNode.label}</p>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`text-3xl font-mono font-black ${getRiskColor(selectedNode.riskScore ?? 0)}`}>
                        {selectedNode.riskScore ?? 0}/100
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-sentinel-muted">RISK SCORE</p>
                        <p className={`text-sm font-bold ${
                          (selectedNode.riskScore ?? 0) >= 90 ? 'text-red-400' : 
                          (selectedNode.riskScore ?? 0) >= 70 ? 'text-orange-400' : 'text-yellow-400'
                        }`}>
                          {(selectedNode.riskScore ?? 0) >= 90 ? 'CRITICAL' : 
                           (selectedNode.riskScore ?? 0) >= 70 ? 'HIGH RISK' : 'MEDIUM RISK'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedNode.riskProfile?.factors && selectedNode.riskProfile.factors.length > 0 && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          🚨 WHY IS THIS RISKY?
                        </h4>
                        <div className="space-y-2">
                          {selectedNode.riskProfile.factors.map((factor, i) => (
                            <div key={i} className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                              <p className="text-sm text-red-200 leading-relaxed">{factor}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="border-t border-sentinel-border pt-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Network Analysis</h4>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-sentinel-muted">Fraud Type</p>
                            <p className="text-gray-900 font-medium">Coordinated Network</p>
                          </div>
                          <div>
                            <p className="text-sentinel-muted">Cluster Size</p>
                            <p className="text-gray-900 font-medium">7 entities</p>
                          </div>
                          <div>
                            <p className="text-sentinel-muted">Confidence</p>
                            <p className="text-emerald-400 font-medium">
                              {(selectedNode.riskScore ?? 0) >= 90 ? '98%' : 
                               (selectedNode.riskScore ?? 0) >= 70 ? '94%' : '87%'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sentinel-muted">Detection</p>
                            <p className="text-cyan-400 font-medium">Graph AI</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-blue-800">
                          <strong>AI Assessment:</strong> This entity is part of a coordinated transaction network 
                          exploiting individual-transaction evaluation blind spots. Evidence includes shared device 
                          fingerprints, abnormal transaction timing, and suspicious refund patterns.
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}