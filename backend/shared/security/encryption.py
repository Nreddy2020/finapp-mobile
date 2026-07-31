"""
Field-Level Encryption (PII Protection)
- Encrypt sensitive fields individually
- Fernet (AES-128 in CBC mode with HMAC)
"""

from cryptography.fernet import Fernet
import os
import base64

# Get encryption key from environment
FERNET_KEY = os.getenv("FERNET_KEY")

# Generate key if not provided (DEV ONLY - use vault in production)
if not FERNET_KEY:
    FERNET_KEY = Fernet.generate_key().decode()
    print(f"WARNING: Generated temporary encryption key. Set FERNET_KEY env var in production.")

fernet = Fernet(FERNET_KEY.encode() if isinstance(FERNET_KEY, str) else FERNET_KEY)

def encrypt(value: str) -> str:
    """Encrypt a string value"""
    if not value:
        return value
    return fernet.encrypt(value.encode()).decode()

def decrypt(value: str) -> str:
    """Decrypt a string value"""
    if not value:
        return value
    return fernet.decrypt(value.encode()).decode()

def encrypt_dict(data: dict, fields: list) -> dict:
    """Encrypt specific fields in a dictionary"""
    encrypted = data.copy()
    for field in fields:
        if field in encrypted and encrypted[field]:
            encrypted[field] = encrypt(str(encrypted[field]))
    return encrypted

def decrypt_dict(data: dict, fields: list) -> dict:
    """Decrypt specific fields in a dictionary"""
    decrypted = data.copy()
    for field in fields:
        if field in decrypted and decrypted[field]:
            decrypted[field] = decrypt(decrypted[field])
    return decrypted

# Define which fields require encryption
PII_FIELDS = ["email", "phone", "address", "name"]
FINANCIAL_FIELDS = ["account_number", "card_number", "ifsc"]
SENSITIVE_FIELDS = ["ssn", "tax_id"]
