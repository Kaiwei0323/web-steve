import subprocess
import sys
import time
import os
import webbrowser
from pathlib import Path

def check_python_version():
    """Check if Python version is 3.9 or higher"""
    if sys.version_info < (3, 9):
        print("Error: Python 3.9 or higher is required")
        sys.exit(1)

def install_requirements():
    """Install required packages from requirements.txt"""
    print("\nChecking and installing required packages...")
    backend_dir = Path("backend")
    requirements_file = backend_dir / "requirements.txt"
    
    if not requirements_file.exists():
        print("Error: requirements.txt not found")
        sys.exit(1)
    
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", str(requirements_file)], check=True)
        print("✓ All required packages installed")
    except subprocess.CalledProcessError as e:
        print(f"Error installing requirements: {e}")
        sys.exit(1)

def ensure_env_file():
    """Create .env file if it doesn't exist"""
    backend_dir = Path("backend")
    env_file = backend_dir / ".env"
    
    if not env_file.exists():
        print("\nCreating .env file with default settings...")
        with open(env_file, "w") as f:
            f.write("PORT=5000\n")
        print("✓ Created .env file")

def start_backend():
    """Start the Flask backend server"""
    print("\nStarting backend server...")
    backend_dir = Path("backend")
    if not backend_dir.exists():
        print("Error: Backend directory not found")
        sys.exit(1)
    
    try:
        # Use python -m flask run instead of direct app.py execution
        backend_process = subprocess.Popen(
            [sys.executable, "-m", "flask", "run", "--port=5000"],
            cwd=backend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True,
            env={**os.environ, "FLASK_APP": "app.py", "FLASK_ENV": "development"}
        )
        
        # Wait and check for immediate errors
        time.sleep(2)
        
        # Check if process is still running
        if backend_process.poll() is None:
            print("✓ Backend server running on http://localhost:5000")
            return backend_process
        else:
            # Get error output
            stdout, stderr = backend_process.communicate()
            print("Error: Backend server failed to start")
            print("Error details:")
            if stderr:
                print(f"STDERR: {stderr}")
            if stdout:
                print(f"STDOUT: {stdout}")
            sys.exit(1)
            
    except Exception as e:
        print(f"Error starting backend server: {str(e)}")
        sys.exit(1)

def start_frontend():
    """Start the frontend HTTP server"""
    print("\nStarting frontend server...")
    frontend_dir = Path("frontend")
    if not frontend_dir.exists():
        print("Error: Frontend directory not found")
        sys.exit(1)
    
    try:
        frontend_process = subprocess.Popen(
            [sys.executable, "-m", "http.server", "8000"],
            cwd=frontend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        time.sleep(2)  # Wait for server to start
        if frontend_process.poll() is None:
            print("✓ Frontend server running on http://localhost:8000")
            return frontend_process
        else:
            print("Error: Frontend server failed to start")
            sys.exit(1)
    except Exception as e:
        print(f"Error starting frontend server: {str(e)}")
        sys.exit(1)

def main():
    """Main function to start the application"""
    print("=== Edge AI Device Tracker ===")
    print("Starting application...")
    
    # Check Python version
    check_python_version()
    
    # Install required packages
    install_requirements()
    
    # Ensure .env file exists
    ensure_env_file()
    
    # Start backend server
    backend_process = start_backend()
    
    # Start frontend server
    frontend_process = start_frontend()
    
    # Open the application in the default browser
    print("\nOpening application in browser...")
    webbrowser.open('http://localhost:8000')
    
    print("\n=== Application is running ===")
    print("Press Ctrl+C to stop the servers")
    
    try:
        # Keep the script running and handle Ctrl+C
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping servers...")
        backend_process.terminate()
        frontend_process.terminate()
        print("✓ Servers stopped")

if __name__ == "__main__":
    main() 