"""Defense generation engine — creates counter-measures for discovered blind spots using Groq AI."""

import httpx
import json
import time
import random
from typing import Dict, List, Optional
from datetime import datetime
from app.config import settings


# Dynamic defense templates with variability
DEFENSE_TEMPLATES = {
    "distributed_account_network": [
        {"name": "Cross-account velocity", "description": "Aggregate transaction velocity across linked accounts", "impact": [18, 25]},
        {"name": "Device relationship score", "description": "Score risk based on device-account graph density", "impact": [15, 22]},
        {"name": "Merchant cluster score", "description": "Detect merchants receiving from coordinated account clusters", "impact": [12, 20]},
        {"name": "Refund graph analysis", "description": "Track refund destination overlap with payment sources", "impact": [19, 26]},
        {"name": "Network density threshold", "description": "Block transactions when account network density exceeds baseline", "impact": [14, 18]},
        {"name": "Timing correlation analysis", "description": "Detect synchronized transaction timing patterns", "impact": [16, 23]},
    ],
    "refund_loop": [
        {"name": "Refund destination validation", "description": "Block refunds to accounts in payment cluster", "impact": [22, 28]},
        {"name": "Circular refund detection", "description": "Detect A→B→C→A refund cycles", "impact": [18, 25]},
        {"name": "Refund velocity limits", "description": "Rate limit refunds from high-risk account clusters", "impact": [15, 21]},
        {"name": "Cross-merchant refund tracking", "description": "Track refund patterns across merchant boundaries", "impact": [13, 19]},
    ],
    "merchant_cluster": [
        {"name": "Merchant payment correlation", "description": "Detect coordinated payments to merchant clusters", "impact": [17, 24]},
        {"name": "Merchant risk propagation", "description": "Propagate risk scores through merchant network", "impact": [14, 20]},
        {"name": "Geographic clustering detection", "description": "Detect merchants with suspicious geographic clustering", "impact": [12, 18]},
    ],
    "device_spoofing": [
        {"name": "Device fingerprint entropy", "description": "Validate device fingerprint authenticity", "impact": [20, 27]},
        {"name": "Behavioral device binding", "description": "Bind devices to consistent user behavior patterns", "impact": [16, 22]},
        {"name": "Cross-device correlation", "description": "Detect suspicious cross-device account activity", "impact": [18, 25]},
    ],
    "velocity_attacks": [
        {"name": "Adaptive velocity thresholds", "description": "Dynamic velocity limits based on risk profile", "impact": [19, 26]},
        {"name": "Time-window correlation", "description": "Detect velocity spikes across multiple time windows", "impact": [15, 21]},
        {"name": "Multi-dimensional velocity", "description": "Velocity checks across amount, frequency, and merchant", "impact": [17, 24]},
    ],
    "default": [
        {"name": "Graph-based risk scoring", "description": "Evaluate transactions in network context", "impact": [18, 24]},
        {"name": "Behavioral anomaly detection", "description": "ML model trained on attack patterns", "impact": [16, 22]},
        {"name": "Real-time cluster monitoring", "description": "Alert on emerging account clusters", "impact": [13, 19]},
        {"name": "Multi-signal fusion", "description": "Combine multiple risk signals for enhanced detection", "impact": [15, 21]},
    ],
}

# Store defense history and performance metrics
defense_history = []
current_baseline_rate = 18.0


