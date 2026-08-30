'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  RotateCcw,
  AlertTriangle,
  DollarSign,
  Target,
  RefreshCw,
  Loader2,
  AlertCircle,
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

  const { data: analytics, isLoading: analyticsLoading, error: analyticsError, refetch: refetchAnalytics } = useQuery<ReturnAnalytics>({
    queryKey: ['return-analytics'],
    queryFn: () => api.getReturnAnalytics(),
    refetchInterval: 60000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
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
        <div className="razorpay-page">
          {/* Header */}
          <div className="razorpay-header">
            <div className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold razorpay-gradient-text">
                    Return Risk Assessment
                  </h1>
                  <p className="text-gray-600 mt-1">AI-powered risk analysis for return requests and fraud prevention</p>
                </div>
                <button
                  onClick={() => refetchAnalytics()}
                  className="razorpay-button-primary"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Analytics Metrics */}
            {analyticsError && !analytics ? (
              <div className="razorpay-card text-center py-12">
                <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
                <p className="text-gray-600 mb-6 text-lg">Failed to load return analytics data.</p>
                <button
                  onClick={() => refetchAnalytics()}
                  className="razorpay-button-primary mx-auto"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
              </div>
            ) : analyticsLoading && !analytics ? (
              <div className="razorpay-card text-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-blue-400 mx-auto mb-6" />
                <p className="text-gray-600 text-lg">Loading return analytics...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  value={analytics?.totalAmount ? `₹${(analytics.totalAmount / 1000).toFixed(0)}K` : '—'}
                  icon={DollarSign}
                  delay={0.3}
                />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Return Risk Assessment Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="razorpay-card p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="razorpay-icon-primary">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Assess Return Risk</h2>
                </div>
                
                <form onSubmit={handleAssessReturn} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="razorpay-form-group">
                      <label className="razorpay-label">Customer ID</label>
                      <input
                        type="text"
                        value={assessmentForm.customer_id}
                        onChange={(e) =>
                          setAssessmentForm({ ...assessmentForm, customer_id: e.target.value })
                        }
                        className="razorpay-input"
                        placeholder="e.g., CUST_001"
                        required
                      />
                    </div>

                    <div className="razorpay-form-group">
                      <label className="razorpay-label">Merchant ID</label>
                      <input
                        type="text"
                        value={assessmentForm.merchant_id}
                        onChange={(e) =>
                          setAssessmentForm({ ...assessmentForm, merchant_id: e.target.value })
                        }
                        className="razorpay-input"
                        placeholder="e.g., MERCH_001"
                        required
                      />
                    </div>
                  </div>

                  <div className="razorpay-form-group">
                    <label className="razorpay-label">Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={assessmentForm.amount}
                      onChange={(e) =>
                        setAssessmentForm({ ...assessmentForm, amount: e.target.value })
                      }
                      className="razorpay-input"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="razorpay-form-group">
                      <label className="razorpay-label">Item Category</label>
                      <select
                        value={assessmentForm.item_category}
                        onChange={(e) =>
                          setAssessmentForm({ ...assessmentForm, item_category: e.target.value })
                        }
                        className="razorpay-select"
                      >
                        <option value="electronics">Electronics</option>
                        <option value="clothing">Clothing</option>
                        <option value="books">Books</option>
                        <option value="home">Home & Garden</option>
                        <option value="sports">Sports</option>
                      </select>
                    </div>

                    <div className="razorpay-form-group">
                      <label className="razorpay-label">Return Reason</label>
                      <select
                        value={assessmentForm.reason}
                        onChange={(e) =>
                          setAssessmentForm({ ...assessmentForm, reason: e.target.value })
                        }
                        className="razorpay-select"
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
                    className="w-full razorpay-button-secondary py-4 text-lg justify-center disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
                  >
                    {assessReturnMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Assessing...
                      </>
                    ) : (
                      'Assess Risk'
                    )}
                  </button>
                </form>

                {/* Assessment Results */}
                {assessment && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Risk Assessment Results
                      </h3>
                      <div className="text-right">
                        <div className={`text-4xl font-bold ${
                          assessment.risk_score >= 8 ? 'text-red-500' :
                          assessment.risk_score >= 6 ? 'text-amber-500' : 'text-emerald-500'
                        }`}>
                          {assessment.risk_score.toFixed(1)}
                        </div>
                        <p className="text-sm text-gray-600">Risk Score</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="razorpay-card bg-white/90 p-4">
                        <h4 className="font-semibold text-gray-700 mb-2">Risk Level</h4>
                        <span className={`${
                          assessment.risk_level === 'HIGH' ? 'razorpay-badge-danger' :
                          assessment.risk_level === 'MEDIUM' ? 'razorpay-badge-warning' :
                          'razorpay-badge-success'
                        } px-4 py-2 text-sm`}>
                          {assessment.risk_level}
                        </span>
                      </div>
                      <div className="razorpay-card bg-white/90 p-4">
                        <h4 className="font-semibold text-gray-700 mb-2">Confidence</h4>
                        <span className="text-2xl font-bold text-blue-600">
                          {assessment.confidence.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="razorpay-card bg-white/90 p-4">
                        <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          Risk Factors
                        </h4>
                        <ul className="space-y-2">
                          {assessment.risk_factors.map((factor, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                              <span className="text-sm text-gray-700">{safeRender(factor)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="razorpay-card bg-white/90 p-4">
                        <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <Target className="h-4 w-4 text-blue-500" />
                          Recommendations
                        </h4>
                        <ul className="space-y-2">
                          {assessment.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                              <span className="text-sm text-gray-700">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {assessment.fraud_indicators.length > 0 && (
                        <div className="bg-red-50 border-2 border-red-200 p-4 rounded-lg">
                          <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Fraud Indicators
                          </h4>
                          <ul className="space-y-2">
                            {assessment.fraud_indicators.map((indicator, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <div className="text-red-500 mt-1">⚠️</div>
                                <span className="text-sm text-red-700 font-medium">{indicator}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {/* Category Analysis */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="razorpay-card p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="razorpay-icon-success">
                    <BarChart className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Returns by Category</h2>
                </div>
                {analyticsLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
                      <p className="text-gray-600">Loading category data...</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={analytics?.categoryBreakdown || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="category" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                        }}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="url(#colorGradient)" 
                        name="Returns"
                        radius={[4, 4, 0, 0]}
                      />
                      <defs>
                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#1d4ed8" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Risk Distribution */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="razorpay-card p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="razorpay-icon-danger">
                    <PieChart className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Risk Level Distribution</h2>
                </div>
                {analyticsLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
                      <p className="text-gray-600">Loading distribution...</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={analytics?.riskDistribution || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ level, percent }) =>
                          `${level} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {analytics?.riskDistribution?.map((_, index) => (
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
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </motion.div>

              {/* Return Trends */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="razorpay-card p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="razorpay-icon-warning">
                    <LineChart className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Return Risk Trends</h2>
                </div>
                {analyticsLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
                      <p className="text-gray-600">Loading trends...</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={analytics?.trends || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
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
                        dataKey="returns"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        name="Returns"
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="riskScore"
                        stroke="#ef4444"
                        strokeWidth={3}
                        name="Avg Risk Score"
                        dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}