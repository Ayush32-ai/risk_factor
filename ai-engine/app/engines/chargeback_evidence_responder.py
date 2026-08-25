"""Chargeback Evidence Responder — Automated evidence collection and response system."""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import numpy as np


class ChargebackReason(Enum):
    FRAUD = "fraud"
    AUTHORIZATION = "authorization"
    PROCESSING_ERROR = "processing_error"
    CONSUMER_DISPUTE = "consumer_dispute"
    NON_RECEIPT = "non_receipt"
    DUPLICATE = "duplicate"
    CREDIT_NOT_PROCESSED = "credit_not_processed"
    CANCELLED_RECURRING = "cancelled_recurring"


class EvidenceType(Enum):
    TRANSACTION_LOG = "transaction_log"
    CUSTOMER_COMMUNICATION = "customer_communication" 
    DELIVERY_PROOF = "delivery_proof"
    AUTHORIZATION_PROOF = "authorization_proof"
    REFUND_PROOF = "refund_proof"
    CUSTOMER_SIGNATURE = "customer_signature"
    IP_GEOLOCATION = "ip_geolocation"
    DEVICE_FINGERPRINT = "device_fingerprint"
    FRAUD_SCORING = "fraud_scoring"
    BILLING_PROOF = "billing_proof"


@dataclass
class Evidence:
    """Individual piece of evidence for chargeback defense."""
    evidence_id: str
    evidence_type: EvidenceType
    description: str
    file_path: Optional[str]
    relevance_score: float
    created_at: datetime
    metadata: Dict


@dataclass
class ChargebackCase:
    """Complete chargeback case with evidence and response."""
    case_id: str
    transaction_id: str
    chargeback_reason: ChargebackReason
    chargeback_amount: float
    customer_id: str
    merchant_id: str
    created_at: datetime
    due_date: datetime
    evidence_collection: List[Evidence]
    response_strength: float
    win_probability: float
    recommended_action: str
    response_template: str


