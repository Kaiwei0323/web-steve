from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
import os
from dotenv import load_dotenv
import random
from datetime import datetime, timedelta
from pymongo import MongoClient
from bson import json_util
from bson.objectid import ObjectId
import json

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__, static_folder='../frontend', static_url_path='')

# Initialize MongoDB connection
mongo_uri = os.getenv("MONGODB_URI")
mongo_client = MongoClient(mongo_uri)
db = mongo_client['edge_ai_devices']  # Database name
# Initialize collection references
device_specs_collection = db['device_specifications']
device_apps_collection = db['device_applications']

# Configure CORS - Allow both development ports
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:8000", "http://localhost:5000", "http://127.0.0.1:8000", "http://127.0.0.1:5000"],
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type"]
    }
})

# Mock device data matching MongoDB structure
devices = [
    {
        "id": "device-67f4044ea91332165a91a8ab",
        "name": "NCOX",
        "model": "NCOX",
        "type": "ai_edge",
        "status": "disabled",  # Updated to match UI
        "lastSeen": (datetime.now() - timedelta(minutes=5)).isoformat(),
        "performance": 16,  # Actual TOPS value from specs
        "tag": "Best Seller",  # Add the tag field for NCOX
        "specs": {
            "processor": "NVIDIA Jetson Orin NX",
            "memory": "16GB/8GB LPDDR5",
            "storage": "External NVMe via x4 PCIe",
            "operating_system": "Linux 5.10/ Ubuntu 20.04",
            "networking": "RJ45 1 x Gigabit Ethernet",
            "io_interfaces": "1 x USB 2.0 Micro-B",
            "dimensions": "90(W) x 118(D) x 69(H) mm",
            "weight": "650g",
            "power_input": "1 x DC-In 12~19V",
            "operating_temperature": "-20 ~ 60°C"
        },
        "applications": [
            "Smart Surveillance",
            "Industrial Quality Inspection"
        ]
    },
    {
        "id": "device-67f4044ea91332165a91a8ac",
        "name": "NCON",
        "model": "NCON",
        "type": "ai_edge",
        "status": "enabled",  # Updated to match UI
        "lastSeen": (datetime.now() - timedelta(minutes=15)).isoformat(),
        "performance": 8,  # Actual TOPS value from specs
        "specs": {
            "processor": "NVIDIA Jetson Orin Nano",
            "memory": "8GB/4GB LPDDR5",
            "storage": "External NVMe via x4 PCIe",
            "operating_system": "Linux 5.10/ Ubuntu 20.04",
            "networking": "RJ45 1 x Gigabit Ethernet",
            "io_interfaces": "1 x USB 2.0 Micro-B",
            "dimensions": "90(W) x 118(D) x 69(H) mm",
            "weight": "750g",
            "power_input": "1 x DC-In 12~19V",
            "operating_temperature": "-20 ~ 60°C"
        },
        "applications": [
            "Building Monitoring and Management",
            "Optimize Energy Usage",
            "Urban Infrastructure Management"
        ]
    },
    {
        "id": "device-67f4044ea91332165a91a8ae",
        "name": "PSON",
        "model": "PSON",
        "type": "ai_edge",
        "status": "enabled",  # Updated to match UI
        "lastSeen": (datetime.now() - timedelta(hours=1)).isoformat(),
        "performance": 8,  # Actual TOPS value
        "specs": {
            "processor": "NVIDIA Jetson Orin Nano",
            "memory": "8GB/4GB LPDDR5",
            "storage": "External NVMe via x4 PCIe",
            "operating_system": "Linux 5.10/ Ubuntu 20.04",
            "networking": "RJ45 2 x Gigabit Ethernet",
            "io_interfaces": "1 x USB 2.0 Micro-B",
            "dimensions": "94(W) x 157(L) x 77.75 (H) mm",
            "weight": "888g",
            "power_input": "1 x DC-In 12~19V",
            "operating_temperature": "-20 ~ 60°C"
        },
        "applications": [
            "Industrial Quality Inspection",
            "Manufacturing Optimization",
            "Predictive Maintenance"
        ]
    },
    {
        "id": "device-67f4044ea91332165a91a8af",
        "name": "PSOX",
        "model": "PSOX",
        "type": "ai_edge",
        "status": "disabled",  # Updated to match UI
        "lastSeen": (datetime.now() - timedelta(hours=2)).isoformat(),
        "performance": 16,  # Actual TOPS value
        "specs": {
            "processor": "NVIDIA Jetson Orin NX",
            "memory": "16GB/8GB LPDDR5",
            "storage": "External NVMe via x4 PCIe",
            "operating_system": "Linux 5.10/ Ubuntu 20.04",
            "networking": "RJ45 2 x Gigabit Ethernet",
            "io_interfaces": "1 x USB 2.0 Micro-B",
            "dimensions": "94(W) x 157(L) x 77.75 (H) mm",
            "weight": "888g",
            "power_input": "1 x DC-In 12~19V",
            "operating_temperature": "-20 ~ 60°C"
        },
        "applications": [
            "Smart Surveillance",
            "Industrial Quality Inspection",
            "Retail Analytics",
            "Traffic Violation Detection"
        ]
    }
]

