"""
Build script: compiles the React app and prepares Django static files.
Run from the project root: python build.py
"""
import subprocess
import sys
import os

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

print('\n[1/2] Building React app...')
run('npm run build', cwd=CLIENT)

print('\n[2/2] Collecting Django static files...')
run(f'{sys.executable} manage.py collectstatic --noinput', cwd=BACKEND)

print('\n✓ Build complete!')
print('  React app → backend/static/')
print('  Static files collected → backend/staticfiles/')
print('\nTo run locally:  cd backend && python manage.py runserver')
print('To deploy:       push to GitHub, then pull on PythonAnywhere')
