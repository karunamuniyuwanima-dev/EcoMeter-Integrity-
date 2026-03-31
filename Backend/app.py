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
        password="ecometer123"
    )
    return conn

@app.route('/')
def home():
    return 'EcoMeter Backend is running!'

if __name__ == '__main__':
    app.run(debug=True)