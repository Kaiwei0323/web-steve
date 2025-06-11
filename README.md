# AI Edge Device Tracker

A web application for monitoring and managing AI edge devices with interactive data visualizations and device management capabilities.

---

## Project Structure
```
web-steve/
├── frontend/
│   ├── static/
│   │   ├── css/
│   │   ├── js/
│   │   └── img/
│   └── index.html
└── backend/
    ├── app.py
    └── requirements.txt
```

---

## Software Environments
- Python 3.10
- flask
- flask_cors
- dotenv
- pymongo[srv]

---

## Setup Instructions

### Clone the Repository
```
git clone https://github.com/Kaiwei0323/web-steve.git
```

### Backend Setup
1. Navigate to the backend directory:
```bash
cd web-steve/backend
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Start the Flask server:
```bash
python app.py
```
The backend will run on http://localhost:5000

### Use Docker Container
```
docker build -t web-steve .
docker run -p 5000:5000 --env-file backend/.env web-steve
```

### Frontend Setup
1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Start the development server:
```bash
python -m http.server 8000
```
The frontend will be available at http://localhost:8000

## Features
- Real-time device monitoring
- Interactive data visualizations with Chart.js
- Search and filter capabilities
- Export data in multiple formats (XLSX, CSV, PDF)
- Responsive design using Bootstrap 5 