@app.route('/')
def serve_frontend():
    """Serve the frontend index.html file"""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/test', methods=['GET'])
def test_endpoint():
    """Test endpoint to verify API is working"""
    return jsonify({
        "status": "success",
        "message": "API is working correctly"
    })

@app.route('/api/devices', methods=['GET'])
def get_devices():
    """Temporary endpoint returning mock device data"""
    # Update last seen times and randomize performance a bit
    for device in devices:
        if device["status"] == "enabled":  # Fixed condition to match UI
            device["lastSeen"] = (datetime.now() - timedelta(minutes=random.randint(1, 30))).isoformat()
            # Add some random fluctuation to performance
            device["performance"] = max(0, min(100, device["performance"] + random.randint(-5, 5)))
            
    # Make a deep copy to avoid modifying the original
    devices_copy = json.loads(json.dumps(devices))
    
    # Debug the final devices data before returning
    print(f"Returning {len(devices_copy)} devices")
    
    return jsonify(devices_copy)

@app.route('/api/devices/mongodb', methods=['GET'])
def get_mongodb_devices():
    """Get all devices from MongoDB"""
    try:
        # Fetch all documents from the device_specifications collection
        devices_specs = list(device_specs_collection.find({}, {
            # Basic fields
            "deviceName": 1,
            "Category": 1,
            "Processor": 1,
            "AI Performance": 1, 
            "Memory": 1,
            "Storage": 1,
            "OS": 1,
            "Wireless": 1,
            "WLAN": 1,
            "BT": 1,
            "Ethernet": 1,
            "Camera": 1,
            "I/O": 1,
            "Button": 1,
            "Operating Tempeture": 1,
            "Dimension": 1,
            "Weight": 1,
            "Power": 1,
            "Super Mode": 1,
            "tag": 1,  # Include the tag field
            "description_summary": 1,  # Include the description_summary field
            "_id": 1  # Include the MongoDB ID
        }))
        
        print(f"Fetched {len(devices_specs)} devices")
        
        # For each device, fetch and combine its applications
        for device in devices_specs:
            device_id = str(device['_id'])
            
            # Find applications for this device by device_id
            apps = device_apps_collection.find_one({'device_id': device_id})
            
            # Add applications to device data
            if apps and 'applications' in apps:
                # Extract just the names of the applications
                device['applications'] = [app['name'] for app in apps['applications']]
            else:
                device['applications'] = []
                
            # Add status based on Super Mode
            super_mode = device.get('Super Mode')
            print(f"Device: {device.get('deviceName')}, Super Mode value: {super_mode}")
            
            device['status'] = 'enabled' if super_mode == 'Enable' else 'disabled'
            device['formatted_status'] = 'Super Mode: Enabled' if super_mode == 'Enable' else 'Super Mode: Disabled'
            
            print(f"Status set to: {device['status']}, Formatted status: {device['formatted_status']}")
            
            # Extract TOPS value from AI Performance
            ai_perf = device.get('AI Performance', '')
            print(f"Processing AI Performance for {device.get('deviceName')}: {ai_perf}")
            
            if isinstance(ai_perf, str):
                # Try different patterns to extract the performance value
                import re
                
                # Pattern 1: Look for "Up to X" or "Up to X TOPS"
                up_to_match = re.search(r'Up to (\d+)(?:\s*TOPS)?', ai_perf, re.IGNORECASE)
                if up_to_match:
                    device['performance'] = int(up_to_match.group(1))
                    print(f"Found performance from 'Up to' pattern: {device['performance']}")
                    continue
                    
                # Pattern 2: Look for just the number followed by TOPS
                tops_match = re.search(r'(\d+)\s*TOPS', ai_perf, re.IGNORECASE)
                if tops_match:
                    device['performance'] = int(tops_match.group(1))
                    print(f"Found performance from 'TOPS' pattern: {device['performance']}")
                    continue
                    
                # Pattern 3: Look for any number in the string
                numbers = re.findall(r'\d+', ai_perf)
                if numbers:
                    # Use the largest number found
                    device['performance'] = max(map(int, numbers))
                    print(f"Found performance from numbers pattern: {device['performance']}")
                    continue
                    
                # If no patterns match, set to 0
                device['performance'] = 0
                print(f"No performance number found in string, defaulting to 0")
            else:
                # If AI Performance is not a string, try to convert it to int
                try:
                    device['performance'] = int(ai_perf)
                    print(f"Converted non-string performance: {device['performance']}")
                except (ValueError, TypeError):
                    device['performance'] = 0
                    print(f"Failed to convert non-string performance, defaulting to 0")
            
            # Add type
            device['type'] = 'ai_edge'
            
            # Add model same as deviceName
            device['model'] = device.get('deviceName', '')
            
            # Add name same as deviceName
            device['name'] = device.get('deviceName', '')
            
            # Add lastSeen
            device['lastSeen'] = (datetime.now() - timedelta(minutes=random.randint(1, 30))).isoformat()
                
        # Convert to JSON using bson's json_util to handle ObjectId
        return json_util.dumps(devices_specs), 200, {'Content-Type': 'application/json'}
    except Exception as e:
        print(f"Error in get_mongodb_devices: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch devices: {str(e)}"
        }), 500

