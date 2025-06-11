# AI Edge Device Tracker

A web application for monitoring and managing AI edge devices with interactive data visualizations and device management capabilities.

## Project Structure
```
edgeai-insight-html-js-v2/
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

## Setup Instructions

### Backend Setup
1. Navigate to the backend directory:
```bash
cd backend
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/Scripts/activate  # Windows
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Start the Flask server:
```bash
python app.py
```
The backend will run on http://localhost:5000

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