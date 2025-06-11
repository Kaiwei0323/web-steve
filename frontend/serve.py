
from flask import Flask, send_from_directory
from flask_cors import CORS
import os

app = Flask(__name__, static_folder='static')
CORS(app)

@app.route('/')
def serve_index():
    return send_from_directory('templates', 'specs.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

if __name__ == '__main__':
    app.run(port=8000, debug=True)