@app.route('/api/devices/specifications/<device_id>', methods=['GET'])
def get_device_specifications(device_id):
    """Get device specifications from MongoDB"""
    try:
        # Find the device by ID
        specs = device_specs_collection.find_one({'device_id': device_id})
        if specs:
            # Remove MongoDB's _id field before sending
            specs.pop('_id', None)
            return jsonify(specs), 200
        
        # Try finding by ObjectId if device_id lookup failed
        try:
            specs = device_specs_collection.find_one({'_id': ObjectId(device_id)})
            if specs:
                # Convert _id to string to make it JSON-serializable
                specs['_id'] = str(specs['_id'])
                
                # Ensure description_summary is included in the response
                # If it's not present in the database, set it to null
                if 'description_summary' not in specs:
                    specs['description_summary'] = None
                    
                return jsonify(specs), 200
        except Exception as inner_e:
            print(f"Error finding by ObjectId: {str(inner_e)}")
            
        return jsonify({'error': 'Specifications not found'}), 404
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to fetch specifications: {str(e)}'
        }), 500

@app.route('/api/devices/applications/<device_id>', methods=['GET'])
def get_device_applications(device_id):
    """Get device applications from MongoDB"""
    try:
        print(f'Fetching applications for device ID: {device_id}')
        
        # First try to find applications directly by device_id
        apps = device_apps_collection.find_one({'device_id': device_id})
        print(f'Found applications by device_id: {apps}')
        
        if apps and 'applications' in apps:
            # Return the applications array directly
            return jsonify({
                'applications': apps['applications']
            }), 200
        
        # If not found, try to find the device in specifications
        try:
            device = device_specs_collection.find_one({'_id': ObjectId(device_id)})
            if device:
                device_id = str(device['_id'])
                apps = device_apps_collection.find_one({'device_id': device_id})
                if apps and 'applications' in apps:
                    return jsonify({
                        'applications': apps['applications']
                    }), 200
        except Exception as e:
            print(f'Error finding device by ObjectId: {str(e)}')
        
        # If no applications found, return default applications based on device type
        device = device_specs_collection.find_one({'_id': ObjectId(device_id)})
        if device:
            device_type = 'server' if 'Server' in device.get('deviceName', '') else 'edge'
            default_apps = []
            
            if device_type == 'server':
                default_apps = [
                    "High-Performance Computing",
                    "Data Center Operations",
                    "Cloud Services",
                    "Enterprise AI Solutions"
                ]
            else:
                default_apps = [
                    "Smart Surveillance",
                    "Industrial Quality Inspection",
                    "Edge Computing"
                ]
            
            return jsonify({
                'applications': default_apps
            }), 200
        
        # If still nothing found, return empty list
        print(f'No applications found for device: {device_id}')
        return jsonify({
            'applications': []
        }), 200
        
    except Exception as e:
        print(f'Error fetching applications: {str(e)}')
        print(f'Error type: {type(e)}')
        import traceback
        print(f'Traceback: {traceback.format_exc()}')
        return jsonify({
            'status': 'error',
            'message': f'Failed to fetch applications: {str(e)}'
        }), 500

