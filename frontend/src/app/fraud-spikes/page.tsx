'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  AlertTriangle,
  Activity,
  Target,
  Zap,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AuthGuard } from '@/components/auth-guard';
import { MetricCard } from '@/components/ui/metric-card';
import { useState } from 'react';

import { api } from '@/lib/api';
import { useWebSocket } from '@/hooks/use-websocket';

// Custom label component for multi-line text
const CustomLabel = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, pattern, percent, index } = props;
  
  const radius = innerRadius + (outerRadius - innerRadius) * 1.2;
  const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
  const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
  
  // Use the same color as the corresponding pie segment
  const textColor = COLORS[index % COLORS.length];
  
  if (pattern === 'Payment Velocity') {
    return (
      <text 
        x={x} 
        y={y} 
        fill={textColor}
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="600"
      >
        <tspan x={x} dy="-0.3em">Payment</tspan>
        <tspan x={x} dy="1.2em">Velocity</tspan>
        <tspan x={x} dy="1.2em">{(percent * 100).toFixed(0)}%</tspan>
      </text>
    );
  }
  
  return (
    <text 
      x={x} 
      y={y} 
      fill={textColor}
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize="12"
      fontWeight="600"
    >
      {`${pattern} ${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];

interface FraudSpike {
  pattern: string;
  severity: 'high' | 'medium' | 'low';
  confidence: number;
  transactions: number;
  timeframe: string;
  riskScore: number;
}

interface DashboardSummary {
  totalSpikes: number;
  highRiskSpikes: number;
  averageConfidence: number;
  transactionsAffected: number;
  patternBreakdown: Array<{
    pattern: string;
    count: number;
  }>;
  recentSpikes: FraudSpike[];
  attackContext: {
    activeAttack: boolean;
    attackScenario: string;
    attackGeneration: number;
    defenseEffectiveness: number;
    networkRiskScore: number;
  };
}

export default function FraudSpikesPage() {
  const [selectedTimeframe, setSelectedTimeframe] = useState(60);
  const queryClient = useQueryClient();
  const wsBase = (process.env.NEXT_PUBLIC_API_URL || 'https://risk-factor-500.onrender.com').replace(/^http/, 'ws');

  useWebSocket(`${wsBase}/ws`, {
    onMessage: () => {
      queryClient.invalidateQueries({ queryKey: ['fraud-spikes-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['fraud-trends'] });
    },
  });

  const { data: dashboard, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery<DashboardSummary>({
    queryKey: ['fraud-spikes-dashboard'],
    queryFn: () => api.get('/api/fraud-spikes/dashboard'),
    refetchInterval: 30000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  const { data: trends, isLoading: trendsLoading, refetch: refetchTrends } = useQuery({
    queryKey: ['fraud-trends'],
    queryFn: () => api.get('/api/fraud-spikes/trends'),
    refetchInterval: 60000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  const analyzePatternsMutation = useMutation({
    mutationFn: (timeframe: number) => 
      api.post('/api/fraud-spikes/analyze', { timeframe_minutes: timeframe }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fraud-spikes-dashboard'] });
    },
  });

  const handleAnalyzePatterns = () => {
    analyzePatternsMutation.mutate(selectedTimeframe);
  };

  const handleRefresh = () => {
    refetchDashboard();
    refetchTrends();
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
          {/* Header */}
          <div className="bg-white/70 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
            <div className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Fraud Spike Detection
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Real-time detection and analysis of fraud pattern spikes
                  </p>
                  {/* Attack Status Indicators */}
                  <div className="flex items-center gap-4 mt-2">
                    {dashboard?.attackContext?.activeAttack && (
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium border border-red-200">
                        🚨 Active Attack: {dashboard.attackContext.attackScenario} (Gen {dashboard.attackContext.attackGeneration})
                      </span>
                    )}
                    {dashboard?.attackContext && dashboard.attackContext.defenseEffectiveness > 0 && (
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium border border-emerald-200">
                        🛡️ Defense Active ({dashboard.attackContext.defenseEffectiveness.toFixed(0)}% effective)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <select
                    value={selectedTimeframe}
                    onChange={(e) => setSelectedTimeframe(Number(e.target.value))}
                    className="bg-white/90 border-2 border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 shadow-sm"
                  >
                    <option value={30} className="text-gray-700 font-medium">Last 30 minutes</option>
                    <option value={60} className="text-gray-700 font-medium">Last 1 hour</option>
                    <option value={180} className="text-gray-700 font-medium">Last 3 hours</option>
                    <option value={360} className="text-gray-700 font-medium">Last 6 hours</option>
                  </select>
                  <button
                    onClick={handleAnalyzePatterns}
                    disabled={analyzePatternsMutation.isPending}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
                  >
                    {analyzePatternsMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      'Analyze Patterns'
                    )}
                  </button>
                  <button
                    onClick={handleRefresh}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2.5 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 font-semibold"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-8">
                  {/* Real-time Attack Status Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`p-6 rounded-xl border-2 shadow-lg ${
                dashboard?.attackContext?.activeAttack 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-white/70 backdrop-blur-sm border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {dashboard?.attackContext?.activeAttack ? '🔥 Live Attack Simulation' : '💤 Monitoring Mode'}
                  </h3>
                  <p className="text-gray-600">
                    {dashboard?.attackContext?.activeAttack 
                      ? `${dashboard.attackContext.attackScenario} - Generation ${dashboard.attackContext.attackGeneration}`
                      : 'No active attack simulation running'
                    }
                  </p>
                  {!dashboard?.attackContext?.activeAttack && (
                    <p className="text-blue-600 text-sm mt-2">
                      💡 Start a demo attack simulation in the <strong>Attack Simulator</strong> page to see real-time data updates
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {dashboard?.attackContext?.activeAttack && (
                    <div className="bg-red-100 border-2 border-red-200 rounded-lg p-4">
                      <div className="text-2xl font-bold text-red-600">ACTIVE</div>
                      <div className="text-sm text-red-600">Network Risk: {(dashboard.attackContext.networkRiskScore * 100).toFixed(0)}%</div>
                    </div>
                  )}
                  {dashboard?.attackContext && dashboard.attackContext.defenseEffectiveness > 0 && (
                    <div className="bg-emerald-100 border-2 border-emerald-200 rounded-lg p-4 ml-2">
                      <div className="text-2xl font-bold text-emerald-600">{dashboard.attackContext.defenseEffectiveness.toFixed(0)}%</div>
                      <div className="text-sm text-emerald-600">Defense Effective</div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Dashboard Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                label="Total Spikes Detected"
                value={dashboard?.totalSpikes?.toString() ?? '—'}
                icon={TrendingUp}
                delay={0}
              />
              <MetricCard
                label="High-Risk Spikes"
                value={dashboard?.highRiskSpikes?.toString() ?? '—'}
                icon={AlertTriangle}
                variant="danger"
                delay={0.1}
              />
              <MetricCard
                label="Average Confidence"
                value={dashboard?.averageConfidence?.toFixed(1) ?? '—'}
                suffix="%"
                icon={Target}
                delay={0.2}
              />
              <MetricCard
                label="Transactions Affected"
                value={dashboard?.transactionsAffected?.toLocaleString() ?? '—'}
                icon={Activity}
                delay={0.3}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Fraud Trends Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/70 backdrop-blur-sm border-0 shadow-lg rounded-xl p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg">
                    <LineChart className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Fraud Activity Trends</h2>
                </div>
                {trendsLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
                      <p className="text-gray-600">Loading trends...</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={trends?.hourlyTrends || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="hour" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="fraudEvents"
                        stroke="#ef4444"
                        strokeWidth={3}
                        name="Fraud Events"
                        dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="riskScore"
                        stroke="#f97316"
                        strokeWidth={3}
                        name="Risk Score"
                        dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#f97316', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </motion.div>

              {/* Pattern Breakdown */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white/70 backdrop-blur-sm border-0 shadow-lg rounded-xl p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                    <PieChart className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Pattern Breakdown</h2>
                </div>
                {dashboardLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
                      <p className="text-gray-600">Loading patterns...</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={dashboard?.patternBreakdown?.map((item, index) => ({ ...item, index })) || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={CustomLabel}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {dashboard?.patternBreakdown?.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          background: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                        }}
                        formatter={(value, name) => {
                          const displayName = name === 'Payment Velocity' 
                            ? 'Payment Velocity' 
                            : name;
                          return [value, displayName];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </motion.div>
            </div>

            {/* Recent Spikes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white/70 backdrop-blur-sm border-0 shadow-lg rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Recent Fraud Spikes</h2>
              </div>
              {dashboardLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
                  <p className="text-gray-600">Loading recent spikes...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/80">
                      <tr>
                        <th className="text-left py-4 px-4 font-semibold text-gray-700 border-b border-gray-200">Pattern</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-700 border-b border-gray-200">Severity</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-700 border-b border-gray-200">Confidence</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-700 border-b border-gray-200">Transactions</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-700 border-b border-gray-200">Risk Score</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-700 border-b border-gray-200">Timeframe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard?.recentSpikes?.map((spike, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors duration-200">
                          <td className="py-4 px-4 font-medium text-gray-900">{spike.pattern}</td>
                          <td className="py-4 px-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                spike.severity === 'high'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : spike.severity === 'medium'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {spike.severity.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-semibold text-blue-600">{spike.confidence.toFixed(1)}%</td>
                          <td className="py-4 px-4 font-semibold text-gray-900">{spike.transactions.toLocaleString()}</td>
                          <td className="py-4 px-4 font-semibold text-purple-600">{spike.riskScore.toFixed(2)}</td>
                          <td className="py-4 px-4 text-gray-600">{spike.timeframe}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>

            {/* Analysis Results */}
            {analyzePatternsMutation.data && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/70 backdrop-blur-sm border-0 shadow-lg rounded-xl p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Latest Analysis Results</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {analyzePatternsMutation.data.spikes?.map((spike: FraudSpike, index: number) => (
                    <div
                      key={index}
                      className="p-6 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-blue-100"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{spike.pattern}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {spike.transactions.toLocaleString()} transactions • {spike.confidence.toFixed(1)}% confidence
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`text-3xl font-bold ${
                            spike.riskScore >= 0.8 ? 'text-red-500' :
                            spike.riskScore >= 0.6 ? 'text-amber-500' : 'text-emerald-500'
                          }`}>
                            {(spike.riskScore * 100).toFixed(0)}
                          </div>
                          <p className="text-sm text-gray-600">Risk Score</p>
                        </div>
                      </div>
                      <div className="bg-white/70 p-3 rounded-lg">
                        <p className="text-sm text-gray-700">Timeframe: {spike.timeframe}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}