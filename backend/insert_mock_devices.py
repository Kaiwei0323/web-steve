import os
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime, timedelta

# Load environment variables
load_dotenv()

mongo_uri = os.getenv("MONGODB_URI")
client = MongoClient(mongo_uri)
db = client['edge_ai_devices']
device_specs_collection = db['device_specifications']

# Copy the mock devices list from app.py
# (Paste your devices list here, or import if you refactor)
devices = [
    {
        "name": "NCOX",
        "model": "NCOX",
        "type": "ai_edge",
        "status": "disabled",
        "lastSeen": (datetime.now() - timedelta(minutes=5)).isoformat(),
        "performance": 16,
        "tag": "Best Seller",
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
        "name": "NCON",
        "model": "NCON",
        "type": "ai_edge",
        "status": "enabled",
        "lastSeen": (datetime.now() - timedelta(minutes=15)).isoformat(),
        "performance": 8,
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
        "name": "PSON",
        "model": "PSON",
        "type": "ai_edge",
        "status": "enabled",
        "lastSeen": (datetime.now() - timedelta(hours=1)).isoformat(),
        "performance": 8,
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
        "name": "PSOX",
        "model": "PSOX",
        "type": "ai_edge",
        "status": "disabled",
        "lastSeen": (datetime.now() - timedelta(hours=2)).isoformat(),
        "performance": 16,
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

# Transform and insert
for device in devices:
    doc = {
        "deviceName": device["name"],
        "Category": "Specification",
        "Processor": device["specs"]["processor"],
        "AI Performance": f"{device['performance']} TOPS",
        "Memory": device["specs"]["memory"],
        "Storage": device["specs"]["storage"],
        "OS": device["specs"]["operating_system"],
        "Ethernet": device["specs"].get("networking", None),
        "I/O": device["specs"].get("io_interfaces", None),
        "Dimension": device["specs"].get("dimensions", None),
        "Weight": device["specs"].get("weight", None),
        "Power": device["specs"].get("power_input", None),
        "Operating Tempeture": device["specs"].get("operating_temperature", None),
        "tag": device.get("tag", None),
        "status": device["status"],
        "lastSeen": device["lastSeen"],
        "applications": device["applications"]
    }
    device_specs_collection.insert_one(doc)
    print(f"Inserted device: {device['name']}")

print("All mock devices inserted.") 