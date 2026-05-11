from fastapi import APIRouter, Depends, Request
from app.auth.dependencies import get_current_user
from app.profile.schemas import ProfileCreateRequest, ProfileUpdateRequest, ProfileResponse
from app.profile import service

router = APIRouter()


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(user=Depends(get_current_user)):
    return service.get_profile(user["id"])


@router.post("/complete", response_model=ProfileResponse)
async def complete_profile(body: ProfileCreateRequest, user=Depends(get_current_user)):
    return service.create_or_update_profile(user["id"], body)


@router.patch("/me", response_model=ProfileResponse)
async def update_my_profile(body: ProfileUpdateRequest, user=Depends(get_current_user)):
    return service.update_profile(user["id"], body)


# Must be defined BEFORE /{user_id} so the wildcard doesn't swallow it
@router.get("/preferences")
async def get_partner_preferences(user=Depends(get_current_user)):
    return service.get_partner_preferences(user["id"])


@router.put("/preferences")
async def update_partner_preferences_put(request: Request, user=Depends(get_current_user)):
    body = await request.json()
    return service.update_partner_preferences_raw(user["id"], body)


@router.patch("/preferences")
async def update_partner_preferences_patch(request: Request, user=Depends(get_current_user)):
    body = await request.json()
    return service.update_partner_preferences_raw(user["id"], body)


@router.get("/{user_id}", response_model=ProfileResponse)
async def get_user_profile(user_id: str, user=Depends(get_current_user)):
    """View another user's full profile. Only completed profiles are returned."""
    return service.get_public_profile(viewer_id=user["id"], target_id=user_id)
