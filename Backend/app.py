from flask import Flask, jsonify
from flask_cors import CORS
import psycopg2

app = Flask(__name__)
CORS(app)

def get_db():
    conn = psycopg2.connect(
        host="localhost",
        database="ecometer",
        user="postgres",
        password="ecometer123"  # change to your password
    )
    return conn

@app.route('/')
def home():
    return 'EcoMeter Backend is running!'

@app.route('/api/meter-data')
def get_meter_data():
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT * FROM meter_data LIMIT 100")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify(rows)
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/attacked-data')
def get_attacked_data():
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT * FROM attacked_meter_data LIMIT 100")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify(rows)
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/detection-results')
def get_detection_results():
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT * FROM detection_results LIMIT 100")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify(rows)
    except Exception as e:
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True)