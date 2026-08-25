'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CreditCard, DollarSign, Target, Clock } from 'lucide-react';
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

  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useQuery<ChargebackAnalytics>({
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
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Chargeback Management</h1>
              <p className="text-sentinel-muted mt-1">
                AI-powered chargeback dispute management and evidence collection
              </p>
            </div>
          </div>

          {/* Analytics Metrics */}
          {analyticsError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
              Error loading analytics: {String(analyticsError)}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              value={analytics?.averageAmount ? `$${analytics.averageAmount.toFixed(0)}` : 
                     analytics?.totalAmount ? `$${analytics.totalAmount.toLocaleString()}` : '—'}
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Process Chargeback Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="sentinel-card"
            >
              <h2 className="text-lg font-semibold mb-4">Process New Chargeback</h2>
              <form onSubmit={handleProcessChargeback} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Transaction ID</label>
                  <input
                    type="text"
                    value={chargebackForm.transaction_id}
                    onChange={(e) =>
                      setChargebackForm({ ...chargebackForm, transaction_id: e.target.value })
                    }
                    className="w-full bg-sentinel-surface border border-sentinel-border rounded px-3 py-2"
                    placeholder="e.g., TXN_001"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Customer ID</label>
                    <input
                      type="text"
                      value={chargebackForm.customer_id}
                      onChange={(e) =>
                        setChargebackForm({ ...chargebackForm, customer_id: e.target.value })
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
                      value={chargebackForm.merchant_id}
                      onChange={(e) =>
                        setChargebackForm({ ...chargebackForm, merchant_id: e.target.value })
                      }
                      className="w-full bg-sentinel-surface border border-sentinel-border rounded px-3 py-2"
                      placeholder="e.g., MERCH_001"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={chargebackForm.amount}
                      onChange={(e) =>
                        setChargebackForm({ ...chargebackForm, amount: e.target.value })
                      }
                      className="w-full bg-sentinel-surface border border-sentinel-border rounded px-3 py-2"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Chargeback Reason</label>
                    <select
                      value={chargebackForm.reason}
                      onChange={(e) =>
                        setChargebackForm({ ...chargebackForm, reason: e.target.value })
                      }
                      className="w-full bg-sentinel-surface border border-sentinel-border rounded px-3 py-2"
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
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-sm font-medium transition-colors"
                >
                  {processChargebackMutation.isPending ? 'Processing...' : 'Process Chargeback'}
                </button>

                {processChargebackMutation.isSuccess && !chargebackCase && (
                  <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded text-green-400 text-sm">
                    ✓ Chargeback processed successfully!
                  </div>
                )}

                {processChargebackMutation.error && (
                  <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
                    Error: {String(processChargebackMutation.error)}
                  </div>
                )}
              </form>

              {/* Chargeback Case Results */}
              {chargebackCase && (
                <div className="mt-6 p-4 border border-sentinel-border rounded-lg bg-sentinel-surface/50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Chargeback Case: {chargebackCase.case_id}</h3>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        chargebackCase.win_probability >= 0.8 ? 'text-green-400' :
                        chargebackCase.win_probability >= 0.6 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {(chargebackCase.win_probability * 100).toFixed(0)}%
                      </div>
                      <p className="text-xs text-sentinel-muted">Win Probability</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <h4 className="font-medium mb-1">Response Strength</h4>
                      <div className="flex items-center">
                        <div className="w-full bg-gray-700 rounded-full h-2 mr-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${chargebackCase.response_strength * 100}%` }}
                          />
                        </div>
                        <span className="text-sm">{(chargebackCase.response_strength * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Evidence Count</h4>
                      <span className="text-blue-400 font-semibold">
                        {chargebackCase.evidence_count} pieces
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Due Date</h4>
                      <span className="text-yellow-400 font-semibold">
                        {new Date(chargebackCase.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Recommended Action</h4>
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded">
                      <p className="text-blue-400">{chargebackCase.recommended_action}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Evidence Summary</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {chargebackCase.evidence_summary.map((evidence, index) => (
                        <div key={index} className="p-2 bg-gray-800 rounded text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-purple-400">{evidence.type}</span>
                            <span className="text-xs text-gray-400">
                              Relevance: {(evidence.relevance_score * 100).toFixed(0)}%
                            </span>
                          </div>
                          <p className="text-gray-300">{evidence.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Chargeback Reason Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="sentinel-card"
            >
              <h2 className="text-lg font-semibold mb-4">Chargeback Reasons</h2>
              {analyticsLoading ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-6 h-6 border-2 border-red-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sentinel-muted text-sm">Loading reason breakdown...</p>
                  </div>
                </div>
              ) : analyticsError ? (
                <div className="h-96 flex items-center justify-center">
                  <p className="text-red-400 text-sm">Failed to load chart data</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart 
                    data={analytics?.reasonBreakdown?.length ? analytics.reasonBreakdown : []}
                    margin={{ top: 20, right: 30, bottom: 80, left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
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
                        background: '#111827',
                        border: '1px solid #1e293b',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="count" fill="#ef4444" name="Count" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Win Rate by Reason */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="sentinel-card"
            >
              <h2 className="text-lg font-semibold mb-4">Win Rate by Chargeback Reason</h2>
              {analyticsLoading ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sentinel-muted text-sm">Loading win rates...</p>
                  </div>
                </div>
              ) : analyticsError ? (
                <div className="h-96 flex items-center justify-center">
                  <p className="text-red-400 text-sm">Failed to load chart data</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart 
                    data={analytics?.reasonBreakdown?.length ? analytics.reasonBreakdown : []}
                    margin={{ top: 20, right: 30, bottom: 80, left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
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
                        background: '#111827',
                        border: '1px solid #1e293b',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="winRate" fill="#22c55e" name="Win Rate %" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            {/* Monthly Trends */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="sentinel-card"
            >
              <h2 className="text-lg font-semibold mb-4">Monthly Chargeback Trends</h2>
              {analyticsLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sentinel-muted text-sm">Loading trends...</p>
                  </div>
                </div>
              ) : analyticsError ? (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-red-400 text-sm">Failed to load chart data</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={(analytics?.monthlyTrends || []).map(trend => ({
                    ...trend,
                    wins: trend.wins ?? Math.floor(trend.chargebacks * (trend.winRate || 80) / 100),
                    losses: trend.losses ?? Math.floor(trend.chargebacks * (100 - (trend.winRate || 80)) / 100)
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
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
                      dataKey="chargebacks"
                      stroke="#ef4444"
                      strokeWidth={2}
                      name="Chargebacks"
                    />
                    <Line
                      type="monotone"
                      dataKey="wins"
                      stroke="#22c55e"
                      strokeWidth={2}
                      name="Wins"
                    />
                    <Line
                      type="monotone"
                      dataKey="losses"
                      stroke="#f97316"
                      strokeWidth={2}
                      name="Losses"
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