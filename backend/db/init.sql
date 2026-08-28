-- Razorpay Sentinel Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users & RBAC
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'analyst',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    event_description TEXT NOT NULL,
    actor VARCHAR(100) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blind spots
CREATE TABLE blind_spots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    detection_rate DECIMAL(5,2) NOT NULL,
    potential_exposure DECIMAL(15,2) NOT NULL,
    root_cause TEXT NOT NULL,
    ai_recommendation TEXT NOT NULL,
    attack_pattern VARCHAR(100),
    status VARCHAR(50) DEFAULT 'open',
    discovered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attack simulations
CREATE TABLE attack_simulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target VARCHAR(255) NOT NULL,
    scenario VARCHAR(255) NOT NULL,
    generation INT NOT NULL DEFAULT 1,
    transactions_count INT NOT NULL,
    accounts_count INT NOT NULL,
    merchants_count INT NOT NULL,
    detection_rate DECIMAL(5,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'running',
    blind_spot_discovered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Defense rules
CREATE TABLE defense_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rule_type VARCHAR(100) NOT NULL,
    before_detection_rate DECIMAL(5,2),
    after_detection_rate DECIMAL(5,2),
    status VARCHAR(50) DEFAULT 'draft',
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Risk metrics snapshots
CREATE TABLE risk_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_health DECIMAL(5,2) NOT NULL,
    transactions_tested BIGINT NOT NULL,
    blind_spots_count INT NOT NULL,
    critical_vulnerabilities INT NOT NULL,
    attacks_blocked_rate DECIMAL(5,2) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions (for graph)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    razorpay_payment_id VARCHAR(100),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(50) NOT NULL,
    device_fingerprint VARCHAR(255),
    user_id VARCHAR(100),
    account_id VARCHAR(100),
    merchant_id VARCHAR(100),
    risk_score DECIMAL(5,2) DEFAULT 0,
    is_flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default admin user (password: sentinel123)
-- Hash generated with: bcrypt.hash('sentinel123', 10)
INSERT INTO users (email, password_hash, name, role) VALUES
('admin@razorpay.com', '$2a$10$qWsT77mxZuqmLZfdIs7UN.PBK5nbvY9XQ0m2wVHC7rIyptcTB8nuK', 'Sentinel Admin', 'admin'),
('analyst@razorpay.com', '$2a$10$qWsT77mxZuqmLZfdIs7UN.PBK5nbvY9XQ0m2wVHC7rIyptcTB8nuK', 'Risk Analyst', 'analyst');

-- Seed risk metrics
INSERT INTO risk_metrics (model_health, transactions_tested, blind_spots_count, critical_vulnerabilities, attacks_blocked_rate) VALUES
(94.7, 2800000, 137, 12, 96.3);

-- Seed blind spots
INSERT INTO blind_spots (title, severity, detection_rate, potential_exposure, root_cause, ai_recommendation, attack_pattern) VALUES
('Distributed Transaction Network', 'critical', 18.0, 4270000, 'Risk engine evaluates transactions individually without cross-account graph analysis.', 'Add cross-account graph velocity checks and device relationship scoring.', 'distributed_account_network'),
('Refund Loop Exploitation', 'critical', 22.5, 1850000, 'Refund destination validation does not check for cluster overlap with originating accounts.', 'Implement refund graph analysis to detect circular refund patterns.', 'refund_loop'),
('Merchant Cluster Abuse', 'high', 31.2, 920000, 'Merchant risk scoring lacks network-level cluster detection.', 'Add merchant cluster score based on shared device and account patterns.', 'merchant_cluster'),
('Velocity Blind Spot', 'high', 35.8, 650000, 'Per-account velocity limits do not aggregate across linked devices.', 'Implement cross-device velocity aggregation.', 'velocity_bypass'),
('Device Fingerprint Rotation', 'medium', 42.1, 380000, 'Device fingerprint changes are not correlated with account behavior shifts.', 'Track device fingerprint evolution patterns.', 'device_rotation');

-- Seed audit logs
INSERT INTO audit_logs (event_type, event_description, actor, created_at) VALUES
('simulation_started', 'Attack simulation started — Distributed Account Network', 'AI', NOW() - INTERVAL '5 minutes'),
('blind_spot_discovered', 'Blind spot discovered: Distributed Transaction Network (18% detection)', 'AI', NOW() - INTERVAL '4 minutes'),
('defense_generated', 'AI generated defense: cross-account velocity + device relationship score', 'AI', NOW() - INTERVAL '3 minutes'),
('defense_simulation', 'Defense simulation started — 10,000 attack re-runs', 'AI', NOW() - INTERVAL '2 minutes'),
('defense_approved', 'Defense rules approved for deployment', 'Admin', NOW() - INTERVAL '1 minute'),
('model_updated', 'Risk model updated with new defense rules', 'System', NOW());

CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_blind_spots_severity ON blind_spots(severity);
CREATE INDEX idx_transactions_risk_score ON transactions(risk_score DESC);
