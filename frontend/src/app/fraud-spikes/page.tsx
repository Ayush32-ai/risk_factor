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
  LineChart,
  PieChart,
} from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
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
        <div className="min-h-screen">
          {/* Responsive Header */}
          <div className="sticky-header mobile-safe-area">
            <div className="razorpay-page-header">
              <div>
                <h1 className="text-responsive-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Fraud Spike Detection
                </h1>
                <p className="text-responsive-sm text-gray-600 mt-1">
                  Real-time detection and analysis of fraud pattern spikes
                </p>
                {/* Attack Status Indicators - Enhanced Mobile Layout */}
                <div className="flex flex-wrap items-start gap-2 mt-2 sm:mt-3">
                  {dashboard?.attackContext?.activeAttack && (
                    <span className="px-2 py-1 sm:px-3 sm:py-1 bg-red-100 text-red-700 rounded-full text-xs sm:text-sm font-medium border border-red-200">
                      🚨 Active Attack: {dashboard.attackContext.attackScenario} (Gen {dashboard.attackContext.attackGeneration})
                    </span>
                  )}
                  {dashboard?.attackContext && dashboard.attackContext.defenseEffectiveness > 0 && (
                    <span className="px-2 py-1 sm:px-3 sm:py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs sm:text-sm font-medium border border-emerald-200">
                      🛡️ Defense Active ({dashboard.attackContext.defenseEffectiveness.toFixed(0)}% effective)
                    </span>
                  )}
                </div>
              </div>
              {/* Enhanced Responsive Controls */}
              <div className="razorpay-action-group w-full sm:w-auto">
                <select
                  value={selectedTimeframe}
                  onChange={(e) => setSelectedTimeframe(Number(e.target.value))}
                  className="razorpay-select touch-target"
                >
                  <option value={30}>Last 30 minutes</option>
                  <option value={60}>Last 1 hour</option>
                  <option value={180}>Last 3 hours</option>
                  <option value={360}>Last 6 hours</option>
                </select>
                <button
                  onClick={handleAnalyzePatterns}
                  disabled={analyzePatternsMutation.isPending}
                  className="razorpay-button-secondary touch-target"
                >
                  {analyzePatternsMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Target className="w-4 h-4" />
                      <span>Analyze Patterns</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleRefresh}
                  className="razorpay-button-primary touch-target"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mobile-safe-area razorpay-section">
            {/* Real-time Attack Status Panel - Enhanced Responsive */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`razorpay-alert ${
                dashboard?.attackContext?.activeAttack 
                  ? 'razorpay-alert-danger' 
                  : 'razorpay-alert-info'
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <h3 className="razorpay-subheading mb-2">
                    {dashboard?.attackContext?.activeAttack ? '🔥 Live Attack Simulation' : '💤 Monitoring Mode'}
                  </h3>
                  <p className="text-responsive-sm text-gray-600">
                    {dashboard?.attackContext?.activeAttack 
                      ? `${dashboard.attackContext.attackScenario} - Generation ${dashboard.attackContext.attackGeneration}`
                      : 'No active attack simulation running'
                    }
                  </p>
                  {!dashboard?.attackContext?.activeAttack && (
                    <p className="text-blue-600 text-responsive-xs mt-2">
                      💡 Start a demo attack simulation in the <strong>Attack Simulator</strong> page to see real-time data updates
                    </p>
                  )}
                </div>
                <div className="flex flex-row gap-2 sm:gap-4 lg:flex-col lg:gap-2">
                  {dashboard?.attackContext?.activeAttack && (
                    <div className="bg-red-100 border-2 border-red-200 rounded-lg p-3 sm:p-4 text-center flex-1 lg:flex-initial">
                      <div className="text-responsive-lg font-bold text-red-600">ACTIVE</div>
                      <div className="text-xs sm:text-sm text-red-600">Risk: {(dashboard.attackContext.networkRiskScore * 100).toFixed(0)}%</div>
                    </div>
                  )}
                  {dashboard?.attackContext && dashboard.attackContext.defenseEffectiveness > 0 && (
                    <div className="bg-emerald-100 border-2 border-emerald-200 rounded-lg p-3 sm:p-4 text-center flex-1 lg:flex-initial">
                      <div className="text-responsive-lg font-bold text-emerald-600">{dashboard.attackContext.defenseEffectiveness.toFixed(0)}%</div>
                      <div className="text-xs sm:text-sm text-emerald-600">Defense</div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Dashboard Metrics - Responsive Grid */}
            <div className="razorpay-grid">
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

            {/* Charts Section - Responsive Grid */}
            <div className="razorpay-grid-2">
              {/* Fraud Trends Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="razorpay-card"
              >
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="razorpay-icon-danger">
                    <LineChart className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <h2 className="razorpay-heading">Fraud Activity Trends</h2>
                </div>
                {trendsLoading ? (
                  <div className="razorpay-loading">
                    <div className="text-center">
                      <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-blue-400 mx-auto mb-4" />
                      <p className="razorpay-loading-text">Loading trends...</p>
                    </div>
                  </div>
                ) : (
                  <div className="razorpay-chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={trends?.hourlyTrends || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="hour" 
                          stroke="#64748b" 
                          fontSize={12} 
                          tickFormatter={(value) => value.length > 5 ? value.substring(0, 5) + '...' : value}
                        />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            background: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                            fontSize: '12px',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="fraudEvents"
                          stroke="#ef4444"
                          strokeWidth={2}
                          name="Fraud Events"
                          dot={{ fill: '#ef4444', strokeWidth: 2, r: 3 }}
                          activeDot={{ r: 5, stroke: '#ef4444', strokeWidth: 2 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="riskScore"
                          stroke="#f97316"
                          strokeWidth={2}
                          name="Risk Score"
                          dot={{ fill: '#f97316', strokeWidth: 2, r: 3 }}
                          activeDot={{ r: 5, stroke: '#f97316', strokeWidth: 2 }}
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </motion.div>

              {/* Pattern Breakdown Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="razorpay-card"
              >
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="razorpay-icon-primary">
                    <PieChart className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <h2 className="razorpay-heading">Pattern Breakdown</h2>
                </div>
                {dashboardLoading ? (
                  <div className="razorpay-loading">
                    <div className="text-center">
                      <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-blue-400 mx-auto mb-4" />
                      <p className="razorpay-loading-text">Loading patterns...</p>
                    </div>
                  </div>
                ) : (
                  <div className="razorpay-chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={dashboard?.patternBreakdown?.map((item, index) => ({ ...item, index })) || []}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={CustomLabel}
                          outerRadius="80%"
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
                            fontSize: '12px',
                          }}
                          formatter={(value, name) => {
                            const displayName = name === 'Payment Velocity' 
                              ? 'Payment Velocity' 
                              : name;
                            return [value, displayName];
                          }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Recent Spikes - Responsive Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="razorpay-card"
            >
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="razorpay-icon-warning">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <h2 className="razorpay-heading">Recent Fraud Spikes</h2>
              </div>
              {dashboardLoading ? (
                <div className="razorpay-loading">
                  <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-blue-400 mx-auto mb-4" />
                  <p className="razorpay-loading-text">Loading recent spikes...</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block razorpay-table-container">
                    <table className="razorpay-table">
                      <thead>
                        <tr>
                          <th>Pattern</th>
                          <th>Severity</th>
                          <th>Confidence</th>
                          <th>Transactions</th>
                          <th>Risk Score</th>
                          <th>Timeframe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard?.recentSpikes?.map((spike, index) => (
                          <tr key={index} className="hover:bg-blue-50/30 transition-colors duration-200">
                            <td className="font-medium text-gray-900">{spike.pattern}</td>
                            <td>
                              <span className={`razorpay-badge-${
                                spike.severity === 'high' ? 'danger' :
                                spike.severity === 'medium' ? 'warning' : 'success'
                              }`}>
                                {spike.severity.toUpperCase()}
                              </span>
                            </td>
                            <td className="font-semibold text-blue-600">{spike.confidence.toFixed(1)}%</td>
                            <td className="font-semibold text-gray-900">{spike.transactions.toLocaleString()}</td>
                            <td className="font-semibold text-purple-600">{spike.riskScore.toFixed(2)}</td>
                            <td className="text-gray-600">{spike.timeframe}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden razorpay-table-mobile">
                    {dashboard?.recentSpikes?.map((spike, index) => (
                      <div key={index} className="razorpay-table-mobile-card">
                        <div className="razorpay-table-mobile-row">
                          <span className="razorpay-table-mobile-label">Pattern</span>
                          <span className="razorpay-table-mobile-value">{spike.pattern}</span>
                        </div>
                        <div className="razorpay-table-mobile-row">
                          <span className="razorpay-table-mobile-label">Severity</span>
                          <span className={`razorpay-badge-${
                            spike.severity === 'high' ? 'danger' :
                            spike.severity === 'medium' ? 'warning' : 'success'
                          }`}>
                            {spike.severity.toUpperCase()}
                          </span>
                        </div>
                        <div className="razorpay-table-mobile-row">
                          <span className="razorpay-table-mobile-label">Confidence</span>
                          <span className="razorpay-table-mobile-value text-blue-600">{spike.confidence.toFixed(1)}%</span>
                        </div>
                        <div className="razorpay-table-mobile-row">
                          <span className="razorpay-table-mobile-label">Transactions</span>
                          <span className="razorpay-table-mobile-value">{spike.transactions.toLocaleString()}</span>
                        </div>
                        <div className="razorpay-table-mobile-row">
                          <span className="razorpay-table-mobile-label">Risk Score</span>
                          <span className="razorpay-table-mobile-value text-purple-600">{spike.riskScore.toFixed(2)}</span>
                        </div>
                        <div className="razorpay-table-mobile-row">
                          <span className="razorpay-table-mobile-label">Timeframe</span>
                          <span className="razorpay-table-mobile-value">{spike.timeframe}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
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