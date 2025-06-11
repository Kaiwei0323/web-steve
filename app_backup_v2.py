#!/usr/bin/env python3
import os
import subprocess
import datetime
import zipfile

try:
    from tqdm import tqdm
except ImportError:
    print("tqdm not found. Please install it using: pip install tqdm")
    exit(1)

# -------------------------
# Configuration Options
# -------------------------
CREATE_GITIGNORE = True
GITIGNORE_FILE = '.gitignore'
DEFAULT_GITIGNORE_CONTENT = """
# Byte-compiled / optimized / DLL files
__pycache__/
*.py[cod]
*$py.class

# Flask specific
instance/
.webassets-cache

# Distribution / packaging
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
*.egg-info/
.installed.cfg
*.egg

# Virtual environments
venv/
ENV/
env/

# Local configuration
*.env
"""

# Zip backup options
CREATE_ZIP_BACKUP = True
BACKUP_DIR = 'backups'
EXCLUDE_DIRS = {"backups", "venv", "env", "ENV"}

# Option to automatically initialize a Git repository if not present.
INITIALIZE_GIT_REPO = True

# ANSI color codes (256-color code for orange)
COLOR_GREEN  = "\033[92m"
COLOR_YELLOW = "\033[93m"
COLOR_RED    = "\033[91m"
COLOR_BLUE   = "\033[94m"
COLOR_ORANGE = "\033[38;5;214m"
COLOR_RESET  = "\033[0m"

def print_color(message, color=COLOR_GREEN):
    print(f"{color}{message}{COLOR_RESET}")

def is_git_repository():
    return os.path.isdir('.git')

def initialize_git_repository():
    print_color("Initializing Git repository...", COLOR_BLUE)
    subprocess.run(["git", "init"], check=True)
    print_color("Git repository initialized.", COLOR_BLUE)

# -------------------------
# Helper Functions
# -------------------------
def ensure_gitignore():
    """
    Checks if the .gitignore file exists; if not, creates it with default Python/Flask settings.
    """
    if not os.path.exists(GITIGNORE_FILE):
        with open(GITIGNORE_FILE, 'w') as f:
            f.write(DEFAULT_GITIGNORE_CONTENT.strip() + "\n")
        print_color(f"Created {GITIGNORE_FILE} with default content.", COLOR_BLUE)
    else:
        print_color(f"{GITIGNORE_FILE} already exists.", COLOR_BLUE)

def git_backup():
    """
    Stages all changes and forces a commit with a timestamped message.
    If no Git repository exists, it initializes one if allowed.
    """
    if not is_git_repository():
        if INITIALIZE_GIT_REPO:
            initialize_git_repository()
        else:
            print_color("Not a Git repository. Skipping Git backup.", COLOR_YELLOW)
            return

    print_color("Staging changes with Git...", COLOR_BLUE)
    subprocess.run(["git", "add", "."], check=True)
    
    commit_message = "Forced backup commit: " + datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    subprocess.run(["git", "commit", "--allow-empty", "-m", commit_message], check=True)
    
    # **Orange** line for commit message
    print_color("Created forced backup commit with message: " + commit_message, COLOR_ORANGE)

def zip_backup():
    """
    Creates a zip archive of the current project directory, excluding specified directories,
    and displays a progress bar for the file zipping process.
    """
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
        print_color(f"Created backup directory: {BACKUP_DIR}", COLOR_BLUE)
    
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = os.path.join(BACKUP_DIR, f"backup_{timestamp}.zip")
    
    # **Orange** line for "Creating zip backup"
    print_color(f"Creating zip backup: {backup_filename}", COLOR_ORANGE)
    
    # Gather all files to be zipped
    files_to_zip = []
    for foldername, subfolders, filenames in os.walk('.'):
        folder_parts = set(os.path.normpath(foldername).split(os.sep))
        if folder_parts & EXCLUDE_DIRS:
            continue
        for filename in filenames:
            filepath = os.path.join(foldername, filename)
            rel_path = os.path.relpath(filepath, '.')
            files_to_zip.append((filepath, rel_path))
    
    # Debug message for number of files
    print_color(f"Found {len(files_to_zip)} files to zip.", COLOR_YELLOW)
    
    # Create the zip archive with a progress bar
    with zipfile.ZipFile(backup_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for filepath, rel_path in tqdm(files_to_zip, desc="Zipping files", unit="file"):
            zipf.write(filepath, rel_path)
    
    # **Green** lines for completion messages
    print_color("Zip backup created successfully.", COLOR_GREEN)
    print_color(f"Backup file created: {backup_filename}", COLOR_GREEN)

# -------------------------
# Main Backup Process
# -------------------------
def main():
    # Ensure proper .gitignore is in place
    if CREATE_GITIGNORE:
        ensure_gitignore()
    
    # Perform Git backup
    try:
        git_backup()
    except subprocess.CalledProcessError as e:
        print_color("An error occurred during Git operations: " + str(e), COLOR_RED)
    
    # Create zip backup
    if CREATE_ZIP_BACKUP:
        zip_backup()

if __name__ == '__main__':
    main()