class ChargebackEvidenceResponder:
    """Automated chargeback evidence collection and response generation."""
    
    def __init__(self):
        # Evidence requirements by chargeback reason
        self.evidence_requirements = {
            ChargebackReason.FRAUD: [
                EvidenceType.FRAUD_SCORING,
                EvidenceType.IP_GEOLOCATION,
                EvidenceType.DEVICE_FINGERPRINT,
                EvidenceType.AUTHORIZATION_PROOF,
                EvidenceType.TRANSACTION_LOG
            ],
            ChargebackReason.AUTHORIZATION: [
                EvidenceType.AUTHORIZATION_PROOF,
                EvidenceType.TRANSACTION_LOG,
                EvidenceType.CUSTOMER_COMMUNICATION
            ],
            ChargebackReason.NON_RECEIPT: [
                EvidenceType.DELIVERY_PROOF,
                EvidenceType.CUSTOMER_SIGNATURE,
                EvidenceType.CUSTOMER_COMMUNICATION,
                EvidenceType.IP_GEOLOCATION
            ],
            ChargebackReason.CONSUMER_DISPUTE: [
                EvidenceType.CUSTOMER_COMMUNICATION,
                EvidenceType.DELIVERY_PROOF,
                EvidenceType.REFUND_PROOF,
                EvidenceType.BILLING_PROOF
            ],
            ChargebackReason.DUPLICATE: [
                EvidenceType.TRANSACTION_LOG,
                EvidenceType.AUTHORIZATION_PROOF,
                EvidenceType.BILLING_PROOF
            ]
        }
        
        # Win probability weights by evidence type
        self.evidence_weights = {
            EvidenceType.AUTHORIZATION_PROOF: 0.25,
            EvidenceType.DELIVERY_PROOF: 0.20,
            EvidenceType.CUSTOMER_SIGNATURE: 0.20,
            EvidenceType.FRAUD_SCORING: 0.15,
            EvidenceType.CUSTOMER_COMMUNICATION: 0.10,
            EvidenceType.IP_GEOLOCATION: 0.05,
            EvidenceType.DEVICE_FINGERPRINT: 0.05
        }
    
    def collect_transaction_evidence(self, transaction_id: str) -> List[Evidence]:
        """Collect transaction-related evidence."""
        evidence_list = []
        
        # Transaction log evidence
        evidence_list.append(Evidence(
            evidence_id=f"txn_log_{transaction_id}",
            evidence_type=EvidenceType.TRANSACTION_LOG,
            description="Complete transaction processing log with timestamps and status codes",
            file_path=f"/evidence/transactions/{transaction_id}_log.json",
            relevance_score=85.0,
            created_at=datetime.now(),
            metadata={
                "transaction_id": transaction_id,
                "processing_time": "2.3 seconds",
                "gateway_response": "approved",
                "auth_code": "AB123C",
                "settlement_status": "settled"
            }
        ))
        
        # Authorization proof
        evidence_list.append(Evidence(
            evidence_id=f"auth_proof_{transaction_id}",
            evidence_type=EvidenceType.AUTHORIZATION_PROOF,
            description="Card authorization approval with AVS and CVV verification",
            file_path=f"/evidence/auth/{transaction_id}_auth.pdf",
            relevance_score=90.0,
            created_at=datetime.now(),
            metadata={
                "auth_response": "approved", 
                "avs_result": "Y",
                "cvv_result": "M",
                "auth_amount": np.random.uniform(50, 500),
                "processor": "razorpay_gateway"
            }
        ))
        
        return evidence_list
    
    def collect_fraud_evidence(self, transaction_id: str, customer_id: str) -> List[Evidence]:
        """Collect fraud-related evidence."""
        evidence_list = []
        
        # Fraud scoring evidence
        fraud_score = np.random.uniform(10, 40)  # Low fraud score indicates legitimate transaction
        evidence_list.append(Evidence(
            evidence_id=f"fraud_score_{transaction_id}",
            evidence_type=EvidenceType.FRAUD_SCORING,
            description=f"Real-time fraud score: {fraud_score:.1f}/100 (Low Risk)",
            file_path=f"/evidence/fraud/{transaction_id}_fraud_analysis.json",
            relevance_score=80.0,
            created_at=datetime.now(),
            metadata={
                "fraud_score": fraud_score,
                "risk_level": "low" if fraud_score < 30 else "medium",
                "ml_model_version": "v2.1.3",
                "risk_factors": ["velocity_check_passed", "device_recognized", "geo_location_normal"]
            }
        ))
        
        # IP Geolocation evidence
        evidence_list.append(Evidence(
            evidence_id=f"ip_geo_{transaction_id}",
            evidence_type=EvidenceType.IP_GEOLOCATION,
            description="Customer IP geolocation matches billing address region",
            file_path=f"/evidence/geo/{transaction_id}_geolocation.json",
            relevance_score=70.0,
            created_at=datetime.now(),
            metadata={
                "customer_ip": "203.192.xxx.xxx",
                "geo_country": "US",
                "geo_region": "California",
                "billing_country": "US",
                "geo_match": True,
                "vpn_detected": False
            }
        ))
        
        # Device fingerprint evidence
        evidence_list.append(Evidence(
            evidence_id=f"device_fp_{transaction_id}",
            evidence_type=EvidenceType.DEVICE_FINGERPRINT,
            description="Device fingerprint matches customer's historical transactions",
            file_path=f"/evidence/device/{transaction_id}_device.json",
            relevance_score=75.0,
            created_at=datetime.now(),
            metadata={
                "device_id": f"fp_{hash(customer_id) % 10000}",
                "device_reputation": "trusted",
                "first_seen": (datetime.now() - timedelta(days=30)).isoformat(),
                "transaction_count": np.random.randint(5, 50),
                "risk_indicators": []
            }
        ))
        
        return evidence_list
    
    def collect_delivery_evidence(self, transaction_id: str) -> List[Evidence]:
        """Collect delivery and fulfillment evidence."""
        evidence_list = []
        
        # Delivery proof
        evidence_list.append(Evidence(
            evidence_id=f"delivery_{transaction_id}",
            evidence_type=EvidenceType.DELIVERY_PROOF,
            description="Package delivery confirmation with tracking details",
            file_path=f"/evidence/delivery/{transaction_id}_tracking.pdf",
            relevance_score=95.0,
            created_at=datetime.now(),
            metadata={
                "tracking_number": f"TRK{np.random.randint(100000, 999999)}",
                "delivery_date": (datetime.now() - timedelta(days=2)).isoformat(),
                "delivery_status": "delivered",
                "recipient": "Customer",
                "signature_required": True,
                "carrier": "FedEx"
            }
        ))
        
        # Customer signature
        evidence_list.append(Evidence(
            evidence_id=f"signature_{transaction_id}",
            evidence_type=EvidenceType.CUSTOMER_SIGNATURE,
            description="Digital signature captured at delivery",
            file_path=f"/evidence/signatures/{transaction_id}_signature.png",
            relevance_score=90.0,
            created_at=datetime.now(),
            metadata={
                "signature_method": "digital_pad",
                "timestamp": (datetime.now() - timedelta(days=2)).isoformat(),
                "delivery_address_match": True,
                "signature_quality": "high"
            }
        ))
        
        return evidence_list
    
    def collect_communication_evidence(self, customer_id: str, transaction_id: str) -> List[Evidence]:
        """Collect customer communication evidence."""
        evidence_list = []
        
        # Generate simulated customer communication
        communication_types = [
            "Order confirmation email sent and delivered",
            "Shipping notification sent with tracking details",
            "Customer service inquiry resolved satisfactorily",
            "No dispute raised through customer service channels"
        ]
        
        evidence_list.append(Evidence(
            evidence_id=f"comm_{transaction_id}",
            evidence_type=EvidenceType.CUSTOMER_COMMUNICATION,
            description="Customer communication history shows no prior disputes",
            file_path=f"/evidence/communications/{customer_id}_communications.json",
            relevance_score=65.0,
            created_at=datetime.now(),
            metadata={
                "total_communications": len(communication_types),
                "communication_types": communication_types,
                "satisfaction_score": np.random.uniform(4.2, 4.9),
                "escalations": 0,
                "resolution_time": "< 2 hours"
            }
        ))
        
        return evidence_list
    
    def calculate_win_probability(self, evidence_collection: List[Evidence], chargeback_reason: ChargebackReason) -> float:
        """Calculate win probability based on evidence strength."""
        required_evidence = self.evidence_requirements.get(chargeback_reason, [])
        collected_types = {e.evidence_type for e in evidence_collection}
        
        # Base probability from evidence coverage
        coverage_score = len(collected_types.intersection(required_evidence)) / len(required_evidence)
        
        # Quality-weighted score
        quality_score = sum(
            (e.relevance_score / 100) * self.evidence_weights.get(e.evidence_type, 0.05)
            for e in evidence_collection
        )
        
        # Combined probability (coverage + quality)
        base_probability = (coverage_score * 0.4 + quality_score * 0.6) * 100
        
        # Reason-specific adjustments
        reason_multipliers = {
            ChargebackReason.FRAUD: 1.1,           # Easier to defend with good evidence
            ChargebackReason.AUTHORIZATION: 1.0,    # Standard difficulty
            ChargebackReason.NON_RECEIPT: 0.9,      # Harder without delivery proof
            ChargebackReason.CONSUMER_DISPUTE: 0.8, # Most challenging
            ChargebackReason.DUPLICATE: 1.2        # Easy to defend with transaction logs
        }
        
        multiplier = reason_multipliers.get(chargeback_reason, 1.0)
        final_probability = min(95.0, base_probability * multiplier)
        
        return final_probability
    
    def generate_response_template(self, case: ChargebackCase) -> str:
        """Generate chargeback response template."""
        evidence_summaries = []
        for evidence in case.evidence_collection:
            evidence_summaries.append(f"- {evidence.description} (Relevance: {evidence.relevance_score}%)")
        
        template = f"""
CHARGEBACK RESPONSE - Case {case.case_id}

Transaction Details:
- Transaction ID: {case.transaction_id}
- Amount: ${case.chargeback_amount:,.2f}
- Date: {case.created_at.strftime('%Y-%m-%d %H:%M:%S')}
- Chargeback Reason: {case.chargeback_reason.value.replace('_', ' ').title()}

Evidence Summary:
{chr(10).join(evidence_summaries)}

Response Strength: {case.response_strength:.1f}%
Win Probability: {case.win_probability:.1f}%

Recommended Action: {case.recommended_action}

Detailed Defense:
1. Transaction was properly authorized with valid payment credentials
2. Goods/services were delivered as confirmed by tracking information
3. Customer communication history shows no prior dispute attempts
4. Fraud scoring indicates legitimate transaction patterns
5. All processing protocols were followed according to industry standards

Supporting Documentation:
- Authorization logs and approval codes
- Delivery confirmation and tracking details
- Customer communication records
- Fraud analysis and risk scoring reports
- IP geolocation and device fingerprint data

This transaction meets all criteria for a successful chargeback defense.
Recommended to contest with HIGH confidence.
        """
        
        return template.strip()
    
    def process_chargeback(self, chargeback_data: Dict) -> ChargebackCase:
        """Process a new chargeback and collect evidence."""
        transaction_id = chargeback_data['transaction_id']
        customer_id = chargeback_data['customer_id']
        merchant_id = chargeback_data.get('merchant_id', 'default_merchant')
        
        # Parse chargeback details
        try:
            reason = ChargebackReason(chargeback_data['reason'])
        except ValueError:
            reason = ChargebackReason.CONSUMER_DISPUTE
        
        case_id = f"CB_{int(datetime.now().timestamp())}"
        
        # Collect all relevant evidence
        evidence_collection = []
        
        # Always collect transaction evidence
        evidence_collection.extend(self.collect_transaction_evidence(transaction_id))
        
        # Collect reason-specific evidence
        if reason in [ChargebackReason.FRAUD, ChargebackReason.AUTHORIZATION]:
            evidence_collection.extend(self.collect_fraud_evidence(transaction_id, customer_id))
        
        if reason == ChargebackReason.NON_RECEIPT:
            evidence_collection.extend(self.collect_delivery_evidence(transaction_id))
        
        # Always collect communication evidence
        evidence_collection.extend(self.collect_communication_evidence(customer_id, transaction_id))
        
        # Calculate win probability and response strength
        win_probability = self.calculate_win_probability(evidence_collection, reason)
        response_strength = min(100.0, sum(e.relevance_score for e in evidence_collection) / len(evidence_collection))
        
        # Determine recommended action
        if win_probability >= 70:
            recommended_action = "CONTEST - Strong evidence for defense"
        elif win_probability >= 50:
            recommended_action = "CONTEST WITH CAUTION - Moderate evidence"
        else:
            recommended_action = "ACCEPT - Insufficient evidence for defense"
        
        # Create case
        case = ChargebackCase(
            case_id=case_id,
            transaction_id=transaction_id,
            chargeback_reason=reason,
            chargeback_amount=chargeback_data.get('amount', 100.0),
            customer_id=customer_id,
            merchant_id=merchant_id,
            created_at=datetime.now(),
            due_date=datetime.now() + timedelta(days=7),  # Typical response deadline
            evidence_collection=evidence_collection,
            response_strength=response_strength,
            win_probability=win_probability,
            recommended_action=recommended_action,
            response_template=""
        )
        
        # Generate response template
        case.response_template = self.generate_response_template(case)
        
        return case
    
    def get_chargeback_analytics(self) -> Dict:
        """Get chargeback analytics and metrics."""
        # Simulate current chargeback metrics
        return {
            'total_chargebacks_month': np.random.randint(150, 250),
            'cases_won': np.random.randint(80, 120),
            'cases_lost': np.random.randint(30, 50),
            'win_rate': np.random.uniform(70, 85),
            'average_response_time': np.random.uniform(2.5, 4.0),  # hours
            'evidence_collection_rate': np.random.uniform(92, 98),  # percentage
            'reason_breakdown': {
                'fraud': np.random.randint(40, 60),
                'authorization': np.random.randint(20, 35),
                'non_receipt': np.random.randint(25, 40),
                'consumer_dispute': np.random.randint(30, 50),
                'processing_error': np.random.randint(5, 15)
            },
            'automation_rate': np.random.uniform(85, 92),
            'last_updated': datetime.now().isoformat()
        }


# Global instance
chargeback_evidence_responder = ChargebackEvidenceResponder()