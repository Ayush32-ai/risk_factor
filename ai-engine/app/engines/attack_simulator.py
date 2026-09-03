"""Red-team attack simulator — evolves attack patterns to find blind spots."""

import random
import os
import json
from typing import Dict, List

try:
    import redis as _redis_lib
except Exception:
    _redis_lib = None


ATTACK_SCENARIOS = {
    "Distributed Account Network": {
        "base_detection": 85.0,  # Starts with good detection
        "evolution_rate": -5.0,   # Loses 5% per generation
        "max_evolution": 35,      # Max 35% reduction
        "variance": 20,           # ±20% random variation
        "tx_multiplier": 5000,
        "account_multiplier": 25,
        "blind_spot_threshold": 20,  # Conservative threshold
    },
    "Refund Loop Exploitation": {
        "base_detection": 90.0,  # Easier to detect initially
        "evolution_rate": -4.0,   # Slower evolution
        "max_evolution": 30,
        "variance": 15,
        "tx_multiplier": 3000,
        "account_multiplier": 15,
        "blind_spot_threshold": 25,
    },
    "Merchant Cluster Abuse": {
        "base_detection": 75.0,  # Moderate starting detection
        "evolution_rate": -7.0,   # Moderate evolution
        "max_evolution": 40,
        "variance": 25,
        "tx_multiplier": 4000,
        "account_multiplier": 20,
        "blind_spot_threshold": 30,  # Higher threshold - easier to find blind spots
    },
    "Velocity Limit Bypass": {
        "base_detection": 88.0,
        "evolution_rate": -3.0,   # Very slow evolution - well understood attack
        "max_evolution": 25,
        "variance": 12,
        "tx_multiplier": 6000,
        "account_multiplier": 30,
        "blind_spot_threshold": 15,  # Very conservative
    },
    "Device Fingerprint Rotation": {
        "base_detection": 70.0,  # Hardest to detect from start
        "evolution_rate": -8.0,   # Fast evolution
        "max_evolution": 45,
        "variance": 22,
        "tx_multiplier": 2000,
        "account_multiplier": 10,
        "blind_spot_threshold": 35,  # Highest threshold
    },
}


class AttackSimulator:
    def __init__(self):
        self.current_simulation = None
        # Try to load persisted simulation from Redis if available
        try:
            redis_url = os.environ.get('REDIS_URL')
            if _redis_lib and redis_url:
                try:
                    client = _redis_lib.from_url(redis_url, decode_responses=True)
                    raw = client.get('sentinel:current_simulation')
                    if raw:
                            try:
                                self.current_simulation = json.loads(raw)
                                print('✓ Loaded persisted attack simulation from Redis in AI engine')
                            except Exception:
                                # Try to recover from legacy/malformed format like {id:sim-123,...}
                                try:
                                    def parse_legacy(s: str):
                                        cleaned = s.strip().lstrip('{').rstrip('}').strip()
                                        parts = [p for p in cleaned.split(',') if ':' in p]
                                        out = {}
                                        for p in parts:
                                            k, v = p.split(':', 1)
                                            key = k.strip().strip('"').strip("'")
                                            val = v.strip().strip('"').strip("'")
                                            if val.lower() in ('true', 'false'):
                                                out[key] = val.lower() == 'true'
                                            else:
                                                try:
                                                    out[key] = int(val)
                                                except Exception:
                                                    try:
                                                        out[key] = float(val)
                                                    except Exception:
                                                        out[key] = val
                                        return out

                                    parsed = parse_legacy(raw)
                                    # normalize
                                    if 'detectionRate' in parsed and 'detection_rate' not in parsed:
                                        parsed['detection_rate'] = parsed['detectionRate']
                                    self.current_simulation = parsed
                                    print('✓ Recovered persisted attack simulation (legacy format) in AI engine')
                                    # attempt to rewrite normalized JSON back to Redis
                                    try:
                                        client.set('sentinel:current_simulation', json.dumps(self.current_simulation))
                                        print('✓ Rewrote normalized simulation to Redis from AI engine')
                                    except Exception as e:
                                        print('⚠ Could not rewrite normalized simulation to Redis from AI engine', e)
                                except Exception as e2:
                                    print('⚠ Could not parse persisted simulation in AI engine:', e2)
                except Exception as e:
                    print('⚠ Could not load persisted simulation from Redis in AI engine:', e)
        except Exception:
            pass
    
    def simulate(self, scenario: str, generation: int = 1) -> Dict:
        config = ATTACK_SCENARIOS.get(scenario, ATTACK_SCENARIOS["Distributed Account Network"])
        
        # Calculate detection rate with realistic progression
        evolution_reduction = min(generation * abs(config["evolution_rate"]), config["max_evolution"])
        random_variation = (random.random() - 0.5) * config["variance"]
        detection_rate = max(5.0, min(95.0, 
            config["base_detection"] - evolution_reduction + random_variation
        ))
        detection_rate = round(detection_rate, 1)
        
        # Intelligent blind spot calculation
        threshold = config["blind_spot_threshold"]
        generation_bonus = min(generation * 1.5, 8)  # Max 8% bonus at gen 5+
        adjusted_threshold = threshold + generation_bonus
        random_factor = (random.random() - 0.5) * 15  # ±7.5% random variation
        final_threshold = adjusted_threshold + random_factor
        
        # Additional random chance - sometimes attacks just fail
        random_failure = random.random() < 0.15  # 15% chance attack fails
        blind_spot_discovered = False
        if not (random_failure and detection_rate > threshold * 0.7):
            blind_spot_discovered = detection_rate < final_threshold

        result = {
            "id": f"sim-{random.randint(1000, 9999)}",
            "target": "Payment Risk Engine",
            "scenario": scenario,
            "generation": generation,
            "transactions_count": config["tx_multiplier"] * generation + random.randint(1000, 15000),
            "accounts_count": config["account_multiplier"] * generation + random.randint(20, 80),
            "merchants_count": random.randint(15, 45),
            "detection_rate": detection_rate,
            "status": "running",
            "blind_spot_discovered": blind_spot_discovered,
            "start_time": "2024-08-24T02:00:00Z",
            "metrics": {
                "accounts_compromised": int(config["account_multiplier"] * generation),
                "velocity_violations": int(15 * generation),
                "failed_attempts": int(50 * generation),
                "synthetic_accounts": int(8 * generation),
                "suspicious_refunds": int(12 * generation),
                "device_switches": int(20 * generation),
                "rapid_transactions": int(30 * generation),
                "testing_attempts": int(40 * generation)
            }
        }
        
        # Store as current simulation
        self.current_simulation = result
        return result

    def get_current_simulation(self) -> Dict:
        """Get the current running simulation."""
        return self.current_simulation

    def evolve(self, current: Dict) -> Dict:
        return self.simulate(current["scenario"], current.get("generation", 1) + 1)


attack_simulator = AttackSimulator()