class DefenseEngine:
    GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions"

    def __init__(self):
        self.baseline_detection_rate = 18.0
        self.defense_effectiveness_history = []
        
    def _calculate_dynamic_baseline(self) -> float:
        """Calculate current baseline detection rate based on deployed defenses."""
        global current_baseline_rate
        
        # Simulate gradual improvement based on deployed defenses
        if len(defense_history) > 0:
            # Each successful defense deployment improves baseline slightly
            improvement = min(len(defense_history) * 2.5, 15.0)  # Cap at 15% improvement
            current_baseline_rate = min(self.baseline_detection_rate + improvement, 35.0)
        
        return current_baseline_rate
    
    def _select_dynamic_rules(self, attack_pattern: str, rule_count: int = 4) -> List[Dict]:
        """Select and randomize defense rules with dynamic impact values."""
        templates = DEFENSE_TEMPLATES.get(attack_pattern, DEFENSE_TEMPLATES["default"])
        
        # Select random subset of rules
        selected_templates = random.sample(templates, min(rule_count, len(templates)))
        
        # Generate dynamic rules with randomized impacts
        rules = []
        for template in selected_templates:
            impact_range = template["impact"]
            actual_impact = random.randint(impact_range[0], impact_range[1])
            
            rules.append({
                "name": template["name"],
                "description": template["description"],
                "impact": actual_impact,
                "confidence": random.randint(85, 98),
                "generated_at": datetime.now().isoformat()
            })
        
        return rules

    async def _generate_ai_defense(self, blind_spot_id: str, attack_pattern: str, current_detection_rate: float = None) -> List[Dict]:
        """Generate defense rules using Groq AI based on attack pattern and blind spot."""
        print(f"DEBUG: API key exists: {bool(settings.ai_api_key)}")
        print(f"DEBUG: Generating defense for pattern: {attack_pattern}")
        
        if not settings.ai_api_key:
            print("No AI API key found, using dynamic templates")
            return self._select_dynamic_rules(attack_pattern)

        try:
            # Use current detection rate if provided, otherwise calculate it
            detection_rate = current_detection_rate or self._calculate_dynamic_baseline()
            
            prompt = f"""
You are a cybersecurity expert specializing in payment fraud prevention at Razorpay. 
Generate 3-4 specific, innovative defense rules to counter the attack pattern: "{attack_pattern}".

Context:
- Blind Spot ID: {blind_spot_id}
- Attack Pattern: {attack_pattern}
- Current Detection Rate: {detection_rate}%
- Time: {datetime.now().strftime('%Y-%m-%d %H:%M')}
- Previous Defenses Deployed: {len(defense_history)}

Attack Pattern Details:
{self._get_pattern_context(attack_pattern)}

Requirements:
1. Each rule must be practical and implementable in a real-time payment system
2. Focus on graph-based analysis, behavioral patterns, and ML detection
3. Include realistic impact scores (12-28 points each based on complexity)
4. Rules should be specific to countering the "{attack_pattern}" attack vector
5. Consider both prevention and detection mechanisms
6. Include confidence levels (80-98%)

Return your response as a JSON array with this exact format:
[
  {{"name": "Rule Name", "description": "Detailed rule description focusing on implementation", "impact": 22, "confidence": 92}},
  {{"name": "Another Rule", "description": "Another detailed description", "impact": 18, "confidence": 87}}
]

Generate innovative, actionable defense rules that would significantly improve detection of "{attack_pattern}" attacks.
"""

            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    self.GROQ_BASE_URL,
                    headers={
                        "Authorization": f"Bearer {settings.ai_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "llama-3.1-70b-versatile",
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are an expert cybersecurity analyst specializing in payment fraud detection. Always respond with valid JSON arrays containing defense rules with name, description, impact, and confidence fields."
                            },
                            {
                                "role": "user", 
                                "content": prompt
                            }
                        ],
                        "temperature": 0.7,
                        "max_tokens": 1200
                    }
                )
                
                if resp.status_code == 200:
                    data = resp.json()
                    ai_text = data["choices"][0]["message"]["content"]
                    print(f"DEBUG: Groq AI response: {ai_text[:200]}...")
                    
                    # Extract JSON from AI response
                    try:
                        # Find JSON array in the response
                        start_idx = ai_text.find('[')
                        end_idx = ai_text.rfind(']') + 1
                        if start_idx != -1 and end_idx != -1:
                            json_str = ai_text[start_idx:end_idx]
                            ai_rules = json.loads(json_str)
                            
                            # Validate and enhance structure
                            enhanced_rules = []
                            for rule in ai_rules:
                                if not all(key in rule for key in ["name", "description", "impact"]):
                                    raise ValueError("Invalid rule structure")
                                
                                enhanced_rule = {
                                    "name": rule["name"],
                                    "description": rule["description"],
                                    "impact": rule["impact"],
                                    "confidence": rule.get("confidence", random.randint(85, 95)),
                                    "generated_at": datetime.now().isoformat(),
                                    "source": "ai_generated"
                                }
                                enhanced_rules.append(enhanced_rule)
                            
                            print(f"DEBUG: Successfully parsed {len(enhanced_rules)} AI-generated rules")
                            return enhanced_rules
                    except (json.JSONDecodeError, ValueError) as e:
                        print(f"DEBUG: Failed to parse AI response as JSON: {e}")
                        pass
                else:
                    print(f"DEBUG: Groq API error: {resp.status_code} - {resp.text}")
        except Exception as e:
            print(f"AI defense generation failed: {e}")

        # Fallback to dynamic templates
        print("DEBUG: Falling back to dynamic templates")
        return self._select_dynamic_rules(attack_pattern)
    
    def _get_pattern_context(self, attack_pattern: str) -> str:
        """Get detailed context about the attack pattern."""
        contexts = {
            "distributed_account_network": "Attackers create networks of accounts that share devices, payment methods, or behavioral patterns to bypass individual-account risk checks.",
            "refund_loop": "Fraudsters exploit refund policies by creating circular refund paths that ultimately return money to accounts within their control network.",
            "merchant_cluster": "Coordinated networks of merchants work together to process fraudulent transactions and split proceeds.",
            "device_spoofing": "Attackers use device fingerprinting manipulation to appear as multiple legitimate users from different devices.",
            "velocity_attacks": "High-speed transaction patterns designed to overwhelm rate limiting and processing delays.",
        }
        return contexts.get(attack_pattern, "General fraud pattern requiring network-based detection.")

    def _simulate_defense_effectiveness(self, rules: List[Dict], baseline_rate: float) -> Dict:
        """Simulate how effective the defense rules would be against attacks."""
        # Add timestamp-based seed for more randomness
        import time
        random.seed(int(time.time() * 1000) % 10000)  # Use milliseconds for better randomness
        
        total_impact = sum(rule["impact"] for rule in rules)
        
        # Add more realistic variability to the simulation
        effectiveness_variance = random.uniform(0.75, 1.25)  # ±25% variance for more variation
        actual_impact = total_impact * effectiveness_variance
        
        # Calculate new detection rate with diminishing returns and more randomness
        improvement = actual_impact * random.uniform(0.7, 1.3)  # More randomness
        after_rate = min(98.5, baseline_rate + improvement)  # Cap at realistic maximum
        
        # Simulate attack re-run results with more variation
        attacks_tested = random.randint(7500, 15000)  # Wider range for more variation
        attacks_blocked_before = int(attacks_tested * (baseline_rate / 100))
        attacks_blocked_after = int(attacks_tested * (after_rate / 100))
        additional_blocked = attacks_blocked_after - attacks_blocked_before
        
        # Add some additional randomness to effectiveness score
        effectiveness_score = actual_impact * random.uniform(0.9, 1.1)
        
        result = {
            "beforeDetectionRate": round(baseline_rate, 1),
            "afterDetectionRate": round(after_rate, 1),
            "improvement": round(after_rate - baseline_rate, 1),
            "attacksRerun": attacks_tested,
            "additionalAttacksBlocked": additional_blocked,
            "effectivenessScore": round(effectiveness_score, 1),
            "simulationId": f"sim-{int(time.time())}-{random.randint(1000, 9999)}"
        }
        
        print(f"DEBUG: Generated simulation - Attacks: {attacks_tested}, Before: {baseline_rate}%, After: {after_rate}%, Improvement: {round(after_rate - baseline_rate, 1)}%")
        
        return result

    def generate(self, blind_spot_id: str = "", attack_pattern: str = "default", current_detection_rate: float = None) -> Dict:
        """Generate defense rules - synchronous version for backward compatibility."""
        import asyncio
        
        baseline_rate = current_detection_rate or self._calculate_dynamic_baseline()
        
        try:
            # Try to get AI-generated rules
            rules = asyncio.run(self._generate_ai_defense(blind_spot_id, attack_pattern, baseline_rate))
        except Exception as e:
            print(f"Failed to generate AI defense: {e}")
            # Fallback to dynamic templates
            rules = self._select_dynamic_rules(attack_pattern)
        
        # Simulate defense effectiveness
        simulation_results = self._simulate_defense_effectiveness(rules, baseline_rate)
        
        # Store in history
        defense_result = {
            "id": f"defense-{int(time.time())}",
            "blindSpotId": blind_spot_id,
            "attackPattern": attack_pattern,
            "existingDetectionRate": baseline_rate,
            "generatedRules": rules,
            "generatedAt": datetime.now().isoformat(),
            **simulation_results
        }
        
        defense_history.append(defense_result)
        
        return defense_result

    async def generate_async(self, blind_spot_id: str = "", attack_pattern: str = "default", current_detection_rate: float = None) -> Dict:
        """Generate defense rules - async version for better performance."""
        baseline_rate = current_detection_rate or self._calculate_dynamic_baseline()
        
        try:
            # Try to get AI-generated rules
            rules = await self._generate_ai_defense(blind_spot_id, attack_pattern, baseline_rate)
        except Exception as e:
            print(f"Failed to generate AI defense: {e}")
            # Fallback to dynamic templates
            rules = self._select_dynamic_rules(attack_pattern)
        
        # Simulate defense effectiveness
        simulation_results = self._simulate_defense_effectiveness(rules, baseline_rate)
        
        # Store in history
        defense_result = {
            "id": f"defense-{int(time.time())}",
            "blindSpotId": blind_spot_id,
            "attackPattern": attack_pattern,
            "existingDetectionRate": baseline_rate,
            "generatedRules": rules,
            "generatedAt": datetime.now().isoformat(),
            **simulation_results
        }
        
        defense_history.append(defense_result)
        
        return defense_result

    def simulate(self, blind_spot_id: str = "", attack_pattern: str = "default", current_detection_rate: float = None) -> Dict:
        """Run a new simulation with existing rules to get different results."""
        baseline_rate = current_detection_rate or self._calculate_dynamic_baseline()
        
        # Get the most recent defense rules for this pattern
        existing_defense = None
        for defense in reversed(defense_history):
            if defense.get("attackPattern") == attack_pattern:
                existing_defense = defense
                break
        
        if existing_defense and existing_defense.get("generatedRules"):
            # Use existing rules but generate new simulation results
            rules = existing_defense["generatedRules"]
            print(f"DEBUG: Re-simulating with {len(rules)} existing rules for pattern: {attack_pattern}")
        else:
            # No existing rules, generate new ones
            print(f"DEBUG: No existing rules found, generating new defense for simulation")
            return self.generate(blind_spot_id, attack_pattern, baseline_rate)
        
        # Generate NEW simulation results with the existing rules
        simulation_results = self._simulate_defense_effectiveness(rules, baseline_rate)
        
        # Create updated defense result with new simulation data
        defense_result = {
            "id": f"defense-sim-{int(time.time())}",
            "blindSpotId": blind_spot_id,
            "attackPattern": attack_pattern,
            "existingDetectionRate": baseline_rate,
            "generatedRules": rules,  # Keep existing rules
            "generatedAt": existing_defense.get("generatedAt", datetime.now().isoformat()),
            "simulatedAt": datetime.now().isoformat(),
            **simulation_results  # This will have new random values
        }
        
        # Update current state and add to history
        defense_history.append(defense_result)
        
        print(f"DEBUG: New simulation - Attacks: {simulation_results['attacksRerun']}, Improvement: {simulation_results['improvement']}%")
        
        return defense_result
    
    def get_defense_history(self) -> List[Dict]:
        """Get history of all generated defenses."""
        return defense_history
    
    def get_current_baseline(self) -> float:
        """Get the current baseline detection rate."""
        return self._calculate_dynamic_baseline()
    
    def deploy_defense(self, defense_id: str) -> Dict:
        """Mark a defense as deployed and update baseline."""
        global current_baseline_rate
        
        # Find the defense in history
        defense = next((d for d in defense_history if d["id"] == defense_id), None)
        if defense:
            # Update baseline (simulate deployed defense improving detection)
            improvement = defense["improvement"] * 0.3  # Partial improvement persists
            current_baseline_rate = min(current_baseline_rate + improvement, 45.0)
            
            defense["deployed"] = True
            defense["deployedAt"] = datetime.now().isoformat()
            
            return {
                "status": "deployed",
                "defenseId": defense_id,
                "newBaselineRate": current_baseline_rate,
                "persistentImprovement": improvement
            }
        
        return {"status": "error", "message": "Defense not found"}


defense_engine = DefenseEngine()
