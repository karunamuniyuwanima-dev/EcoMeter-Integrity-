EcoMeter Integrity
Cybersecurity Protection Framework for Smart Energy Meter Systems
Group 24 | CSG3101 | Edith Cowan University
Project Structure
- simulator/   → Smart meter data simulator (Verginiya)
- attack/      → FDIA attack simulation (Treveen)
- detection/   → Anomaly detection engine (Thisari)
- backend/     → Flask REST API and Dashboard (Shehani)
- database/    → PostgreSQL schema
  How to Run
Install dependencies:
pip install pandas numpy flask psycopg2-binary matplotlib

Run simulator:
python simulator/Simulation.py

Run attack module:
python attack/Fdia.py

Run detection engine:
python detection/detection_engine.py

Run backend:
python backend/app.py
