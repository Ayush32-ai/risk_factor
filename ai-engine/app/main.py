from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from app.engines.ml_engine import risk_engine
from app.engines.attack_simulator import attack_simulator
from app.engines.defense_engine import defense_engine
from app.engines.graph_analyzer import graph_analyzer
from app.engines.groq_client import groq_client
from app.engines.fraud_spike_detector import fraud_spike_detector
from app.engines.return_risk_scorer import return_risk_scorer
from app.engines.chargeback_evidence_responder import chargeback_evidence_responder

app = FastAPI(
    title="Razorpay Sentinel AI Engine",
    description="ML Risk Scoring, Attack Simulation, Defense Generation",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AttackRequest(BaseModel):
    scenario: str = "Distributed Account Network"
    generation: int = 1


class DefenseRequest(BaseModel):
    blind_spot_id: str = ""
    attack_pattern: str = "distributed_account_network"
    current_detection_rate: Optional[float] = None


class InvestigateRequest(BaseModel):
    network_id: str = "cluster-7a3b"


class ScoreRequest(BaseModel):
    velocity: float = 1.0
    linked_accounts: int = 1
    device_risk: float = 0.0
    merchant_connections: int = 1
    amount_risk: float = 0.0


class FraudSpikeRequest(BaseModel):
    timeframe_minutes: int = 60
    pattern_type: Optional[str] = None


class ReturnRiskRequest(BaseModel):
    customer_id: str
    merchant_id: str
    amount: float
    item_category: str = "electronics"
    reason: str = "not_satisfied"
    return_id: Optional[str] = None


class ChargebackRequest(BaseModel):
    transaction_id: str
    customer_id: str
    merchant_id: str
    amount: float
    reason: str = "consumer_dispute"


@app.get("/health")
async def health():
    return {"status": "ok", "service": "sentinel-ai-engine", "engines": ["ml", "graph", "attack", "defense", "grok", "fraud_spike", "return_risk", "chargeback"]}


# Existing endpoints
@app.post("/api/simulate/attack")
async def simulate_attack(req: AttackRequest):
    return attack_simulator.simulate(req.scenario, req.generation)


@app.post("/api/simulate/defense")
async def simulate_defense(req: DefenseRequest):
    print(f"DEBUG: Received defense simulation request for {req.blind_spot_id}, pattern: {req.attack_pattern}, rate: {req.current_detection_rate}")
    result = defense_engine.simulate(req.blind_spot_id, req.attack_pattern, req.current_detection_rate)
    print(f"DEBUG: Simulated defense result: attacks={result.get('attacksRerun')}, improvement={result.get('improvement')}%")
    return result


@app.post("/api/defense/generate")
async def generate_defense(req: DefenseRequest):
    print(f"DEBUG: Received defense generation request for {req.blind_spot_id}, pattern: {req.attack_pattern}, rate: {req.current_detection_rate}")
    result = await defense_engine.generate_async(req.blind_spot_id, req.attack_pattern, req.current_detection_rate)
    print(f"DEBUG: Generated defense result: {result}")
    return result


@app.get("/api/defense/history")
async def get_defense_history():
    return {"history": defense_engine.get_defense_history()}


@app.get("/api/defense/baseline")
async def get_baseline():
    return {"baselineRate": defense_engine.get_current_baseline()}


@app.post("/api/defense/deploy")
async def deploy_defense(defense_id: str):
    return defense_engine.deploy_defense(defense_id)


@app.get("/api/graph/network")
async def get_network():
    return graph_analyzer.get_network()


@app.post("/api/investigate")
async def investigate(req: InvestigateRequest):
    result = graph_analyzer.investigate(req.network_id)
    ai_text = await groq_client.assess_risk(
        f"Network {req.network_id}: risk score {result['riskScore']}, "
        f"evidence: {[e['description'] for e in result['evidence']]}"
    )
    result["aiAssessment"] = ai_text
    return result


@app.post("/api/score")
async def score_transaction(req: ScoreRequest):
    return risk_engine.score_transaction(req.model_dump())


# NEW ENDPOINTS - Fraud Spike Detection
@app.get("/api/fraud-spikes/dashboard")
async def get_fraud_spike_dashboard():
    """Get fraud spike detection dashboard summary."""
    return fraud_spike_detector.get_dashboard_summary()


@app.post("/api/fraud-spikes/analyze")
async def analyze_fraud_patterns(req: FraudSpikeRequest):
    """Analyze real-time fraud patterns for spikes."""
    spikes = fraud_spike_detector.analyze_real_time_patterns(req.timeframe_minutes)
    return {"spikes": spikes, "analysis_time": req.timeframe_minutes}


@app.get("/api/fraud-spikes/trends")
async def get_fraud_trends():
    """Get fraud pattern trends over time."""
    return fraud_spike_detector.get_fraud_trends(24)


# NEW ENDPOINTS - Return Risk Scoring
@app.get("/api/returns/analytics")
async def get_return_analytics():
    """Get return risk analytics summary."""
    return return_risk_scorer.get_return_analytics_summary()


@app.post("/api/returns/assess-risk")
async def assess_return_risk(req: ReturnRiskRequest):
    """Assess risk for a return request."""
    return_request = {
        "customer_id": req.customer_id,
        "merchant_id": req.merchant_id,
        "amount": req.amount,
        "item_category": req.item_category,
        "reason": req.reason,
        "return_id": req.return_id,
        "created_at": __import__('datetime').datetime.now()
    }
    
    assessment = return_risk_scorer.assess_return_risk(return_request)
    
    # Convert dataclass to dict for JSON response
    return {
        "return_id": assessment.return_id,
        "risk_score": assessment.risk_score,
        "risk_level": assessment.risk_level.value,
        "confidence": assessment.confidence,
        "risk_factors": assessment.risk_factors,
        "recommendations": assessment.recommendations,
        "fraud_indicators": assessment.fraud_indicators,
        "assessment_timestamp": assessment.assessment_timestamp.isoformat()
    }


# NEW ENDPOINTS - Chargeback Evidence Response
@app.get("/api/chargebacks/analytics")
async def get_chargeback_analytics():
    """Get chargeback analytics and metrics."""
    return chargeback_evidence_responder.get_chargeback_analytics()


@app.post("/api/chargebacks/process")
async def process_chargeback(req: ChargebackRequest):
    """Process a new chargeback and collect evidence."""
    chargeback_data = {
        "transaction_id": req.transaction_id,
        "customer_id": req.customer_id,
        "merchant_id": req.merchant_id,
        "amount": req.amount,
        "reason": req.reason
    }
    
    case = chargeback_evidence_responder.process_chargeback(chargeback_data)
    
    # Convert to serializable format
    return {
        "case_id": case.case_id,
        "transaction_id": case.transaction_id,
        "chargeback_reason": case.chargeback_reason.value,
        "chargeback_amount": case.chargeback_amount,
        "response_strength": case.response_strength,
        "win_probability": case.win_probability,
        "recommended_action": case.recommended_action,
        "evidence_count": len(case.evidence_collection),
        "evidence_summary": [
            {
                "type": e.evidence_type.value,
                "description": e.description,
                "relevance_score": e.relevance_score
            }
            for e in case.evidence_collection
        ],
        "due_date": case.due_date.isoformat(),
        "created_at": case.created_at.isoformat()
    }