@app.route('/api/devices/with-tags', methods=['GET'])
def get_devices_with_tags():
    """
    Get all devices from MongoDB with consistently formatted tags.
    This endpoint ensures:
    1. The tag field is always included (null if no tag)
    2. Tag values are returned in lowercase format
    3. Tag case mismatches (Tag vs. tag) are handled
    """
    try:
        # Fetch all documents from the device_specifications collection
        devices_specs = list(device_specs_collection.find({}))
        
        print(f"Fetched {len(devices_specs)} devices for the with-tags endpoint")
        
        # Process each device to handle tag field consistently
        for device in devices_specs:
            # Convert MongoDB ObjectId to string for JSON serialization
            device['_id'] = str(device['_id'])
            
            # Check for both lowercase and uppercase tag fields
            tag_value = None
            
            # Check if any tag field exists (lowercase or uppercase)
            if 'tag' in device:
                tag_value = device['tag']
            elif 'Tag' in device:
                tag_value = device['Tag']
                # Remove uppercase Tag to avoid confusion
                device.pop('Tag', None)
            
            # Always include the tag field, even if null
            device['tag'] = tag_value
            
            # Ensure the tag is lowercase if it has a value
            if device['tag'] is not None:
                device['tag'] = device['tag'].lower()
            
            # Fetch and add applications
            device_id = device['_id']
            apps = device_apps_collection.find_one({'device_id': device_id})
            
            if apps and 'applications' in apps:
                device['applications'] = [app['name'] for app in apps['applications']]
            else:
                device['applications'] = []
            
            # Handle device name and formatted name
            if 'deviceName' in device:
                # Set formattedName based on deviceName (without making assumptions about format)
                device['formattedName'] = device['deviceName']
            else:
                # If deviceName doesn't exist, use a placeholder or ID
                device['deviceName'] = f"Unknown Device ({device['_id']})"
                device['formattedName'] = device['deviceName']
            
            # Include description field if available
            if 'description' not in device:
                device['description'] = None
        
        # Convert to JSON and return
        return json_util.dumps(devices_specs), 200, {'Content-Type': 'application/json'}
        
    except Exception as e:
        print(f"Error in get_devices_with_tags: {str(e)}")
        import traceback
        print(f'Traceback: {traceback.format_exc()}')
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch devices with tags: {str(e)}"
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True) 