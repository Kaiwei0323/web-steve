# AI Edge Device Tracker

A modern web application for tracking and managing AI edge devices with a responsive UI and Python Flask backend.

## Project Structure

```
.
├── frontend/
│   ├── index.html
│   └── static/
│       ├── css/
│       │   └── styles.css
│       └── js/
│           └── main.js
└── backend/
    ├── api/
    ├── models/
    ├── controllers/
    ├── tests/
    ├── app.py
    └── requirements.txt
```

## Setup Instructions

### Backend Setup

1. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate  # Windows
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the Flask application:
   ```bash
   python app.py
   ```
   The backend will start on http://localhost:5000

### Frontend Setup

1. The frontend is static HTML/JS/CSS and can be served using any web server.
2. For development, you can use Python's built-in HTTP server:
   ```bash
   cd frontend
   python -m http.server 8000
   ```
   The frontend will be available at http://localhost:8000

## Testing

To run the tests:
```bash
pytest
```

## Features

- Modern, responsive UI using Bootstrap 5
- Real-time device status monitoring
- Search and filter capabilities
- Data export functionality
- Interactive charts using Chart.js
- RESTful API backend

## Development

- Frontend: HTML5, CSS3, JavaScript (ES6+), Bootstrap 5, Chart.js
- Backend: Python Flask, MongoDB
- API Documentation: Coming soon 

## API Endpoints

### `/api/test` (GET)
A simple test endpoint to verify that the API is working.

### `/api/devices` (GET)
Returns mock device data. This endpoint is for development purposes only.

### `/api/devices/mongodb` (GET)
Returns all devices from the MongoDB database. This includes device specifications and applications.

### `/api/devices/with-tags` (GET)
Returns all devices from MongoDB with consistent tag formatting. This endpoint ensures:
1. The tag field is always included (null if no tag is assigned)
2. Tag values are always returned in lowercase format
3. Tag case mismatches (Tag vs. tag) are handled properly

Sample response:
```json
[
  {
    "_id": "60d21b4667d0d8992e610c85",
    "deviceName": "NCOX",
    "tag": "best seller",
    "applications": ["Smart Surveillance", "Industrial Quality Inspection"],
    "formattedName": "Edge AI NCOX",
    "description": "High-performance edge computing device"
  },
  {
    "_id": "60d21b4667d0d8992e610c86",
    "deviceName": "NCON",
    "tag": null,
    "applications": ["Building Monitoring", "Energy Management"],
    "formattedName": "Edge AI NCON",
    "description": null
  }
]
```

### `/api/devices/specifications/<device_id>` (GET)
Returns the specifications for a specific device.

### `/api/devices/applications/<device_id>` (GET)
Returns the applications for a specific device. 