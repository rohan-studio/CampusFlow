"""
CampusFlow — User Auth Configuration (user_config.py)
All auth settings, password hashing, and token handling live here.
Clean, lightweight, and zero external dependency risk.
"""

import os
import time
import json
import base64
import hmac
import hashlib
import secrets
from dotenv import load_dotenv

load_dotenv()

# Secret key used to sign session tokens.
# Can be overridden via .env: SECRET_KEY="your-secret"
SECRET_KEY = os.getenv("SECRET_KEY", "campusflow-super-secret-key-2026-auth")

# How many days a login session stays active
TOKEN_EXPIRE_DAYS = 7

# Allowed college user roles
ALLOWED_USER_TYPES = ["student", "faculty", "staff"]


def hash_password(password: str) -> str:
    """Hash a password securely using PBKDF2 with a random salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100000
    )
    return f"{salt}:{key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against the stored salt:hash."""
    try:
        salt, key_hex = hashed_password.split(":")
        key = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt.encode("utf-8"),
            100000
        )
        return hmac.compare_digest(key.hex(), key_hex)
    except Exception:
        return False


def create_access_token(data: dict, expires_days: int = TOKEN_EXPIRE_DAYS) -> str:
    """Generate a signed, URL-safe session token."""
    payload = data.copy()
    payload["exp"] = int(time.time()) + (expires_days * 86400)
    payload_json = json.dumps(payload, separators=(',', ':')).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_json).decode("utf-8").rstrip("=")
    
    signature = hmac.new(
        SECRET_KEY.encode("utf-8"),
        payload_b64.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    
    return f"{payload_b64}.{signature}"


def decode_access_token(token: str) -> dict | None:
    """Verify signature and return token payload, or None if invalid/expired."""
    if not token or "." not in token:
        return None
    try:
        payload_b64, signature = token.split(".", 1)
        expected_sig = hmac.new(
            SECRET_KEY.encode("utf-8"),
            payload_b64.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(signature, expected_sig):
            return None
        
        # Restore base64 padding
        padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        payload_json = base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8")
        payload = json.loads(payload_json)
        
        # Check expiration
        if payload.get("exp", 0) < time.time():
            return None
            
        return payload
    except Exception:
        return None
