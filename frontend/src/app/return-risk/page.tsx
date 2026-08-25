'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  RotateCcw,
  AlertTriangle,
  DollarSign,
  Target,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AuthGuard } from '@/components/auth-guard';
import { MetricCard } from '@/components/ui/metric-card';
import { useState } from 'react';

import { api } from '@/lib/api';

// Utility function to safely render any value as string
const safeRender = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    if (value.factor && value.score !== undefined) {
      return `${value.factor} (Score: ${value.score})`;
    }
    return JSON.stringify(value);
  }
  return String(value);
};

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e'];

interface ReturnAssessment {
  return_id: string;
  risk_score: number;
  risk_level: string;
  confidence: number;
  risk_factors: Array<{
    factor: string;
    score: number;
    impact: string;
  }> | string[];
  recommendations: string[];
  fraud_indicators: string[];
  assessment_timestamp: string;
}

interface ReturnAnalytics {
  totalReturns: number;
  highRiskReturns: number;
  averageRiskScore: number;
  totalAmount: number;
  categoryBreakdown: Array<{
    category: string;
    count: number;
    avgRisk: number;
  }>;
  riskDistribution: Array<{
    level: string;
    count: number;
  }>;
  trends: Array<{
    date: string;
    returns: number;
    riskScore: number;
  }>;
}

