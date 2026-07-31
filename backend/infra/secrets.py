"""
Secrets Management Interface
Production: Replace with AWS Secrets Manager / GCP Secret Manager / Azure Key Vault
"""

import os
from dotenv import load_dotenv

load_dotenv()

def get_secret(name: str) -> str:
    """
    Get secret from environment
    
    PRODUCTION: Replace with:
    - AWS: boto3.client('secretsmanager').get_secret_value(SecretId=name)
    - GCP: secretmanager.SecretManagerServiceClient().access_secret_version(name)
    - Azure: SecretClient().get_secret(name)
    """
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required secret: {name}")
    return value

def get_secret_safe(name: str, default: str = None) -> str:
    """Get secret with fallback"""
    try:
        return get_secret(name)
    except RuntimeError:
        if default is not None:
            return default
        raise

# Required secrets
REQUIRED_SECRETS = [
    "JWT_SECRET",
    "FERNET_KEY",
    "MONGO_URL"
]

def validate_secrets():
    """Validate all required secrets are present"""
    missing = []
    for secret in REQUIRED_SECRETS:
        try:
            get_secret(secret)
        except RuntimeError:
            missing.append(secret)
    
    if missing:
        raise RuntimeError(f"Missing required secrets: {', '.join(missing)}")
