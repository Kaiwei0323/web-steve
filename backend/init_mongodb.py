from pymongo import MongoClient
from bson import ObjectId
import json

"""
MongoDB Initialization Script for Edge AI Insight

IMPORTANT NOTES ON DEVICE TAGS:
-------------------------------
1. Tags for devices in MongoDB should follow these rules:
   - If a device should display a tag, add a "tag" field with a non-empty string value
   - If a device should NOT display a tag, either:
     a) Set tag field to null
     b) Set tag field to empty string ""
     c) Omit the tag field entirely

2. The frontend will ONLY display tags for devices where:
   - The tag property exists
   - The tag value is not null
   - The tag value is not an empty string

3. These rules apply to ALL devices, including NCOX and any future devices

When adding new devices to the database, please follow these tag guidelines
to ensure consistent behavior across the application.
"""

# Initialize MongoDB connection
client = MongoClient("MONGODB_URI")
db = client['edge_ai_devices']

def init_applications():
    try:
        # First, get all devices from specifications to map their IDs
        device_specs = list(db.device_specifications.find())
        device_name_to_id = {
            device.get('deviceName', ''): str(device['_id'])
            for device in device_specs
        }
        
        # Load applications from JSON file
        with open('docs/Spec Table & MongoDB import/Updated Files/edge_devices_applications.json', 'r') as f:
            apps_data = json.load(f)
            
        # Clear existing applications
        db.device_applications.delete_many({})
        
        # Transform and insert applications
        for app_data in apps_data:
            device_name = app_data['deviceName']
            device_id = device_name_to_id.get(device_name)
            
            if device_id:
                # Transform simple application names into detailed objects
                applications = [
                    {
                        'name': app_name,
                        'type': get_app_type(app_name),
                        'description': get_app_description(app_name)
                    }
                    for app_name in app_data['applications']
                ]
                
                # Insert with device_id
                db.device_applications.insert_one({
                    'device_id': device_id,
                    'deviceName': device_name,  # Keep deviceName for reference
                    'applications': applications
                })
                print(f"Added applications for {device_name} (ID: {device_id})")
            else:
                print(f"Warning: No device ID found for {device_name}")
        
        print("\nApplications data initialized successfully!")
        
        # Verify the data
        print("\nVerifying applications data:")
        for app in db.device_applications.find():
            print(f"Device ID: {app['device_id']}")
            print(f"Device Name: {app['deviceName']}")
            print(f"Number of applications: {len(app['applications'])}")
            print("Applications:", app['applications'])
            print("-" * 50)
            
    except Exception as e:
        print(f"Error initializing applications: {str(e)}")
        import traceback
        print(traceback.format_exc())

def get_app_type(app_name):
    """Map application names to types"""
    type_mapping = {
        'Smart Surveillance': 'surveillance',
        'Industrial Quality Inspection': 'industrial',
        'Building Monitoring and Management': 'building',
        'Optimize Energy Usage': 'energy',
        'Urban Infrastructure Management': 'infrastructure',
        'Manufacturing Optimization': 'manufacturing',
        'Predictive Maintenance': 'maintenance',
        'Retail Analytics': 'retail',
        'Traffic Violation Detection': 'traffic',
        'Customer Behavior Analytics': 'retail',
        'Autonomous Mobile Robot (AMR)': 'robotics',
        'Real-Time Navigation': 'navigation',
        'Automation Efficiency': 'automation',
        'Fleet Management': 'fleet',
        'Autonomous Driving': 'automotive',
        'Healthcare and Medical': 'healthcare',
        'Industrial Automation': 'industrial',
        'Real-Time AI Computation': 'computation'
    }
    return type_mapping.get(app_name, 'other')

def get_app_description(app_name):
    """Map application names to descriptions"""
    description_mapping = {
        'Smart Surveillance': 'Advanced video analytics for security monitoring',
        'Industrial Quality Inspection': 'AI-powered manufacturing quality control',
        'Building Monitoring and Management': 'Intelligent building systems and security',
        'Optimize Energy Usage': 'Smart energy management and optimization',
        'Urban Infrastructure Management': 'City infrastructure monitoring and control',
        'Manufacturing Optimization': 'Enhanced manufacturing process control',
        'Predictive Maintenance': 'AI-driven equipment maintenance prediction',
        'Retail Analytics': 'Customer behavior and retail performance analysis',
        'Traffic Violation Detection': 'Automated traffic monitoring and enforcement',
        'Customer Behavior Analytics': 'In-depth analysis of customer patterns and behaviors',
        'Autonomous Mobile Robot (AMR)': 'Self-navigating robots for industrial applications',
        'Real-Time Navigation': 'Dynamic path planning and obstacle avoidance',
        'Automation Efficiency': 'Optimized automation systems for improved productivity',
        'Fleet Management': 'Real-time vehicle tracking and logistics optimization',
        'Autonomous Driving': 'Self-driving vehicle control and navigation',
        'Healthcare and Medical': 'Medical imaging and healthcare process automation',
        'Industrial Automation': 'Advanced industrial process automation',
        'Real-Time AI Computation': 'High-performance AI processing at the edge'
    }
    return description_mapping.get(app_name, 'Advanced AI-powered application')

if __name__ == "__main__":
    init_applications() 