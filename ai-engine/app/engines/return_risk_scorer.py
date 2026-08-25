"""Return Risk Scorer — Advanced risk scoring for returns and refunds."""

import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum


class ReturnRiskLevel(Enum):
    LOW = "low"
    MEDIUM = "medium" 
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class ReturnRiskAssessment:
    """Comprehensive return risk assessment result."""
    return_id: str
    risk_score: float
    risk_level: ReturnRiskLevel
    confidence: float
    risk_factors: List[Dict]
    recommendations: List[str]
    fraud_indicators: List[str]
    assessment_timestamp: datetime


class ReturnRiskScorer:
    """Advanced ML-based return risk scoring engine."""
    
    def __init__(self):
        self.risk_weights = {
            'velocity_score': 0.25,
            'pattern_score': 0.20,
            'merchant_score': 0.15,
            'customer_score': 0.15,
            'amount_score': 0.10,
            'timing_score': 0.10,
            'device_score': 0.05
        }
        
        # Velocity thresholds (returns per time period)
        self.velocity_thresholds = {
            'daily': {'low': 2, 'medium': 5, 'high': 10},
            'weekly': {'low': 8, 'medium': 15, 'high': 25},
            'monthly': {'low': 20, 'medium': 40, 'high': 70}
        }
        
        # Return pattern red flags
        self.pattern_flags = {
            'multiple_same_item': {'threshold': 3, 'weight': 0.8},
            'rapid_succession': {'threshold': 2, 'weight': 0.9},  # Within 1 hour
            'high_value_items': {'threshold': 1000, 'weight': 0.7},
            'seasonal_mismatch': {'weight': 0.6},
            'weekend_pattern': {'weight': 0.5}
        }
    
    def calculate_velocity_score(self, customer_id: str, timeframe: str = 'daily') -> Dict:
        """Calculate return velocity risk score for a customer."""
        # Simulate customer return history
        np.random.seed(hash(customer_id) % 2**32)
        
        base_returns = {
            'daily': np.random.poisson(2),
            'weekly': np.random.poisson(6),
            'monthly': np.random.poisson(15)
        }
        
        # Add random spikes for high-risk customers
        if np.random.random() < 0.2:  # 20% chance of being high-risk
            base_returns[timeframe] *= np.random.randint(3, 6)
        
        actual_returns = base_returns[timeframe]
        thresholds = self.velocity_thresholds[timeframe]
        
        if actual_returns <= thresholds['low']:
            risk_level = 'low'
            score = 20.0
        elif actual_returns <= thresholds['medium']:
            risk_level = 'medium'
            score = 50.0
        elif actual_returns <= thresholds['high']:
            risk_level = 'high'
            score = 80.0
        else:
            risk_level = 'critical'
            score = 95.0
        
        return {
            'score': score,
            'risk_level': risk_level,
            'actual_returns': actual_returns,
            'threshold': thresholds[risk_level],
            'timeframe': timeframe
        }
    
    def analyze_return_patterns(self, return_data: Dict) -> Dict:
        """Analyze return patterns for suspicious behavior."""
        pattern_score = 0.0
        detected_patterns = []
        
        # Simulate pattern analysis based on return data
        item_category = return_data.get('item_category', 'electronics')
        return_reason = return_data.get('reason', 'not_satisfied')
        amount = return_data.get('amount', 100)
        
        # Multiple same item returns
        same_item_probability = 0.3 if item_category in ['electronics', 'clothing'] else 0.1
        if np.random.random() < same_item_probability:
            pattern_score += 20
            detected_patterns.append({
                'type': 'multiple_same_item',
                'description': 'Customer has returned same item multiple times',
                'risk_contribution': 20
            })
        
        # High-value item returns
        if amount > self.pattern_flags['high_value_items']['threshold']:
            high_value_score = min(30, (amount / 1000) * 10)
            pattern_score += high_value_score
            detected_patterns.append({
                'type': 'high_value_return',
                'description': f'High-value return: ${amount:,.2f}',
                'risk_contribution': high_value_score
            })
        
        # Suspicious return reasons
        suspicious_reasons = ['damaged_in_shipping', 'not_as_described', 'unauthorized']
        if return_reason in suspicious_reasons:
            pattern_score += 15
            detected_patterns.append({
                'type': 'suspicious_reason',
                'description': f'Potentially fraudulent return reason: {return_reason}',
                'risk_contribution': 15
            })
        
        # Weekend return pattern (higher fraud risk)
        if datetime.now().weekday() >= 5:  # Saturday or Sunday
            pattern_score += 10
            detected_patterns.append({
                'type': 'weekend_pattern',
                'description': 'Return initiated during weekend (higher fraud risk)',
                'risk_contribution': 10
            })
        
        return {
            'score': min(100, pattern_score),
            'patterns': detected_patterns,
            'total_patterns': len(detected_patterns)
        }
    
    def calculate_merchant_risk_score(self, merchant_id: str) -> Dict:
        """Calculate merchant-specific return risk factors."""
        np.random.seed(hash(merchant_id) % 2**32)
        
        # Simulate merchant risk metrics
        merchant_return_rate = np.random.uniform(0.05, 0.25)  # 5-25% return rate
        merchant_fraud_history = np.random.choice(['clean', 'moderate', 'high'], p=[0.7, 0.2, 0.1])
        
        base_score = merchant_return_rate * 100
        
        fraud_multipliers = {'clean': 1.0, 'moderate': 1.5, 'high': 2.0}
        final_score = min(100, base_score * fraud_multipliers[merchant_fraud_history])
        
        return {
            'score': final_score,
            'return_rate': merchant_return_rate,
            'fraud_history': merchant_fraud_history,
            'risk_factors': [
                f"Historical return rate: {merchant_return_rate:.1%}",
                f"Fraud history: {merchant_fraud_history}"
            ]
        }
    
    def calculate_customer_risk_score(self, customer_id: str) -> Dict:
        """Calculate customer-specific risk factors."""
        np.random.seed(hash(customer_id) % 2**32)
        
        # Simulate customer risk attributes
        account_age_days = np.random.randint(30, 1095)  # 30 days to 3 years
        total_orders = np.random.randint(1, 100)
        return_rate = np.random.uniform(0.02, 0.30)
        
        # Age-based risk (newer accounts higher risk)
        age_score = max(0, 50 - (account_age_days / 30) * 2)  # Decreases with age
        
        # Return rate risk
        return_rate_score = return_rate * 100
        
        # Order history risk (very few orders = higher risk)
        order_history_score = max(0, 30 - (total_orders / 10) * 5)
        
        overall_score = (age_score + return_rate_score + order_history_score) / 3
        
        return {
            'score': min(100, overall_score),
            'account_age_days': account_age_days,
            'total_orders': total_orders,
            'return_rate': return_rate,
            'risk_factors': [
                f"Account age: {account_age_days} days",
                f"Return rate: {return_rate:.1%}",
                f"Total orders: {total_orders}"
            ]
        }
    
    def detect_fraud_indicators(self, return_data: Dict, risk_scores: Dict) -> List[str]:
        """Detect specific fraud indicators in the return."""
        indicators = []
        
        # High overall risk score
        if risk_scores['overall_score'] > 80:
            indicators.append("🚨 Extremely high risk score - manual review required")
        
        # Velocity-based indicators
        velocity_data = risk_scores.get('velocity', {})
        if velocity_data.get('risk_level') == 'critical':
            indicators.append(f"⚡ Critical return velocity: {velocity_data['actual_returns']} returns in {velocity_data['timeframe']}")
        
        # Pattern-based indicators
        pattern_data = risk_scores.get('patterns', {})
        if pattern_data.get('total_patterns', 0) >= 3:
            indicators.append(f"🔍 Multiple fraud patterns detected ({pattern_data['total_patterns']} patterns)")
        
        # Amount-based indicators
        amount = return_data.get('amount', 0)
        if amount > 2000:
            indicators.append(f"💰 High-value return: ${amount:,.2f}")
        
        # Timing-based indicators
        created_at = return_data.get('created_at', datetime.now())
        if created_at.hour < 6 or created_at.hour > 22:
            indicators.append("🌙 Return initiated during unusual hours")
        
        return indicators
    
    def generate_recommendations(self, risk_assessment: ReturnRiskAssessment) -> List[str]:
        """Generate actionable recommendations based on risk assessment."""
        recommendations = []
        
        if risk_assessment.risk_level == ReturnRiskLevel.CRITICAL:
            recommendations.extend([
                "🛑 HOLD RETURN - Require manual review before processing",
                "📞 Contact customer for verification via phone",
                "📋 Request additional documentation (receipt, photos)",
                "🔍 Investigate customer's full transaction history"
            ])
        elif risk_assessment.risk_level == ReturnRiskLevel.HIGH:
            recommendations.extend([
                "⏸️ Delayed processing - Hold for 24-48 hours",
                "✉️ Send verification email to customer",
                "📸 Require photos of returned item",
                "👁️ Flag for fraud team review"
            ])
        elif risk_assessment.risk_level == ReturnRiskLevel.MEDIUM:
            recommendations.extend([
                "📝 Standard verification process",
                "🎯 Monitor for pattern development",
                "📊 Track in fraud analytics dashboard"
            ])
        else:
            recommendations.append("✅ Process normally - Low risk return")
        
        return recommendations
    
    def assess_return_risk(self, return_request: Dict) -> ReturnRiskAssessment:
        """Perform comprehensive return risk assessment."""
        customer_id = return_request.get('customer_id', 'cust_default')
        merchant_id = return_request.get('merchant_id', 'merch_default')
        return_id = return_request.get('return_id', f"ret_{int(datetime.now().timestamp())}")
        
        # Calculate individual risk components
        velocity_risk = self.calculate_velocity_score(customer_id)
        pattern_risk = self.analyze_return_patterns(return_request)
        merchant_risk = self.calculate_merchant_risk_score(merchant_id)
        customer_risk = self.calculate_customer_risk_score(customer_id)
        
        # Additional risk factors
        amount_risk = min(100, (return_request.get('amount', 100) / 50))  # Amount-based risk
        timing_risk = 20 if datetime.now().hour < 6 or datetime.now().hour > 22 else 5
        device_risk = np.random.uniform(5, 25)  # Simulated device fingerprint risk
        
        # Calculate weighted overall score
        risk_components = {
            'velocity_score': velocity_risk['score'],
            'pattern_score': pattern_risk['score'],
            'merchant_score': merchant_risk['score'],
            'customer_score': customer_risk['score'],
            'amount_score': amount_risk,
            'timing_score': timing_risk,
            'device_score': device_risk
        }
        
        overall_score = sum(
            score * self.risk_weights[component]
            for component, score in risk_components.items()
        )
        
        # Determine risk level
        if overall_score >= 80:
            risk_level = ReturnRiskLevel.CRITICAL
        elif overall_score >= 60:
            risk_level = ReturnRiskLevel.HIGH
        elif overall_score >= 40:
            risk_level = ReturnRiskLevel.MEDIUM
        else:
            risk_level = ReturnRiskLevel.LOW
        
        # Calculate confidence based on data quality
        confidence = min(95.0, 75.0 + (len(return_request) * 2))
        
        # Compile risk factors
        risk_factors = []
        for component, score in risk_components.items():
            if score > 50:
                risk_factors.append({
                    'factor': component.replace('_', ' ').title(),
                    'score': score,
                    'impact': 'high' if score > 70 else 'medium'
                })
        
        # Create assessment
        assessment = ReturnRiskAssessment(
            return_id=return_id,
            risk_score=overall_score,
            risk_level=risk_level,
            confidence=confidence,
            risk_factors=risk_factors,
            recommendations=[],
            fraud_indicators=[],
            assessment_timestamp=datetime.now()
        )
        
        # Generate recommendations and fraud indicators
        assessment.recommendations = self.generate_recommendations(assessment)
        assessment.fraud_indicators = self.detect_fraud_indicators(return_request, {
            'overall_score': overall_score,
            'velocity': velocity_risk,
            'patterns': pattern_risk
        })
        
        return assessment
    
    def get_return_analytics_summary(self) -> Dict:
        """Get summary analytics for return risk dashboard."""
        # Simulate current return risk metrics
        current_hour_returns = np.random.poisson(25)
        high_risk_returns = np.random.poisson(8)
        critical_returns = np.random.poisson(2)
        
        return {
            'total_returns_analyzed': current_hour_returns,
            'high_risk_returns': high_risk_returns,
            'critical_risk_returns': critical_returns,
            'average_risk_score': np.random.uniform(35, 55),
            'risk_distribution': {
                'low': current_hour_returns - high_risk_returns - critical_returns,
                'medium': high_risk_returns - critical_returns,
                'high': high_risk_returns - critical_returns,
                'critical': critical_returns
            },
            'top_risk_factors': [
                'High return velocity',
                'Suspicious return patterns',
                'New customer accounts',
                'Weekend return timing'
            ],
            'fraud_prevention_score': np.random.uniform(87, 94),
            'last_updated': datetime.now().isoformat()
        }


# Global instance
return_risk_scorer = ReturnRiskScorer()