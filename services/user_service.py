from sqlalchemy import select, or_
from sqlalchemy.orm import Session
from models.user import User
from core.security import hash_password, verify_password

def user_to_dict(user: User) -> dict:
    if not user:
        return None
    return {
        "id": user.id,
        "college_id": user.college_id,
        "name": user.name,
        "email": user.email,
        "user_type": user.user_type,
        "created_at": (user.created_at.isoformat() + "+05:30") if user.created_at else None,
    }

def register_user(session: Session, college_id: str, name: str, email: str, user_type: str, password: str) -> dict:
    clean_college_id = college_id.strip().upper()
    clean_email = email.strip().lower()
    clean_name = name.strip()
    clean_user_type = user_type.strip().lower() if user_type else "student"

    if clean_user_type not in ["student", "faculty", "staff"]:
        clean_user_type = "student"

    existing_id = session.scalars(
        select(User).where(User.college_id == clean_college_id)
    ).first()
    if existing_id:
        raise ValueError(f"College ID '{clean_college_id}' is already registered. Please login.")

    existing_email = session.scalars(
        select(User).where(User.email == clean_email)
    ).first()
    if existing_email:
        raise ValueError(f"Email '{clean_email}' is already registered. Please login.")

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

def authenticate_user(session: Session, identifier: str, password: str):
    clean_id = identifier.strip().upper()
    clean_email = identifier.strip().lower()

    statement = select(User).where(
        or_(User.college_id == clean_id, User.email == clean_email)
    )
    user = session.scalars(statement).first()

    if not user:
        return None

    if not verify_password(password, user.password_hash):
        return None

    return user_to_dict(user)

def get_user_by_college_id(session: Session, college_id: str):
    clean_id = college_id.strip().upper()
    statement = select(User).where(User.college_id == clean_id)
    user = session.scalars(statement).first()
    return user_to_dict(user) if user else None
