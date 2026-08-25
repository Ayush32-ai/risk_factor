'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  AlertTriangle,
  Activity,
  Target,
  Zap,
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
import { Icon } from '@/components/client-only';
import { useState } from 'react';

import { api } from '@/lib/api';

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

  const { data: dashboard, isLoading: dashboardLoading } = useQuery<DashboardSummary>({
    queryKey: ['fraud-spikes-dashboard'],
    queryFn: () => api.get('/api/fraud-spikes/dashboard'),
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['fraud-trends'],
    queryFn: () => api.get('/api/fraud-spikes/trends'),
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

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Fraud Spike Detection</h1>
              <p className="text-sentinel-muted mt-1">
                Real-time detection and analysis of fraud pattern spikes
                {dashboard?.attackContext?.activeAttack && (
                  <span className="ml-2 px-2 py-1 bg-red-500/20 text-red-400 rounded text-sm">
                    🚨 Active Attack: {dashboard.attackContext.attackScenario} (Gen {dashboard.attackContext.attackGeneration})
                  </span>
                )}
                {dashboard?.attackContext && dashboard.attackContext.defenseEffectiveness > 0 && (
                  <span className="ml-2 px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm">
                    🛡️ Defense Active ({dashboard.attackContext.defenseEffectiveness.toFixed(0)}% effective)
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(Number(e.target.value))}
                className="bg-sentinel-surface border border-sentinel-border rounded px-3 py-2 text-sm"
              >
                <option value={30}>Last 30 minutes</option>
                <option value={60}>Last 1 hour</option>
                <option value={180}>Last 3 hours</option>
                <option value={360}>Last 6 hours</option>
              </select>
              <button
                onClick={handleAnalyzePatterns}
                disabled={analyzePatternsMutation.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-sm font-medium transition-colors"
              >
                {analyzePatternsMutation.isPending ? 'Analyzing...' : 'Analyze Patterns'}
              </button>
            </div>
          </div>

          {/* Real-Time Attack Status Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`p-4 rounded-lg border ${
              dashboard?.attackContext?.activeAttack 
                ? 'bg-red-500/10 border-red-500/30' 
                : 'bg-sentinel-surface border-sentinel-border'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">
                  {dashboard?.attackContext?.activeAttack ? '🔥 Live Attack Simulation' : '💤 Monitoring Mode'}
                </h3>
                <p className="text-sm text-sentinel-muted mt-1">
                  {dashboard?.attackContext?.activeAttack 
                    ? `${dashboard.attackContext.attackScenario} - Generation ${dashboard.attackContext.attackGeneration}`
                    : 'No active attack simulation running'
                  }
                </p>
              </div>
              <div className="text-right">
                {dashboard?.attackContext?.activeAttack && (
                  <>
                    <div className="text-lg font-bold text-red-400">ACTIVE</div>
                    <div className="text-xs text-sentinel-muted">Network Risk: {(dashboard.attackContext.networkRiskScore * 100).toFixed(0)}%</div>
                  </>
                )}
                {dashboard?.attackContext && dashboard.attackContext.defenseEffectiveness > 0 && (
                  <>
                    <div className="text-lg font-bold text-green-400">{dashboard.attackContext.defenseEffectiveness.toFixed(0)}%</div>
                    <div className="text-xs text-sentinel-muted">Defense Effective</div>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* Dashboard Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fraud Trends Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="sentinel-card"
            >
              <h2 className="text-lg font-semibold mb-4">Fraud Activity Trends</h2>
              {trendsLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-sentinel-muted">Loading trends...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={trends?.hourlyTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="hour" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: '#111827',
                        border: '1px solid #1e293b',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="fraudEvents"
                      stroke="#ef4444"
                      strokeWidth={2}
                      name="Fraud Events"
                    />
                    <Line
                      type="monotone"
                      dataKey="riskScore"
                      stroke="#f97316"
                      strokeWidth={2}
                      name="Risk Score"
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
              className="sentinel-card"
            >
              <h2 className="text-lg font-semibold mb-4">Pattern Breakdown</h2>
              {dashboardLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-sentinel-muted">Loading patterns...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={dashboard?.patternBreakdown?.map((item, index) => ({ ...item, index })) || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={CustomLabel}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {dashboard?.patternBreakdown?.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
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
            className="sentinel-card"
          >
            <h2 className="text-lg font-semibold mb-4">Recent Fraud Spikes</h2>
            {dashboardLoading ? (
              <p className="text-sentinel-muted">Loading recent spikes...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-sentinel-border">
                      <th className="text-left py-3 px-4">Pattern</th>
                      <th className="text-left py-3 px-4">Severity</th>
                      <th className="text-left py-3 px-4">Confidence</th>
                      <th className="text-left py-3 px-4">Transactions</th>
                      <th className="text-left py-3 px-4">Risk Score</th>
                      <th className="text-left py-3 px-4">Timeframe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard?.recentSpikes?.map((spike, index) => (
                      <tr key={index} className="border-b border-sentinel-border/30">
                        <td className="py-3 px-4 font-medium">{spike.pattern}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              spike.severity === 'high'
                                ? 'bg-red-500/20 text-red-400'
                                : spike.severity === 'medium'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-green-500/20 text-green-400'
                            }`}
                          >
                            {spike.severity.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4">{spike.confidence.toFixed(1)}%</td>
                        <td className="py-3 px-4">{spike.transactions.toLocaleString()}</td>
                        <td className="py-3 px-4">{spike.riskScore.toFixed(2)}</td>
                        <td className="py-3 px-4 text-sentinel-muted">{spike.timeframe}</td>
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
              className="sentinel-card"
            >
              <h2 className="text-lg font-semibold mb-4">
                <Icon icon={Zap} className="w-5 h-5 inline mr-2" />
                Latest Analysis Results
              </h2>
              <div className="space-y-4">
                {analyzePatternsMutation.data.spikes?.map((spike: FraudSpike, index: number) => (
                  <div
                    key={index}
                    className="p-4 border border-sentinel-border rounded-lg bg-sentinel-surface/50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{spike.pattern}</h3>
                        <p className="text-sm text-sentinel-muted mt-1">
                          {spike.transactions} transactions • {spike.confidence.toFixed(1)}% confidence
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          spike.riskScore >= 0.8 ? 'text-red-400' :
                          spike.riskScore >= 0.6 ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          {(spike.riskScore * 100).toFixed(0)}
                        </div>
                        <p className="text-xs text-sentinel-muted">Risk Score</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}