export default function ReturnRiskPage() {
  const [assessmentForm, setAssessmentForm] = useState({
    customer_id: '',
    merchant_id: '',
    amount: '',
    item_category: 'electronics',
    reason: 'not_satisfied',
  });

  const queryClient = useQueryClient();

  const { data: analytics, isLoading: analyticsLoading } = useQuery<ReturnAnalytics>({
    queryKey: ['return-analytics'],
    queryFn: () => api.getReturnAnalytics(),
  });

  const assessReturnMutation = useMutation({
    mutationFn: (returnData: typeof assessmentForm) => 
      api.assessReturnRisk({
        ...returnData,
        amount: parseFloat(returnData.amount),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['return-analytics'] });
      setAssessmentForm({
        customer_id: '',
        merchant_id: '',
        amount: '',
        item_category: 'electronics',
        reason: 'not_satisfied',
      });
    },
  });

  const handleAssessReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (assessmentForm.customer_id && assessmentForm.merchant_id && assessmentForm.amount) {
      assessReturnMutation.mutate(assessmentForm);
    }
  };

  const assessment = assessReturnMutation.data as ReturnAssessment | undefined;

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Return Risk Assessment</h1>
              <p className="text-sentinel-muted mt-1">
                AI-powered risk analysis for return requests and fraud prevention
              </p>
            </div>
          </div>

          {/* Analytics Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total Returns"
              value={analytics?.totalReturns?.toLocaleString() ?? '—'}
              icon={RotateCcw}
              delay={0}
            />
            <MetricCard
              label="High-Risk Returns"
              value={analytics?.highRiskReturns?.toString() ?? '—'}
              icon={AlertTriangle}
              variant="danger"
              delay={0.1}
            />
            <MetricCard
              label="Average Risk Score"
              value={analytics?.averageRiskScore?.toFixed(1) ?? '—'}
              suffix="/10"
              icon={Target}
              delay={0.2}
            />
            <MetricCard
              label="Total Amount"
              value={analytics?.totalAmount ? `$${(analytics.totalAmount / 1000).toFixed(0)}K` : '—'}
              icon={DollarSign}
              delay={0.3}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Return Risk Assessment Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="sentinel-card"
            >
              <h2 className="text-lg font-semibold mb-4">Assess Return Risk</h2>
              <form onSubmit={handleAssessReturn} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Customer ID</label>
                  <input
                    type="text"
                    value={assessmentForm.customer_id}
                    onChange={(e) =>
                      setAssessmentForm({ ...assessmentForm, customer_id: e.target.value })
                    }
                    className="w-full bg-sentinel-surface border border-sentinel-border rounded px-3 py-2"
                    placeholder="e.g., CUST_001"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Merchant ID</label>
                  <input
                    type="text"
                    value={assessmentForm.merchant_id}
                    onChange={(e) =>
                      setAssessmentForm({ ...assessmentForm, merchant_id: e.target.value })
                    }
                    className="w-full bg-sentinel-surface border border-sentinel-border rounded px-3 py-2"
                    placeholder="e.g., MERCH_001"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={assessmentForm.amount}
                    onChange={(e) =>
                      setAssessmentForm({ ...assessmentForm, amount: e.target.value })
                    }
                    className="w-full bg-sentinel-surface border border-sentinel-border rounded px-3 py-2"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Item Category</label>
                    <select
                      value={assessmentForm.item_category}
                      onChange={(e) =>
                        setAssessmentForm({ ...assessmentForm, item_category: e.target.value })
                      }
                      className="w-full bg-sentinel-surface border border-sentinel-border rounded px-3 py-2"
                    >
                      <option value="electronics">Electronics</option>
                      <option value="clothing">Clothing</option>
                      <option value="books">Books</option>
                      <option value="home">Home & Garden</option>
                      <option value="sports">Sports</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Return Reason</label>
                    <select
                      value={assessmentForm.reason}
                      onChange={(e) =>
                        setAssessmentForm({ ...assessmentForm, reason: e.target.value })
                      }
                      className="w-full bg-sentinel-surface border border-sentinel-border rounded px-3 py-2"
                    >
                      <option value="not_satisfied">Not Satisfied</option>
                      <option value="defective">Defective</option>
                      <option value="wrong_item">Wrong Item</option>
                      <option value="size_issue">Size Issue</option>
                      <option value="changed_mind">Changed Mind</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={assessReturnMutation.isPending}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-sm font-medium transition-colors"
                >
                  {assessReturnMutation.isPending ? 'Assessing...' : 'Assess Risk'}
                </button>
              </form>

              {/* Assessment Results */}
              {assessment && (
                <div className="mt-6 p-4 border border-sentinel-border rounded-lg bg-sentinel-surface/50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Risk Assessment Results</h3>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        assessment.risk_score >= 8 ? 'text-red-400' :
                        assessment.risk_score >= 6 ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {assessment.risk_score.toFixed(1)}
                      </div>
                      <p className="text-xs text-sentinel-muted">Risk Score</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Risk Level</h4>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        assessment.risk_level === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                        assessment.risk_level === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {assessment.risk_level}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Confidence</h4>
                      <span className="text-blue-400 font-semibold">
                        {assessment.confidence.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Risk Factors</h4>
                    <ul className="space-y-1">
                      {assessment.risk_factors.map((factor, index) => (
                        <li key={index} className="text-sm text-red-400">
                          • {safeRender(factor)}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Recommendations</h4>
                    <ul className="space-y-1">
                      {assessment.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-blue-400">
                          • {rec}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {assessment.fraud_indicators.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2 text-red-400">Fraud Indicators</h4>
                      <ul className="space-y-1">
                        {assessment.fraud_indicators.map((indicator, index) => (
                          <li key={index} className="text-sm text-red-400">
                            ⚠️ {indicator}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* Category Analysis */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="sentinel-card"
            >
              <h2 className="text-lg font-semibold mb-4">Returns by Category</h2>
              {analyticsLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-sentinel-muted">Loading category data...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={analytics?.categoryBreakdown || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="category" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: '#111827',
                        border: '1px solid #1e293b',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" name="Returns" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="sentinel-card"
            >
              <h2 className="text-lg font-semibold mb-4">Risk Level Distribution</h2>
              {analyticsLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-sentinel-muted">Loading distribution...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={analytics?.riskDistribution || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ level, percent }) =>
                        `${level} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analytics?.riskDistribution?.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            {/* Return Trends */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="sentinel-card"
            >
              <h2 className="text-lg font-semibold mb-4">Return Risk Trends</h2>
              {analyticsLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-sentinel-muted">Loading trends...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={analytics?.trends || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
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
                      dataKey="returns"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Returns"
                    />
                    <Line
                      type="monotone"
                      dataKey="riskScore"
                      stroke="#ef4444"
                      strokeWidth={2}
                      name="Avg Risk Score"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </motion.div>
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}