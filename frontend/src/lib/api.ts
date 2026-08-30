const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://risk-factor-500.onrender.com';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sentinel_token', token);
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('sentinel_token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sentinel_token');
    }
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    console.log(`📤 API Request: ${options.method || 'GET'} ${path}`);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });

    console.log(`📥 API Response: ${res.status} ${res.statusText}`);

    if (res.status === 401) {
      this.clearToken();
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      console.error('❌ API Error:', err);
      throw new Error(err.error || 'Request failed');
    }

    const data = await res.json();
    console.log('📦 API Data:', data);
    return data;
  }

  login(email: string, password: string) {
    return this.request<{ token: string; user: { id: string; email: string; name: string; role: string } }>(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    );
  }

  getOverview() {
    return this.request<{ metrics: Record<string, number>; timeline: Array<Record<string, string>>; status: string }>(
      '/api/overview'
    );
  }

  getAttackSimulation() {
    return this.request<{ simulation: Record<string, unknown> }>('/api/attacks/current');
  }

  getScenarios() {
    return this.request<{ scenarios: Array<{ id: string; name: string; description: string }> }>(
      '/api/attacks/scenarios'
    );
  }

  startAttack(data: { target?: string; scenario: string; generation?: number }) {
    return this.request<{ simulation: Record<string, unknown> }>(
      '/api/attacks/start',
      { method: 'POST', body: JSON.stringify(data) }
    );
  }

  evolveAttack() {
    return this.request<{ simulation: Record<string, unknown> }>(
      '/api/attacks/evolve',
      { method: 'POST', body: JSON.stringify({}) }
    );
  }

  getGraph() {
    return this.request<{ nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> }>(
      '/api/graph/network'
    );
  }

  getNodeProfile(nodeId: string) {
    return this.request<{ node: Record<string, unknown>; connections: unknown[]; riskProfile: Record<string, unknown> }>(
      `/api/graph/node/${nodeId}`
    );
  }

  investigate(networkId: string) {
    return this.request<{ investigation: Record<string, unknown> }>(
      '/api/graph/investigate',
      { method: 'POST', body: JSON.stringify({ networkId }) }
    );
  }

  getBlindSpots() {
    return this.request<{ blindSpots: Array<Record<string, unknown>> }>('/api/blind-spots');
  }

  getDefense() {
    return this.request<{ 
      defense: Record<string, unknown>; 
      isSimulating: boolean; 
      baselineRate: number;
      history: Array<Record<string, unknown>>;
    }>('/api/defense/current');
  }

  generateDefense(blindSpotId: string, attackPattern?: string, currentDetectionRate?: number) {
    console.log('📡 API: Generating defense for blind spot:', blindSpotId, 'pattern:', attackPattern);
    return this.request<{ defense: Record<string, unknown> }>(
      '/api/defense/generate',
      { method: 'POST', body: JSON.stringify({ blindSpotId, attackPattern, currentDetectionRate }) }
    );
  }

  simulateDefense(blindSpotId: string, attackPattern?: string, currentDetectionRate?: number) {
    return this.request<{ defense: Record<string, unknown>; isSimulating: boolean }>(
      '/api/defense/simulate',
      { method: 'POST', body: JSON.stringify({ blindSpotId, attackPattern, currentDetectionRate }) }
    );
  }

  approveDefense(defenseId?: string) {
    return this.request<{ 
      status: string; 
      defense: Record<string, unknown>;
      newBaselineRate?: number;
    }>(
      '/api/defense/approve',
      { method: 'POST', body: JSON.stringify({ defenseId }) }
    );
  }

  // Generic GET and POST methods for flexibility
  get<T = any>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  post<T = any>(path: string, body?: any): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  getAuditLogs(limit = 50) {
    return this.request<{ logs: Array<Record<string, unknown>> }>(`/api/audit?limit=${limit}`);
  }

  // Return Risk Assessment endpoints
  getReturnAnalytics() {
    return this.request<{
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
    }>('/api/returns/analytics');
  }

  assessReturnRisk(returnData: {
    customer_id: string;
    merchant_id: string;
    amount: number;
    item_category: string;
    reason: string;
  }) {
    return this.request<{
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
    }>('/api/returns/assess-risk', {
      method: 'POST',
      body: JSON.stringify(returnData)
    });
  }

  // Chargeback endpoints
  getChargebackAnalytics() {
    return this.request<{
      totalChargebacks: number;
      winRate: number;
      averageAmount: number;
      pendingCases: number;
      reasonBreakdown: Array<{
        reason: string;
        count: number;
        winRate: number;
      }>;
      monthlyTrends: Array<{
        month: string;
        chargebacks: number;
        wins: number;
        losses: number;
      }>;
    }>('/api/chargebacks/analytics');
  }

  processChargeback(chargebackData: {
    transaction_id: string;
    customer_id: string;
    merchant_id: string;
    amount: number;
    reason: string;
  }) {
    return this.request<{
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
    }>('/api/chargebacks/process', {
      method: 'POST',
      body: JSON.stringify(chargebackData)
    });
  }

  getMlMetrics() {
    return this.request<MlEvaluationReport>('/api/ml/metrics');
  }

  runMlEvaluation(opts?: { n_samples?: number; holdout_frac?: number }) {
    return this.request<MlEvaluationReport>('/api/ml/evaluate', {
      method: 'POST',
      body: JSON.stringify(opts ?? { n_samples: 2000, holdout_frac: 0.25 }),
    });
  }

  getMlMonitoring() {
    return this.request<{
      model_version: string;
      champion_version: string;
      challenger_version: string | null;
      drift: { p_value: number; drift: boolean };
      retrain: { needed: boolean; reasons: string[]; thresholds: Record<string, number> };
      summary: Record<string, number>;
      history: Array<Record<string, unknown>>;
      holdout: Record<string, unknown>;
      production: Record<string, unknown>;
    }>('/api/ml/monitoring');
  }

  retrainMlModel() {
    return this.request<MlEvaluationReport>('/api/ml/retrain', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }
}

export interface MlDetectorMetrics {
  id: string;
  name: string;
  family: string;
  description?: string;
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number;
  status: string;
  false_positive_cost_inr: number;
  missed_fraud_cost_inr: number;
  confusion_matrix: { tn: number; fp: number; fn: number; tp: number };
  roc_curve: Array<{ fpr: number; tpr: number }>;
  holdout?: { n_train: number; n_test: number; fraud_rate_test: number };
}

export interface MlEvaluationReport {
  evaluated_at: string;
  model_version: string;
  champion_version: string;
  challenger_version: string | null;
  ab_test: {
    enabled: boolean;
    champion: string;
    challenger: string | null;
    traffic_split: { champion: number; challenger: number };
  };
  summary: {
    detectors: number;
    avg_roc_auc: number;
    avg_precision: number;
    avg_recall: number;
    false_positive_cost_inr: number;
    missed_fraud_cost_inr: number;
    total_error_cost_inr: number;
    healthy_detectors: number;
    degraded_detectors: number;
    critical_detectors: number;
  };
  cost_model: { fp_review_inr: number; fn_missed_fraud_inr: number; notes: string };
  holdout: Record<string, unknown>;
  detectors: MlDetectorMetrics[];
  drift: { p_value: number; drift: boolean };
  retrain: { needed: boolean; reasons: string[]; thresholds: Record<string, number>; retrained?: boolean; promoted?: boolean };
  production: Record<string, unknown>;
}

export const api = new ApiClient();
