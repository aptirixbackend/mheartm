from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.auth.utils import decode_token

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Verify our own JWT (no Supabase auth involved)."""
    try:
        payload = decode_token(credentials.credentials)
        user_id = payload.get("sub")
        email = payload.get("email")
        if not user_id:
            raise HTTPException(401, "Invalid token payload")
        return {"id": user_id, "email": email}
    except ValueError:
        raise HTTPException(401, "Invalid or expired token")
