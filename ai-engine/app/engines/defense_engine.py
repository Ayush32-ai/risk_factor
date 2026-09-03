"""Defense generation engine — creates counter-measures for discovered blind spots using Groq AI."""

import httpx
import json
import time
import random
from typing import Dict, List, Optional
from datetime import datetime
from app.config import settings


# Dynamic defense templates with much more variability and attack-specific rules
DEFENSE_TEMPLATES = {
    "distributed_account_network": [
        {"name": "Cross-account velocity aggregation", "description": "Monitor transaction velocity across all accounts sharing device fingerprints", "impact": [18, 25]},
        {"name": "Device relationship scoring", "description": "Calculate risk scores based on device-account graph density and centrality", "impact": [15, 22]},
        {"name": "Merchant cluster correlation", "description": "Detect merchants receiving coordinated payments from account networks", "impact": [12, 20]},
        {"name": "Refund destination analysis", "description": "Track overlap between payment sources and refund destinations", "impact": [19, 26]},
        {"name": "Network density threshold", "description": "Block transactions when account network density exceeds dynamic baseline", "impact": [14, 18]},
        {"name": "Timing correlation detection", "description": "Identify synchronized transaction timing patterns across accounts", "impact": [16, 23]},
        {"name": "Behavioral homogeneity score", "description": "Flag accounts with suspiciously similar behavioral patterns", "impact": [13, 21]},
        {"name": "Geographic clustering analysis", "description": "Detect accounts claiming different locations but sharing network patterns", "impact": [17, 24]},
        {"name": "Payment method propagation", "description": "Track risk propagation through shared payment instruments", "impact": [15, 22]},
        {"name": "Session overlap detection", "description": "Identify accounts with overlapping session timings and behaviors", "impact": [18, 25]},
    ],
    "refund_loop": [
        {"name": "Circular refund detection", "description": "Detect A→B→C→A circular refund patterns using graph algorithms", "impact": [22, 28]},
        {"name": "Refund velocity rate limiting", "description": "Dynamic rate limits on refunds from high-risk account clusters", "impact": [15, 21]},
        {"name": "Cross-merchant refund tracking", "description": "Monitor refund patterns spanning multiple merchant boundaries", "impact": [13, 19]},
        {"name": "Refund destination validation", "description": "Block refunds to accounts within the same payment cluster", "impact": [20, 26]},
        {"name": "Temporal refund analysis", "description": "Detect unusual timing patterns in refund request sequences", "impact": [16, 23]},
        {"name": "Refund amount correlation", "description": "Flag refunds with amounts matching previous transaction patterns", "impact": [14, 20]},
        {"name": "Multi-hop refund tracking", "description": "Trace refund chains across multiple intermediary accounts", "impact": [19, 25]},
        {"name": "Refund network centrality", "description": "Identify central nodes in refund networks using PageRank algorithms", "impact": [17, 24]},
    ],
    "merchant_cluster": [
        {"name": "Merchant payment correlation", "description": "Detect coordinated payment patterns to merchant clusters", "impact": [17, 24]},
        {"name": "Merchant risk propagation", "description": "Propagate risk scores through merchant collaboration networks", "impact": [14, 20]},
        {"name": "Geographic merchant clustering", "description": "Flag merchants with suspicious geographic distribution patterns", "impact": [12, 18]},
        {"name": "Revenue sharing detection", "description": "Identify merchants with coordinated revenue distribution patterns", "impact": [19, 26]},
        {"name": "Cross-merchant timing analysis", "description": "Detect synchronized activity across merchant networks", "impact": [15, 22]},
        {"name": "Merchant network density", "description": "Monitor density of connections between high-risk merchants", "impact": [16, 23]},
        {"name": "Settlement pattern analysis", "description": "Analyze unusual settlement timing and distribution patterns", "impact": [18, 25]},
    ],
    "device_spoofing": [
        {"name": "Device fingerprint entropy validation", "description": "Validate authenticity using fingerprint entropy analysis", "impact": [20, 27]},
        {"name": "Behavioral device binding", "description": "Bind devices to consistent user behavioral fingerprints", "impact": [16, 22]},
        {"name": "Cross-device correlation analysis", "description": "Detect suspicious activity patterns across device switches", "impact": [18, 25]},
        {"name": "Device rotation frequency limits", "description": "Rate limit accounts with excessive device fingerprint changes", "impact": [17, 24]},
        {"name": "Hardware consistency validation", "description": "Validate consistency of reported hardware characteristics", "impact": [15, 21]},
        {"name": "Biometric binding verification", "description": "Cross-reference device changes with biometric behavioral patterns", "impact": [19, 26]},
        {"name": "Network fingerprint correlation", "description": "Correlate device fingerprints with network-level identifiers", "impact": [14, 20]},
    ],
    "velocity_attacks": [
        {"name": "Adaptive velocity thresholds", "description": "Dynamic velocity limits based on real-time risk profiling", "impact": [19, 26]},
        {"name": "Multi-dimensional velocity analysis", "description": "Velocity monitoring across amount, frequency, merchant, and geography", "impact": [17, 24]},
        {"name": "Burst pattern detection", "description": "Identify and block coordinated transaction burst patterns", "impact": [15, 21]},
        {"name": "Time-window correlation analysis", "description": "Detect velocity spikes across sliding time windows", "impact": [18, 25]},
        {"name": "Account cluster velocity limits", "description": "Aggregate velocity limits across linked account networks", "impact": [16, 23]},
        {"name": "Intelligent queuing system", "description": "Queue suspicious high-velocity transactions for enhanced review", "impact": [14, 20]},
        {"name": "Velocity anomaly scoring", "description": "ML-based scoring of velocity patterns against historical norms", "impact": [20, 27]},
    ],
    "default": [
        {"name": "Graph-based risk propagation", "description": "Propagate risk scores through transaction and relationship graphs", "impact": [18, 24]},
        {"name": "Behavioral anomaly ensemble", "description": "Ensemble ML models trained on diverse attack pattern datasets", "impact": [16, 22]},
        {"name": "Real-time cluster monitoring", "description": "Continuous monitoring for emerging fraudulent account clusters", "impact": [13, 19]},
        {"name": "Multi-signal fusion engine", "description": "Combine multiple risk signals using weighted ensemble methods", "impact": [15, 21]},
        {"name": "Temporal pattern recognition", "description": "Deep learning models for temporal fraud pattern recognition", "impact": [17, 23]},
        {"name": "Cross-entity relationship mining", "description": "Mine relationships between accounts, devices, and merchants", "impact": [14, 20]},
        {"name": "Adversarial pattern detection", "description": "Detect adversarial attempts to evade existing detection systems", "impact": [19, 26]},
        {"name": "Contextual risk assessment", "description": "Risk assessment considering transaction context and history", "impact": [16, 22]},
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
        """Select and randomize defense rules with dynamic impact values and better variety."""
        templates = DEFENSE_TEMPLATES.get(attack_pattern, DEFENSE_TEMPLATES["default"])
        
        # Ensure we have enough templates
        if len(templates) < rule_count:
            # If not enough specific templates, mix with default templates
            default_templates = DEFENSE_TEMPLATES["default"]
            all_templates = templates + [t for t in default_templates if t not in templates]
            templates = all_templates
        
        # Add timestamp-based randomization to ensure different selections each time
        import time
        current_time = int(time.time() * 1000) % 10000
        random.seed(current_time)  # Different seed each millisecond
        
        # Select random subset of rules (ensure different selection each time)
        selected_templates = random.sample(templates, min(rule_count, len(templates)))
        
        # Generate dynamic rules with randomized impacts and enhanced descriptions
        rules = []
        for i, template in enumerate(selected_templates):
            impact_range = template["impact"]
            actual_impact = random.randint(impact_range[0], impact_range[1])
            
            # Add variety to descriptions
            description_variants = [
                template["description"],
                f"Advanced {template['description'].lower()} with ML enhancement",
                f"Real-time {template['description'].lower()} using graph algorithms",
                f"Predictive {template['description'].lower()} with behavioral analysis"
            ]
            
            selected_description = random.choice(description_variants)
            
            # Add randomized rule name variations
            name_prefixes = ["Enhanced", "Adaptive", "Intelligent", "Advanced", "Dynamic", "Predictive"]
            name_suffixes = ["Engine", "Analyzer", "Detector", "Monitor", "Validator", "Guard"]
            
            # Sometimes use original name, sometimes enhance it
            if random.random() < 0.4:  # 40% chance to enhance name
                enhanced_name = f"{random.choice(name_prefixes)} {template['name']} {random.choice(name_suffixes)}"
            else:
                enhanced_name = template["name"]
            
            rules.append({
                "name": enhanced_name,
                "description": selected_description,
                "impact": actual_impact,
                "confidence": random.randint(85, 98),
                "generated_at": datetime.now().isoformat(),
                "source": "dynamic_template",
                "attack_pattern": attack_pattern,
                "rule_id": f"rule_{current_time}_{i}_{random.randint(100, 999)}"
            })
        
        print(f"DEBUG: Generated {len(rules)} dynamic rules for {attack_pattern}")
        for rule in rules:
            print(f"  - {rule['name']}: {rule['impact']}% impact")
        
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
            
            # Add timestamp and randomization to make each request unique
            import time
            session_id = f"def_{int(time.time() * 1000)}_{random.randint(1000, 9999)}"
            
            # Randomize prompt approach for more variety
            prompt_variants = [
                self._get_technical_prompt(attack_pattern, detection_rate, blind_spot_id, session_id),
                self._get_behavioral_prompt(attack_pattern, detection_rate, blind_spot_id, session_id),
                self._get_network_prompt(attack_pattern, detection_rate, blind_spot_id, session_id),
                self._get_ml_prompt(attack_pattern, detection_rate, blind_spot_id, session_id)
            ]
            
            # Select random prompt variant
            selected_prompt = random.choice(prompt_variants)
            
            # Randomize temperature for more variation
            temperature = random.uniform(0.8, 1.2)  # Higher temperature for more creativity
            
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    self.GROQ_BASE_URL,
                    headers={
                        "Authorization": f"Bearer {settings.ai_api_key}",
                        "Content-Type": "application/json",
                        "X-Session-ID": session_id  # Add session ID to prevent caching
                    },
                    json={
                        "model": "llama-3.1-70b-versatile",
                        "messages": [
                            {
                                "role": "system",
                                "content": f"You are a cybersecurity expert at Razorpay (Session: {session_id}). Generate UNIQUE, innovative defense rules. Never repeat previous suggestions. Always think creatively about new approaches to fraud detection and prevention."
                            },
                            {
                                "role": "user", 
                                "content": selected_prompt
                            }
                        ],
                        "temperature": temperature,
                        "max_tokens": 1500,
                        "top_p": 0.9,  # Add nucleus sampling for more variety
                        "seed": random.randint(1, 100000)  # Random seed for different outputs
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
                                    "source": "ai_generated",
                                    "session_id": session_id,
                                    "temperature": temperature
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

        # Fallback to dynamic templates with more randomization
        print("DEBUG: Falling back to dynamic templates")
        return self._select_dynamic_rules(attack_pattern, random.randint(3, 6))
    
    def _get_technical_prompt(self, attack_pattern: str, detection_rate: float, blind_spot_id: str, session_id: str) -> str:
        """Technical implementation-focused prompt."""
        return f"""
TECHNICAL DEFENSE GENERATION - Session {session_id}
Attack Vector: {attack_pattern}
Current Detection: {detection_rate}%
Blind Spot: {blind_spot_id}

As a senior fraud prevention engineer, design 4 technical countermeasures that could be deployed in production:

Focus Areas:
- Real-time stream processing algorithms
- Graph database queries and network analysis
- Machine learning model enhancements 
- API rate limiting and behavioral throttling
- Database indexing strategies for fraud detection

Technical Requirements:
- Must scale to millions of transactions/day
- Sub-100ms response times
- High precision (minimal false positives)
- Integration with existing payment infrastructure

Generate innovative technical solutions as JSON:
[
  {{"name": "Technical Rule Name", "description": "Implementation details with algorithms/tech stack", "impact": 15-25, "confidence": 85-95}}
]
"""

    def _get_behavioral_prompt(self, attack_pattern: str, detection_rate: float, blind_spot_id: str, session_id: str) -> str:
        """Behavioral analysis-focused prompt."""
        return f"""
BEHAVIORAL ANALYSIS DEFENSE - Session {session_id}
Attack Pattern: {attack_pattern}
Detection Rate: {detection_rate}%
Target: {blind_spot_id}

As a behavioral fraud analyst, create 4 defense rules based on user psychology and behavioral patterns:

Behavioral Indicators:
- Transaction timing and frequency patterns
- User interaction behaviors (clicks, pauses, form completion)
- Cross-device and cross-session behaviors
- Merchant selection patterns and preferences
- Geographic and temporal anomalies

Focus on:
- Subtle behavioral signatures that indicate coordination
- Unusual user journey patterns
- Deviation from normal customer lifecycles
- Social engineering indicators

Create behavioral detection rules as JSON:
[
  {{"name": "Behavioral Rule", "description": "User behavior analysis and detection logic", "impact": 12-28, "confidence": 80-98}}
]
"""

    def _get_network_prompt(self, attack_pattern: str, detection_rate: float, blind_spot_id: str, session_id: str) -> str:
        """Network and graph analysis-focused prompt."""
        return f"""
NETWORK ANALYSIS DEFENSE - Session {session_id}
Attack Type: {attack_pattern}
Current Performance: {detection_rate}%
Vulnerability: {blind_spot_id}

As a graph analytics expert, design 4 network-based detection mechanisms:

Graph Analysis Techniques:
- Community detection algorithms (Louvain, Label Propagation)
- Centrality measures (PageRank, Betweenness, Eigenvector)
- Graph neural networks for fraud detection
- Temporal graph analysis and evolution tracking
- Multi-layer network analysis (device, account, merchant layers)

Network Patterns:
- Hub and spoke structures
- Dense subgraph formations
- Bridge nodes connecting fraud clusters
- Temporal clustering patterns
- Cross-layer correlations

Design graph-based defenses as JSON:
[
  {{"name": "Network Rule", "description": "Graph algorithm and network analysis approach", "impact": 16-26, "confidence": 88-96}}
]
"""

    def _get_ml_prompt(self, attack_pattern: str, detection_rate: float, blind_spot_id: str, session_id: str) -> str:
        """Machine learning and AI-focused prompt."""
        return f"""
ML/AI DEFENSE STRATEGY - Session {session_id}  
Pattern: {attack_pattern}
Baseline: {detection_rate}%
Gap: {blind_spot_id}

As an ML engineer specializing in fraud AI, create 4 advanced ML-based defenses:

ML Approaches:
- Ensemble methods combining multiple algorithms
- Deep learning architectures (LSTM, Transformer, GNN)
- Unsupervised anomaly detection (Isolation Forest, DBSCAN)
- Real-time feature engineering and selection
- Transfer learning from other fraud domains

Advanced Techniques:
- Few-shot learning for new attack patterns
- Adversarial training against evolving attacks
- Explainable AI for model transparency
- Online learning and model adaptation
- Multi-modal learning (text, images, behavioral data)

Feature Engineering:
- Temporal aggregation features
- Cross-entity relationship features
- Embedding-based similarity features

Generate ML defense strategies as JSON:
[
  {{"name": "ML Rule", "description": "Machine learning algorithm and feature engineering details", "impact": 18-28, "confidence": 86-97}}
]
"""

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
        
        # Map frontend scenario names to internal pattern keys
        mapped_pattern = self._map_attack_scenario_to_pattern(attack_pattern)
        
        baseline_rate = current_detection_rate or self._calculate_dynamic_baseline()
        
        try:
            # Try to get AI-generated rules
            rules = asyncio.run(self._generate_ai_defense(blind_spot_id, mapped_pattern, baseline_rate))
        except Exception as e:
            print(f"Failed to generate AI defense: {e}")
            # Fallback to dynamic templates
            rules = self._select_dynamic_rules(mapped_pattern)
        
        # Simulate defense effectiveness
        simulation_results = self._simulate_defense_effectiveness(rules, baseline_rate)
        
        # Store in history
        defense_result = {
            "id": f"defense-{int(time.time())}",
            "blindSpotId": blind_spot_id,
            "attackPattern": attack_pattern,  # Keep original scenario name
            "existingDetectionRate": baseline_rate,
            "generatedRules": rules,
            "generatedAt": datetime.now().isoformat(),
            **simulation_results
        }
        
        defense_history.append(defense_result)
        
        return defense_result
    
    def _map_attack_scenario_to_pattern(self, scenario: str) -> str:
        """Map frontend attack scenarios to defense pattern keys."""
        mapping = {
            "Distributed Account Network": "distributed_account_network",
            "Refund Loop Exploitation": "refund_loop", 
            "Merchant Cluster Abuse": "merchant_cluster",
            "Velocity Limit Bypass": "velocity_attacks",
            "Device Fingerprint Rotation": "device_spoofing"
        }
        return mapping.get(scenario, "default")

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
