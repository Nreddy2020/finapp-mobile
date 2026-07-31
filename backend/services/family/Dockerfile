FROM python:3.11-slim

WORKDIR /app

# Install system dependencies and Upgrade packages for Security Patches
RUN apt-get update && apt-get install -y gcc && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*

# Install Common Libs
COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy Shared Code
COPY backend/services/shared ./shared

# Copy Service Code
COPY backend/services/family .

# Run
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
