"""
Seed demo Indian profiles (3 male + 3 female) and verify Supabase connection.

Run from the `backend` directory:
    python seed_demo.py

- Verifies Supabase connectivity before seeding.
- Idempotent: re-running skips users that already exist (by email).
- All demo users share the password `demo1234` (for local testing only).
"""

import sys
from app.supabase_client import supabase_admin
from app.auth.utils import hash_password


DEMO_PASSWORD = "demo1234"

DEMO_USERS = [
    # ── Males ────────────────────────────────────────────────────────
    {
        "email": "arjun.sharma@demo.in",
        "name": "Arjun Sharma",
        "phone_number": "+91-9810012001",
        "profile": {
            "age": 28, "gender": "male", "preferred_gender": "female",
            "city": "Bengaluru", "country": "India",
            "relationship_goal": "long_term",
            "education_level": "bachelors",
            "occupation": "Software Engineer",
            "bio": "Weekend trekker, weekday coder. Love filter coffee and good books.",
            "hobbies": ["trekking", "coding", "reading", "photography"],
            "vibes": ["adventurous", "thoughtful", "ambitious"],
            "relationship_status": "single",
        },
    },
    {
        "email": "rohan.iyer@demo.in",
        "name": "Rohan Iyer",
        "phone_number": "+91-9820012002",
        "profile": {
            "age": 30, "gender": "male", "preferred_gender": "female",
            "city": "Mumbai", "country": "India",
            "relationship_goal": "marriage",
            "education_level": "masters",
            "occupation": "Finance Analyst",
            "bio": "South Indian at heart, Bombay by choice. Cricket, chai, and Carnatic music.",
            "hobbies": ["cricket", "music", "cooking"],
            "vibes": ["family-oriented", "witty", "grounded"],
            "relationship_status": "single",
        },
    },
    {
        "email": "kabir.patel@demo.in",
        "name": "Kabir Patel",
        "phone_number": "+91-9830012003",
        "profile": {
            "age": 26, "gender": "male", "preferred_gender": "female",
            "city": "Pune", "country": "India",
            "relationship_goal": "long_term",
            "education_level": "bachelors",
            "occupation": "Startup Founder",
            "bio": "Building things that matter. Foodie, runner, and dog dad.",
            "hobbies": ["running", "startups", "cooking", "travel"],
            "vibes": ["ambitious", "fun", "curious"],
            "relationship_status": "single",
        },
    },

    # ── Females ──────────────────────────────────────────────────────
    {
        "email": "priya.menon@demo.in",
        "name": "Priya Menon",
        "phone_number": "+91-9910012011",
        "profile": {
            "age": 26, "gender": "female", "preferred_gender": "male",
            "city": "Bengaluru", "country": "India",
            "relationship_goal": "long_term",
            "education_level": "masters",
            "occupation": "UX Designer",
            "bio": "Designer by day, Bharatanatyam dancer by weekend. Always in search of the perfect dosa.",
            "hobbies": ["dance", "design", "reading", "yoga"],
            "vibes": ["creative", "warm", "grounded"],
            "relationship_status": "single",
        },
    },
    {
        "email": "ananya.reddy@demo.in",
        "name": "Ananya Reddy",
        "phone_number": "+91-9920012012",
        "profile": {
            "age": 28, "gender": "female", "preferred_gender": "male",
            "city": "Hyderabad", "country": "India",
            "relationship_goal": "marriage",
            "education_level": "phd",
            "occupation": "Research Scientist",
            "bio": "Biryani maximalist. I read papers on weekdays, poetry on weekends.",
            "hobbies": ["reading", "research", "travel", "poetry"],
            "vibes": ["intellectual", "kind", "witty"],
            "relationship_status": "single",
        },
    },
    {
        "email": "divya.kapoor@demo.in",
        "name": "Divya Kapoor",
        "phone_number": "+91-9930012013",
        "profile": {
            "age": 25, "gender": "female", "preferred_gender": "male",
            "city": "Delhi", "country": "India",
            "relationship_goal": "long_term",
            "education_level": "bachelors",
            "occupation": "Marketing Manager",
            "bio": "Delhi girl with Himachali roots. Mountains > beaches. Always down for a road trip.",
            "hobbies": ["travel", "hiking", "photography", "music"],
            "vibes": ["adventurous", "bubbly", "loyal"],
            "relationship_status": "single",
        },
    },
]


def check_connection() -> None:
    print("* Checking Supabase connection...", end=" ", flush=True)
    try:
        supabase_admin.table("users").select("id").limit(1).execute()
        print("OK")
    except Exception as e:
        print("FAILED")
        print(f"\n  Could not reach Supabase. Verify .env and that the schema is applied.\n  Error: {e}")
        sys.exit(1)


def seed_user(row: dict) -> str:
    email = row["email"]
    existing = supabase_admin.table("users").select("id").eq("email", email).execute()
    if existing.data:
        user_id = existing.data[0]["id"]
        print(f"  . {email:<28} already exists  -> {user_id}")
        return user_id

    created = supabase_admin.table("users").insert({
        "email": email,
        "name": row["name"],
        "phone_number": row["phone_number"],
        "password_hash": hash_password(DEMO_PASSWORD),
        "is_active": True,
    }).execute()
    user_id = created.data[0]["id"]
    print(f"  + {email:<28} created         -> {user_id}")
    return user_id


def seed_profile(user_id: str, row: dict) -> None:
    payload = {
        "id": user_id,
        "name": row["name"],
        "phone_number": row["phone_number"],
        "is_complete": True,
        **row["profile"],
    }
    existing = supabase_admin.table("profiles").select("id").eq("id", user_id).execute()
    if existing.data:
        supabase_admin.table("profiles").update(payload).eq("id", user_id).execute()
    else:
        supabase_admin.table("profiles").insert(payload).execute()


def main() -> None:
    print("\n=== MatchInMinutes demo seeder ===\n")
    check_connection()
    print("\n* Seeding demo Indian profiles (3 male, 3 female)...\n")
    for row in DEMO_USERS:
        uid = seed_user(row)
        seed_profile(uid, row)
    print(f"\n[OK] Done. All demo accounts use password: {DEMO_PASSWORD!r}")
    print("  Log in with any of the emails above to try the app.\n")


if __name__ == "__main__":
    main()
