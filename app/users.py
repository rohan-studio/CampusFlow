"""
CampusFlow — User Management (users.py)
Database operations for student and faculty registration, login, and retrieval.
"""

from sqlalchemy import select, or_
from .sqlalchemy_database import SessionLocal
from .models import User
from .user_config import hash_password, verify_password


def user_to_dict(user: User) -> dict:
    """Format user object as dictionary without exposing password hash."""
    return {
        "id": user.id,
        "college_id": user.college_id,
        "name": user.name,
        "email": user.email,
        "user_type": user.user_type,
        "created_at": (user.created_at.isoformat() + "+05:30") if user.created_at else None,
    }


def register_user_sqlalchemy(college_id: str, name: str, email: str, user_type: str, password: str):
    """
    Register a genuine college campus student or faculty member.
    college_id is used as their unique username/identifier for login.
    """
    clean_college_id = college_id.strip().upper()
    clean_email = email.strip().lower()
    clean_name = name.strip()
    clean_user_type = user_type.strip().lower() if user_type else "student"

    if clean_user_type not in ["student", "faculty", "staff"]:
        clean_user_type = "student"

    with SessionLocal() as session:
        # Check if college_id already registered
        existing_id = session.scalars(
            select(User).where(User.college_id == clean_college_id)
        ).first()
        if existing_id:
            raise ValueError(f"College ID '{clean_college_id}' is already registered. Please login.")

        # Check if email already registered
        existing_email = session.scalars(
            select(User).where(User.email == clean_email)
        ).first()
        if existing_email:
            raise ValueError(f"Email '{clean_email}' is already registered. Please login.")

        # Hash password and save
        hashed = hash_password(password)
        new_user = User(
            college_id=clean_college_id,
            name=clean_name,
            email=clean_email,
            user_type=clean_user_type,
            password_hash=hashed
        )

        try:
            session.add(new_user)
            session.commit()
            session.refresh(new_user)
            return user_to_dict(new_user)
        except Exception:
            session.rollback()
            raise


def authenticate_user_sqlalchemy(identifier: str, password: str):
    """
    Authenticate user by College ID (or Email) and Password.
    Returns user dict on success, or None on failure.
    """
    clean_id = identifier.strip().upper()
    clean_email = identifier.strip().lower()

    with SessionLocal() as session:
        statement = select(User).where(
            or_(User.college_id == clean_id, User.email == clean_email)
        )
        user = session.scalars(statement).first()

        if not user:
            return None

        if not verify_password(password, user.password_hash):
            return None

        return user_to_dict(user)


def get_user_by_college_id_sqlalchemy(college_id: str):
    """Fetch user by College ID."""
    clean_id = college_id.strip().upper()
    with SessionLocal() as session:
        statement = select(User).where(User.college_id == clean_id)
        user = session.scalars(statement).first()
        if not user:
            return None
        return user_to_dict(user)
