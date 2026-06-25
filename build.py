"""
Build script: compiles the React app and prepares Django static files.
Run from the project root: python build.py
"""
import subprocess
import sys
import os
import shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
CLIENT = os.path.join(ROOT, 'client')
BACKEND = os.path.join(ROOT, 'backend')


def run(cmd, cwd=None):
    print(f'\n>>> {cmd}')
    result = subprocess.run(cmd, shell=True, cwd=cwd)
    if result.returncode != 0:
        print(f'ERROR: command failed with exit code {result.returncode}')
        sys.exit(result.returncode)


print('=== GlucoTrack Build ===')

print('\n[1/3] Building React app...')
run('npm run build', cwd=CLIENT)

print('\n[2/3] Moving index.html to Django templates...')
src = os.path.join(BACKEND, 'static', 'index.html')
templates_dir = os.path.join(BACKEND, 'templates')
os.makedirs(templates_dir, exist_ok=True)
shutil.copy2(src, os.path.join(templates_dir, 'index.html'))
os.remove(src)
print(f'  Moved index.html → backend/templates/index.html')

print('\n[3/3] Collecting Django static files...')
run(f'{sys.executable} manage.py collectstatic --noinput', cwd=BACKEND)

print('\n✓ Build complete!')
print('  React app → backend/static/')
print('  index.html → backend/templates/')
print('  Static files collected → backend/staticfiles/')
print('\nTo run locally:  cd backend && python manage.py runserver')
print('To deploy:       push to GitHub, then pull on PythonAnywhere')
