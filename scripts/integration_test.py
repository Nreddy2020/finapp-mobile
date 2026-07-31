"""
Simple integration test for auth refresh flow.

Usage:
  1. Start backend: python -m uvicorn backend.main:app --reload --port 8000
  2. Install requests if needed: pip install requests
  3. Run: python scripts\integration_test.py

It will: register a random test user, login, then call /api/auth/refresh and print the results.
"""

import requests
import uuid
import sys
import time

BASE = 'http://localhost:8000'
DEVICE_ID = str(uuid.uuid4())

EMAIL = f'test+{int(time.time())}@example.com'
PASSWORD = 'Password123!'

headers = {'X-Device-ID': DEVICE_ID, 'Content-Type': 'application/json'}


def attempt_register():
    print('Registering user', EMAIL)
    r = requests.post(f'{BASE}/api/auth/register', json={'email': EMAIL, 'password': PASSWORD, 'full_name': 'Integration Test'}, headers=headers, timeout=10)
    print('Register status', r.status_code)
    try:
        print(r.json())
    except Exception:
        print(r.text)
    return r


def attempt_login():
    print('Logging in')
    r = requests.post(f'{BASE}/api/auth/login', json={'email': EMAIL, 'password': PASSWORD}, headers=headers, timeout=10)
    print('Login status', r.status_code)
    data = None
    try:
        data = r.json()
        print(data)
    except Exception:
        print(r.text)
    return r, data


def attempt_refresh(refresh_token):
    print('Calling refresh endpoint with refresh_token (len=%d)' % (len(refresh_token) if refresh_token else 0))
    r = requests.post(f'{BASE}/api/auth/refresh', json={'refresh_token': refresh_token}, headers=headers, timeout=10)
    print('Refresh status', r.status_code)
    try:
        print(r.json())
    except Exception:
        print(r.text)
    return r


if __name__ == '__main__':
    print('Integration test starting. Ensure backend is running at', BASE)
    # Optional: try register (may fail if user exists)
    attempt_register()

    r, data = attempt_login()
    if r.status_code != 200 or not data:
        print('Login failed; cannot continue')
        sys.exit(2)

    refresh_token = data.get('refresh_token')
    access_token = data.get('access_token')

    if not refresh_token:
        print('No refresh token returned; aborting')
        sys.exit(3)

    # Wait a moment then call refresh
    time.sleep(1)
    rr = attempt_refresh(refresh_token)
    if rr.status_code == 200:
        print('Refresh succeeded. Integration test PASSED')
        sys.exit(0)
    else:
        print('Refresh failed. Integration test FAILED')
        sys.exit(4)
