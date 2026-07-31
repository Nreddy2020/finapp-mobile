from datetime import datetime, timedelta
from typing import List, Dict

# --- Authentication Fixtures ---
BASE_TEST_USER_EMAIL = "module_test_user@example.com"
BASE_TEST_USER_PASSWORD = "TestPass123!"
BASE_TEST_DEVICE_ID = "test-device-module-001"

AUTH_PAYLOADS: Dict[str, Dict] = {
    "register_valid": {
        "email": BASE_TEST_USER_EMAIL,
        "password": BASE_TEST_USER_PASSWORD,
        "full_name": "Module Test User"
    },
    "register_duplicate": {
        "email": BASE_TEST_USER_EMAIL,
        "password": BASE_TEST_USER_PASSWORD,
        "full_name": "Module Test User Duplicate"
    },
    "login_valid": {
        "email": BASE_TEST_USER_EMAIL,
        "password": BASE_TEST_USER_PASSWORD
    },
    "login_invalid_password": {
        "email": BASE_TEST_USER_EMAIL,
        "password": "WrongPass123!"
    },
    "refresh_payload": {
        "refresh_token": "<REFRESH_TOKEN_PLACEHOLDER>"
    }
}

AUTH_HEADERS: Dict[str, str] = {
    "X-Device-ID": BASE_TEST_DEVICE_ID,
    "Content-Type": "application/json"
}

# --- Inflation Fixtures ---
INFLATION_SAMPLE_RATES: List[Dict] = [
    {
        "source": "RBI",
        "country_code": "IND",
        "region": "India",
        "rate": 5.9,
        "category": "overall",
        "period": "yearly",
        "period_start": (datetime.utcnow() - timedelta(days=365)).isoformat(),
        "period_end": datetime.utcnow().isoformat(),
        "is_forecast": False,
        "confidence_score": 0.92,
        "metadata": {"notes": "Latest RBI overall inflation"},
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    },
    {
        "source": "RBI",
        "country_code": "IND",
        "region": "India",
        "rate": 7.4,
        "category": "food",
        "period": "yearly",
        "period_start": (datetime.utcnow() - timedelta(days=365)).isoformat(),
        "period_end": datetime.utcnow().isoformat(),
        "is_forecast": False,
        "confidence_score": 0.88,
        "metadata": {"notes": "Food inflation basket"},
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    },
    {
        "source": "RBI",
        "country_code": "IND",
        "region": "India",
        "rate": 6.3,
        "category": "housing",
        "period": "yearly",
        "period_start": (datetime.utcnow() - timedelta(days=365)).isoformat(),
        "period_end": datetime.utcnow().isoformat(),
        "is_forecast": False,
        "confidence_score": 0.85,
        "metadata": {"notes": "Housing inflation basket"},
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }
]

INFLATION_FIXTURES: Dict[str, Dict] = {
    "current_query": {"source": "RBI", "category": "overall"},
    "category_query": {"source": "RBI"},
    "impact_request": {
        "amount": 100000.0,
        "years": 5,
        "inflation_rate": 5.9
    },
    "impact_request_without_rate": {
        "amount": 50000.0,
        "years": 3
    },
    "personalized_user_id": "62f3c0f8-a1b2-4c5d-8faa-0e7b1a2d3c4f"
}

# --- Intelligence Fixtures ---
INTELLIGENCE_CASES: List[Dict] = [
    {"scenario": "RECESSION"},
    {"scenario": "BOOM"},
    {"scenario": "NEUTRAL"}
]

# --- Risk Engine Fixtures ---
RISK_USER_ID = "risk-test-user-001"

RISK_TEST_CASES: List[Dict] = [
    {
        "name": "low_value_approve",
        "user_id": RISK_USER_ID,
        "amount": 2500.0,
        "category": "groceries",
        "expected_decision": "APPROVE"
    },
    {
        "name": "high_value_challenge",
        "user_id": RISK_USER_ID,
        "amount": 150000.0,
        "category": "investment",
        "expected_decision": "CHALLENGE"
    },
    {
        "name": "velocity_block",
        "user_id": RISK_USER_ID,
        "amount": 1200.0,
        "category": "entertainment",
        "expected_decision": "REJECT",
        "velocity_events": 6
    }
]

def make_audit_events_for_velocity(user_id: str, count: int) -> List[Dict]:
    """Create audit documents to simulate transaction velocity for risk testing."""
    now = datetime.utcnow()
    return [
        {
            "event_type": "TRANSACTION_CREATED",
            "actor": user_id,
            "resource": "transaction",
            "timestamp": (now - timedelta(seconds=10 * i)).isoformat(),
            "data": {"amount": 100.0 * (i + 1), "category": "test"}
        }
        for i in range(count)
    ]

# --- Transactions Fixtures ---
TRANSACTION_HEADERS: Dict[str, str] = {
    "X-Device-ID": BASE_TEST_DEVICE_ID,
    "Content-Type": "application/json",
    "Authorization": "Bearer <ACCESS_TOKEN_PLACEHOLDER>"
}

TRANSACTION_PAYLOADS: Dict[str, Dict] = {
    "create_income": {
        "amount": 50000.0,
        "category": "Salary"
    },
    "create_expense": {
        "amount": 3200.0,
        "category": "Food"
    },
    "create_large": {
        "amount": 250000.0,
        "category": "Investment"
    }
}

TRANSACTION_IDEMPOTENCY_KEYS: List[str] = [
    "idempotency-key-001",
    "idempotency-key-002",
    "idempotency-key-duplicate"
]

TRANSACTION_EXPECTED_RESPONSE = {
    "success": True,
    "source": "processed"
}

# --- Demo data documents for DB seeding ---
DB_SEED_DOCUMENTS: Dict[str, List[Dict]] = {
    "users": [
        {
            "email": BASE_TEST_USER_EMAIL,
            "hashed_password": "$2b$12$examplehashplaceholder",
            "full_name": "Module Seed User",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
    ],
    "inflation_rates": INFLATION_SAMPLE_RATES,
    "user_inflation_preferences": [
        {
            "user_id": RISK_USER_ID,
            "preferred_source": "RBI",
            "custom_rate": 5.5,
            "auto_update_enabled": True,
            "notification_threshold": 1.0,
            "personalized_basket": {
                "food": 0.35,
                "housing": 0.25,
                "transport": 0.15,
                "healthcare": 0.10,
                "education": 0.05,
                "entertainment": 0.10
            },
            "region_preference": "Karnataka",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
    ],
    "audit_log": make_audit_events_for_velocity(RISK_USER_ID, 6)
}

# --- Utility helpers ---

def authorization_header(access_token: str) -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {access_token}",
        "X-Device-ID": BASE_TEST_DEVICE_ID,
        "Content-Type": "application/json"
    }


def make_transaction_payload(amount: float, category: str) -> Dict[str, object]:
    return {"amount": amount, "category": category}


def make_inflation_impact_request(amount: float, years: int, inflation_rate: float = None) -> Dict[str, object]:
    request = {"amount": amount, "years": years}
    if inflation_rate is not None:
        request["inflation_rate"] = inflation_rate
    return request
