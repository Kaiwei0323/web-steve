#!/usr/bin/env python3
import os
import shutil
import zipfile
import subprocess
from pathlib import Path
from datetime import datetime

try:
    from tqdm import tqdm
except ImportError:
    print("tqdm not found. Please install it using: pip install tqdm")
    exit(1)

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
BACKUP_FOLDER = "backups"           # Where your backup zip files are stored
RESTORE_FOLDER = "restore_backup"   # Folder to extract and test the backup
DEFAULT_REQUIREMENTS = "requirements.txt"
DEFAULT_START_SCRIPT = "start_app.py"

# ANSI color codes
COLOR_GREEN  = "\033[92m"
COLOR_YELLOW = "\033[93m"
COLOR_RED    = "\033[91m"
COLOR_BLUE   = "\033[94m"
COLOR_RESET  = "\033[0m"

def print_color(message, color=COLOR_GREEN):
    """Utility to print colored messages."""
    print(f"{color}{message}{COLOR_RESET}")

def find_latest_backup(backup_folder: str) -> Path:
    """
    Finds the most recent .zip file in the specified backup folder.
    Returns the Path object of the latest backup file or None if none found.
    """
    backup_path = Path(backup_folder)
    if not backup_path.is_dir():
        return None
    
    zip_files = list(backup_path.glob("*.zip"))
    if not zip_files:
        return None
    
    # Sort by modification time (descending)
    zip_files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
    return zip_files[0]  # newest zip file

def extract_zip(zip_file: Path, destination: Path) -> None:
    """
    Extracts the zip file to the specified destination.
    """
    with zipfile.ZipFile(zip_file, 'r') as zf:
        zf.extractall(destination)

def find_start_script(root_path: Path, script_name: str) -> Path:
    """
    Recursively searches for the start script in the extracted folder.
    Returns the first match or None if not found.
    """
    for path in root_path.rglob(script_name):
        return path
    return None

def create_virtual_environment(env_path: Path) -> None:
    """
    Creates a new virtual environment at the given path using python -m venv.
    """
    print_color(f"Creating virtual environment at: {env_path}", COLOR_BLUE)
    subprocess.run(["python", "-m", "venv", str(env_path)], check=True)

def install_requirements(env_path: Path, project_path: Path, requirements_file: str) -> None:
    """
    Installs dependencies from requirements.txt (if found) using the new virtual environment.
    """
    req_file = project_path / requirements_file
    if not req_file.is_file():
        print_color(f"No {requirements_file} found; skipping dependency installation.", COLOR_YELLOW)
        return
    
    print_color(f"Installing dependencies from {requirements_file}...", COLOR_BLUE)
    python_executable = env_path / "Scripts" / "python.exe"
    subprocess.run([str(python_executable), "-m", "pip", "install", "-r", str(req_file)], check=True)

def run_start_script(env_path: Path, script_path: Path) -> None:
    """
    Runs the start script using the new virtual environment by passing an absolute path.
    We do NOT change directories, so we avoid double-folder issues.
    """
    if not script_path.is_file():
        print_color(f"Cannot find the start script at {script_path}", COLOR_RED)
        return
    
    print_color(f"Running {script_path.name} via absolute path...", COLOR_BLUE)
    python_executable = env_path / "Scripts" / "python.exe"
    # Run the script by absolute path, so no 'cwd' confusion
    subprocess.run([str(python_executable), str(script_path)], check=True)

def main():
    print_color("----- TESTING BACKUP RESTORE PROCESS -----", COLOR_BLUE)

    # 1. Find the newest backup zip
    latest_zip = find_latest_backup(BACKUP_FOLDER)
    if not latest_zip:
        print_color(f"No backup zip found in {BACKUP_FOLDER}.", COLOR_RED)
        return
    
    print_color(f"Latest backup found: {latest_zip}", COLOR_GREEN)
    
    # 2. Clear out any old restore_backup folder
    restore_path = Path(RESTORE_FOLDER)
    if restore_path.exists():
        print_color(f"Removing old {RESTORE_FOLDER} folder...", COLOR_YELLOW)
        shutil.rmtree(restore_path)
    restore_path.mkdir()
    
    # 3. Extract the backup
    print_color(f"Extracting {latest_zip.name} into {RESTORE_FOLDER}...", COLOR_BLUE)
    extract_zip(latest_zip, restore_path)
    
    # 4. Locate the start script anywhere under restore_backup
    start_script_path = find_start_script(restore_path, DEFAULT_START_SCRIPT)
    if not start_script_path:
        print_color(f"{DEFAULT_START_SCRIPT} not found under {RESTORE_FOLDER}.", COLOR_RED)
        print_color("----- BACKUP RESTORE TEST COMPLETE -----", COLOR_BLUE)
        return
    
    # 5. Create venv in the same folder as start_app.py
    project_path = start_script_path.parent
    env_path = project_path / "venv"
    create_virtual_environment(env_path)
    
    # 6. Install dependencies (if requirements.txt exists in the same folder)
    install_requirements(env_path, project_path, DEFAULT_REQUIREMENTS)
    
    # 7. Run the script by absolute path
    try:
        run_start_script(env_path, start_script_path)
        print_color("App started successfully from the backup!", COLOR_GREEN)
    except subprocess.CalledProcessError as e:
        print_color(f"App failed to start: {e}", COLOR_RED)
    
    print_color("----- BACKUP RESTORE TEST COMPLETE -----", COLOR_BLUE)

if __name__ == "__main__":
    main()
