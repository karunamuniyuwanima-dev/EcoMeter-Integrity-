-- EcoMeter Integrity Database Schema
-- Created by Shehani Navodya (Frontend/Backend Developer)

-- Drop tables if they exist
DROP TABLE IF EXISTS anomaly_results;
DROP TABLE IF EXISTS meter_readings;
DROP TABLE IF EXISTS smart_meters;

-- Smart Meters Table
CREATE TABLE smart_meters (
    id SERIAL PRIMARY KEY,
    meter_id VARCHAR(50) UNIQUE NOT NULL,
    location VARCHAR(100),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Meter Readings Table
CREATE TABLE meter_readings (
    id SERIAL PRIMARY KEY,
    meter_id VARCHAR(50) REFERENCES smart_meters(meter_id),
    timestamp TIMESTAMP NOT NULL,
    energy_kwh FLOAT,
    voltage FLOAT,
    current FLOAT,
    power_factor FLOAT,
    temperature FLOAT,
    status VARCHAR(50),
    is_attack BOOLEAN DEFAULT FALSE,
    attack_type VARCHAR(50),
    attacked_kwh FLOAT,
    diff_pct FLOAT
);

-- Anomaly Results Table
CREATE TABLE anomaly_results (
    id SERIAL PRIMARY KEY,
    meter_id VARCHAR(50) REFERENCES smart_meters(meter_id),
    timestamp TIMESTAMP NOT NULL,
    energy_kwh FLOAT,
    reading_kwh FLOAT,
    detected INT,
    risk_score FLOAT,
    risk_level VARCHAR(50),
    rule_triggered VARCHAR(100),
    ground_truth INT,
    detection_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);