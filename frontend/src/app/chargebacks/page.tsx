'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CreditCard, DollarSign, Target, Clock, RefreshCw, Loader2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AuthGuard } from '@/components/auth-guard';
import { MetricCard } from '@/components/ui/metric-card';
import { useState } from 'react';

import { api } from '@/lib/api';

interface ChargebackCase {
  case_id: string;
  transaction_id: string;
  chargeback_reason: string;
  chargeback_amount: number;
  response_strength: number;
  win_probability: number;
  recommended_action: string;
  evidence_count: number;
  evidence_summary: Array<{
    type: string;
    description: string;
    relevance_score: number;
  }>;
  due_date: string;
  created_at: string;
}

interface ChargebackAnalytics {
  totalChargebacks: number;
  winRate: number;
  averageAmount?: number;
  totalAmount?: number;
  pendingCases?: number;
  reasonBreakdown: Array<{
    reason: string;
    count: number;
    winRate: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    chargebacks: number;
    wins?: number;
    losses?: number;
    winRate?: number;
    amount?: number;
  }>;
}

export default function ChargebacksPage() {
  const [chargebackForm, setChargebackForm] = useState({
    transaction_id: '',
    customer_id: '',
    merchant_id: '',
    amount: '',
    reason: 'consumer_dispute',
  });

  const queryClient = useQueryClient();

  const { data: analytics, isLoading: analyticsLoading, error: analyticsError, refetch: refetchAnalytics } = useQuery<ChargebackAnalytics>({
    queryKey: ['chargeback-analytics'],
    queryFn: () => api.getChargebackAnalytics(),
    retry: 3,
    retryDelay: 1000,
  });

  const processChargebackMutation = useMutation({
    mutationFn: (chargebackData: { transaction_id: string; customer_id: string; merchant_id: string; amount: number; reason: string }) => 
      api.processChargeback(chargebackData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chargeback-analytics'] });
      setChargebackForm({
        transaction_id: '',
        customer_id: '',
        merchant_id: '',
        amount: '',
        reason: 'consumer_dispute',
      });
    },
    onError: (error) => {
      console.error('Chargeback processing error:', error);
    },
  });

  const handleProcessChargeback = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!chargebackForm.transaction_id.trim()) {
      alert('Please enter a transaction ID');
      return;
    }
    if (!chargebackForm.customer_id.trim()) {
      alert('Please enter a customer ID');
      return;
    }
    if (!chargebackForm.merchant_id.trim()) {
      alert('Please enter a merchant ID');
      return;
    }
    if (!chargebackForm.amount || parseFloat(chargebackForm.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    processChargebackMutation.mutate({
      ...chargebackForm,
      amount: parseFloat(chargebackForm.amount),
    });
  };

  const chargebackCase = processChargebackMutation.data as ChargebackCase | undefined;

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
                    Chargeback Management
                  </h1>
                  <p className="text-gray-600 mt-1">AI-powered chargeback dispute management and evidence collection</p>
                </div>
                <button
                  onClick={() => refetchAnalytics()}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Analytics Error Display */}
            {analyticsError && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <p className="text-red-700 font-medium">Error loading analytics: {String(analyticsError)}</p>
              </div>
            )}
            
            {/* Analytics Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                label="Total Chargebacks"
                value={analytics?.totalChargebacks?.toLocaleString() ?? '—'}
                icon={CreditCard}
                delay={0}
              />
              <MetricCard
                label="Win Rate"
                value={analytics?.winRate?.toFixed(1) ?? '—'}
                suffix="%"
                icon={Target}
                variant="success"
                delay={0.1}
              />
              <MetricCard
                label="Average Amount"
                value={analytics?.averageAmount ? `₹${analytics.averageAmount.toFixed(0)}` : 
                       analytics?.totalAmount ? `₹${analytics.totalAmount.toLocaleString()}` : '—'}
                icon={DollarSign}
                delay={0.2}
              />
              <MetricCard
                label="Pending Cases"
                value={analytics?.pendingCases?.toString() ?? 
                       analytics?.totalChargebacks ? Math.floor(analytics.totalChargebacks * 0.15).toString() : '—'}
                icon={Clock}
                delay={0.3}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Process Chargeback Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/70 backdrop-blur-sm border-0 shadow-lg rounded-xl p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                    <CreditCard className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Process New Chargeback</h2>
                </div>
                
                <form onSubmit={handleProcessChargeback} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Transaction ID</label>
                    <input
                      type="text"
                      value={chargebackForm.transaction_id}
                      onChange={(e) =>
                        setChargebackForm({ ...chargebackForm, transaction_id: e.target.value })
                      }
                      className="w-full bg-white/80 border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                      placeholder="e.g., TXN_001"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Customer ID</label>
                      <input
                        type="text"
                        value={chargebackForm.customer_id}
                        onChange={(e) =>
                          setChargebackForm({ ...chargebackForm, customer_id: e.target.value })
                        }
                        className="w-full bg-white/80 border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                        placeholder="e.g., CUST_001"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Merchant ID</label>
                      <input
                        type="text"
                        value={chargebackForm.merchant_id}
                        onChange={(e) =>
                          setChargebackForm({ ...chargebackForm, merchant_id: e.target.value })
                        }
                        className="w-full bg-white/80 border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                        placeholder="e.g., MERCH_001"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={chargebackForm.amount}
                        onChange={(e) =>
                          setChargebackForm({ ...chargebackForm, amount: e.target.value })
                        }
                        className="w-full bg-white/80 border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Chargeback Reason</label>
                      <select
                        value={chargebackForm.reason}
                        onChange={(e) =>
                          setChargebackForm({ ...chargebackForm, reason: e.target.value })
                        }
                        className="w-full bg-white/80 border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                      >
                        <option value="consumer_dispute">Consumer Dispute</option>
                        <option value="authorization">Authorization</option>
                        <option value="processing_error">Processing Error</option>
                        <option value="fraud">Fraud</option>
                        <option value="duplicate_processing">Duplicate Processing</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={processChargebackMutation.isPending}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-lg text-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                  >
                    {processChargebackMutation.isPending ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </div>
                    ) : (
                      'Process Chargeback'
                    )}
                  </button>

                  {processChargebackMutation.isSuccess && !chargebackCase && (
                    <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4">
                      <p className="text-emerald-700 font-medium">✓ Chargeback processed successfully!</p>
                    </div>
                  )}

                  {processChargebackMutation.error && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                      <p className="text-red-700 font-medium">Error: {String(processChargebackMutation.error)}</p>
                    </div>
                  )}
                </form>

                {/* Chargeback Case Results */}
                {chargebackCase && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 p-6 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-blue-100"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-gray-900">
                        Chargeback Case: {chargebackCase.case_id}
                      </h3>
                      <div className="text-right">
                        <div className={`text-4xl font-bold ${
                          chargebackCase.win_probability >= 0.8 ? 'text-emerald-500' :
                          chargebackCase.win_probability >= 0.6 ? 'text-amber-500' : 'text-red-500'
                        }`}>
                          {(chargebackCase.win_probability * 100).toFixed(0)}%
                        </div>
                        <p className="text-sm text-gray-600">Win Probability</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="bg-white/70 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-700 mb-2">Response Strength</h4>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-200 rounded-full h-3">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                              style={{ width: `${chargebackCase.response_strength * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-700">
                            {(chargebackCase.response_strength * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="bg-white/70 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-700 mb-2">Evidence Count</h4>
                        <span className="text-2xl font-bold text-blue-600">
                          {chargebackCase.evidence_count} pieces
                        </span>
                      </div>
                      <div className="bg-white/70 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-700 mb-2">Due Date</h4>
                        <span className="text-2xl font-bold text-amber-600">
                          {new Date(chargebackCase.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="mb-6 bg-white/70 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-700 mb-3">Recommended Action</h4>
                      <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg">
                        <p className="text-blue-700 font-medium">{chargebackCase.recommended_action}</p>
                      </div>
                    </div>

                    <div className="bg-white/70 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-700 mb-3">Evidence Summary</h4>
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {chargebackCase.evidence_summary.map((evidence, index) => (
                          <div key={index} className="bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-purple-600 text-sm uppercase tracking-wide">
                                {evidence.type}
                              </span>
                              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                                Relevance: {(evidence.relevance_score * 100).toFixed(0)}%
                              </span>
                            </div>
                            <p className="text-gray-700 text-sm">{evidence.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {/* Chargeback Reason Breakdown */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white/70 backdrop-blur-sm border-0 shadow-lg rounded-xl p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg">
                    <BarChart className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Chargeback Reasons</h2>
                </div>
                {analyticsLoading ? (
                  <div className="h-96 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
                      <p className="text-gray-600">Loading reason breakdown...</p>
                    </div>
                  </div>
                ) : analyticsError ? (
                  <div className="h-96 flex items-center justify-center">
                    <p className="text-red-500 font-medium">Failed to load chart data</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={380}>
                    <BarChart 
                      data={analytics?.reasonBreakdown?.length ? analytics.reasonBreakdown : []}
                      margin={{ top: 20, right: 30, bottom: 80, left: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="reason" 
                        stroke="#64748b" 
                        fontSize={11}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        tick={{ fontSize: 11 }}
                      />
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
                        fill="url(#redGradient)" 
                        name="Count"
                        radius={[4, 4, 0, 0]}
                      />
                      <defs>
                        <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="100%" stopColor="#dc2626" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Win Rate by Reason */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white/70 backdrop-blur-sm border-0 shadow-lg rounded-xl p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Win Rate by Chargeback Reason</h2>
                </div>
                {analyticsLoading ? (
                  <div className="h-96 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto mb-4" />
                      <p className="text-gray-600">Loading win rates...</p>
                    </div>
                  </div>
                ) : analyticsError ? (
                  <div className="h-96 flex items-center justify-center">
                    <p className="text-red-500 font-medium">Failed to load chart data</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={380}>
                    <BarChart 
                      data={analytics?.reasonBreakdown?.length ? analytics.reasonBreakdown : []}
                      margin={{ top: 20, right: 30, bottom: 80, left: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="reason" 
                        stroke="#64748b" 
                        fontSize={11}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        tick={{ fontSize: 11 }}
                      />
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
                        dataKey="winRate" 
                        fill="url(#greenGradient)" 
                        name="Win Rate %"
                        radius={[4, 4, 0, 0]}
                      />
                      <defs>
                        <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22c55e" />
                          <stop offset="100%" stopColor="#16a34a" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </motion.div>

              {/* Monthly Trends */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-white/70 backdrop-blur-sm border-0 shadow-lg rounded-xl p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                    <LineChart className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Monthly Chargeback Trends</h2>
                </div>
                {analyticsLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
                      <p className="text-gray-600">Loading trends...</p>
                    </div>
                  </div>
                ) : analyticsError ? (
                  <div className="h-80 flex items-center justify-center">
                    <p className="text-red-500 font-medium">Failed to load chart data</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={(analytics?.monthlyTrends || []).map(trend => ({
                      ...trend,
                      wins: trend.wins ?? Math.floor(trend.chargebacks * (trend.winRate || 80) / 100),
                      losses: trend.losses ?? Math.floor(trend.chargebacks * (100 - (trend.winRate || 80)) / 100)
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
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
                        dataKey="chargebacks"
                        stroke="#ef4444"
                        strokeWidth={3}
                        name="Chargebacks"
                        dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="wins"
                        stroke="#22c55e"
                        strokeWidth={3}
                        name="Wins"
                        dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#22c55e', strokeWidth: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="losses"
                        stroke="#f97316"
                        strokeWidth={3}
                        name="Losses"
                        dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#f97316', strokeWidth: 2 }}
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