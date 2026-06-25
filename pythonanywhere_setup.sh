#!/bin/bash
# Run this in a PythonAnywhere Bash console after cloning the repo.
# Usage: bash pythonanywhere_setup.sh yourusername

USERNAME=${1:-$(whoami)}
PROJECT_DIR="/home/$USERNAME/glucotrack"
VENV_DIR="$PROJECT_DIR/venv"

echo "=== GlucoTrack PythonAnywhere Setup ==="
echo "User: $USERNAME"
echo "Project: $PROJECT_DIR"

# 1. Create virtualenv
echo -e "\n[1] Creating virtualenv..."
python3 -m venv "$VENV_DIR"
source "$VENV_DIR/bin/activate"

# 2. Install Python dependencies
echo -e "\n[2] Installing Python packages..."
pip install -r "$PROJECT_DIR/requirements.txt"

# 3. Set environment variables
echo -e "\n[3] Writing environment variables..."
ENV_FILE="$PROJECT_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
    # Generate a random secret key
    SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
    cat > "$ENV_FILE" <<EOF
DJANGO_SECRET_KEY=$SECRET
DJANGO_DEBUG=false
PYTHONANYWHERE_HOST=$USERNAME.pythonanywhere.com
EOF
    echo "Created $ENV_FILE"
else
    echo ".env already exists, skipping."
fi

# 4. Run migrations
echo -e "\n[4] Running database migrations..."
cd "$PROJECT_DIR/backend"
export $(cat "$PROJECT_DIR/.env" | xargs)
python manage.py migrate

# 5. Collect static files (assumes React was already built)
echo -e "\n[5] Collecting static files..."
python manage.py collectstatic --noinput

echo -e "\n=== Setup complete! ==="
echo ""
echo "Next steps in the PythonAnywhere dashboard:"
echo "  1. Web tab → Add a new web app → Manual configuration → Python 3.10"
echo "  2. Virtualenv: $VENV_DIR"
echo "  3. WSGI file: replace contents with the template below"
echo "  4. Static files: URL=/staticfiles/  Path=$PROJECT_DIR/backend/staticfiles"
echo "  5. Reload the web app"
echo ""
echo "--- WSGI config (paste into your WSGI file) ---"
cat <<WSGI
import os
import sys

# Load environment variables from .env
env_file = '/home/$USERNAME/glucotrack/.env'
with open(env_file) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#'):
            key, _, value = line.partition('=')
            os.environ[key.strip()] = value.strip()

sys.path.insert(0, '/home/$USERNAME/glucotrack/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'glucotrack.settings')

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
WSGI
