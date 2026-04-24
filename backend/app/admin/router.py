"""Admin API surface.

Every route depends on :func:`get_current_admin`. `/admin/login` is the
one exception — it issues a JWT after verifying the admin credentials.

Endpoint naming mirrors the frontend dashboard tabs:
  • /admin/login                    — POST, token issuance
  • /admin/me                       — GET, who am I + session check
  • /admin/stats                    — GET, overview cards
  • /admin/stats/signups            — GET, daily trend
  • /admin/users                    — GET, list + filter
  • /admin/users/{id}/active        — PATCH, enable/disable
  • /admin/users/{id}/admin         — PATCH, grant/revoke admin
  • /admin/users/{id}/credits       — POST, manual credit adjustment
  • /admin/verifications            — GET, queue
  • /admin/verifications/{id}/approve  — POST
  • /admin/verifications/{id}/reject   — POST
  • /admin/gifts                    — GET, PATCH
  • /admin/plans                    — GET, PATCH
  • /admin/withdrawals              — GET, PATCH status
  • /admin/settings                 — GET, PATCH
  • /admin/audit                    — GET, recent admin actions
"""
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from app.supabase_client import supabase_admin
from app.auth.utils import verify_password, create_token
from app.admin.dependencies import get_current_admin
from app.admin import service as admin_service


router = APIRouter()


# ── Login ────────────────────────────────────────────────────────
class AdminLoginRequest(BaseModel):
    email:    EmailStr
    password: str


@router.post("/login")
async def admin_login(body: AdminLoginRequest):
    """Separate endpoint from /auth/login so the admin SPA has its own
    surface — same JWT format, but we refuse to mint one for non-admin
    accounts so the dashboard can't even half-render on a regular login.
    """
    res = supabase_admin.table("users").select("*").eq("email", body.email.lower()).execute()
    if not res.data:
        raise HTTPException(401, "Invalid email or password")
    user = res.data[0]

    if not user.get("is_active", True):
        raise HTTPException(403, "Account is disabled")
    if not user.get("password_hash"):
        # Google-only accounts can't log in as admin — force a real password.
        raise HTTPException(401, "Invalid email or password")
    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    if not user.get("is_admin"):
        raise HTTPException(403, "This account doesn't have admin access")

    token = create_token(user["id"], user["email"])
    return {
        "access_token":  token,
        "refresh_token": token,
        "user_id":       user["id"],
        "email":         user["email"],
        "name":          user.get("name") or "",
        "is_admin":      True,
    }


@router.get("/me")
async def admin_me(admin: dict = Depends(get_current_admin)):
    return admin


# ── Stats ────────────────────────────────────────────────────────
@router.get("/stats")
async def admin_stats(_: dict = Depends(get_current_admin)):
    return admin_service.get_overview_stats()


@router.get("/stats/signups")
async def admin_signup_trend(days: int = 14, _: dict = Depends(get_current_admin)):
    return admin_service.get_signup_series(days=days)


# ── Users ────────────────────────────────────────────────────────
@router.get("/users")
async def admin_list_users(
    limit: int = 50,
    offset: int = 0,
    scope: str = "all",
    q: Optional[str] = None,
    _: dict = Depends(get_current_admin),
):
    return admin_service.list_users(limit=limit, offset=offset, scope=scope, q=q)


class UserActiveBody(BaseModel):
    is_active: bool


@router.get("/users/{user_id}/detail")
async def admin_user_detail(
    user_id: str, _: dict = Depends(get_current_admin),
):
    """Full drill-down for one user — profile, photos, activity,
    payments, wallet, and event telemetry. Populates the user detail
    drawer on the admin dashboard.
    """
    return admin_service.get_user_detail(user_id)


@router.patch("/users/{user_id}/active")
async def admin_set_user_active(
    user_id: str, body: UserActiveBody,
    admin: dict = Depends(get_current_admin),
):
    return admin_service.set_user_active(admin["id"], user_id, body.is_active)


class UserAdminBody(BaseModel):
    is_admin: bool


@router.patch("/users/{user_id}/admin")
async def admin_set_user_admin(
    user_id: str, body: UserAdminBody,
    admin: dict = Depends(get_current_admin),
):
    return admin_service.set_user_admin(admin["id"], user_id, body.is_admin)


class CreditAdjustBody(BaseModel):
    delta:  int
    reason: str


@router.post("/users/{user_id}/credits")
async def admin_adjust_credits(
    user_id: str, body: CreditAdjustBody,
    admin: dict = Depends(get_current_admin),
):
    return admin_service.adjust_credits(admin["id"], user_id, body.delta, body.reason)


# ── Verifications ────────────────────────────────────────────────
@router.get("/verifications")
async def admin_list_verifications(
    status: str = "pending",
    limit:  int = 50,
    _: dict = Depends(get_current_admin),
):
    return admin_service.list_verifications(status=status, limit=limit)


@router.post("/verifications/{user_id}/approve")
async def admin_approve_verification(
    user_id: str,
    admin: dict = Depends(get_current_admin),
):
    return admin_service.approve_verification(admin["id"], user_id)


class RejectBody(BaseModel):
    reason: str


@router.post("/verifications/{user_id}/reject")
async def admin_reject_verification(
    user_id: str, body: RejectBody,
    admin: dict = Depends(get_current_admin),
):
    return admin_service.reject_verification(admin["id"], user_id, body.reason)


# ── Gifts ────────────────────────────────────────────────────────
@router.get("/gifts")
async def admin_list_gifts(_: dict = Depends(get_current_admin)):
    return admin_service.list_gifts_admin()


class GiftPatchBody(BaseModel):
    cost:       Optional[int]  = None
    name:       Optional[str]  = None
    icon:       Optional[str]  = None
    tier:       Optional[str]  = None
    is_active:  Optional[bool] = None
    sort_order: Optional[int]  = None


@router.patch("/gifts/{gift_id}")
async def admin_update_gift(
    gift_id: str, body: GiftPatchBody,
    admin: dict = Depends(get_current_admin),
):
    return admin_service.update_gift(
        admin["id"], gift_id,
        cost=body.cost, name=body.name, icon=body.icon,
        tier=body.tier, is_active=body.is_active, sort_order=body.sort_order,
    )


# ── Plans ────────────────────────────────────────────────────────
@router.get("/plans")
async def admin_list_plans(_: dict = Depends(get_current_admin)):
    return admin_service.list_plans_admin()


class PlanPatchBody(BaseModel):
    monthly_inr: int  # pass 0 to reset to code default


@router.patch("/plans/{slug}")
async def admin_update_plan(
    slug: str, body: PlanPatchBody,
    admin: dict = Depends(get_current_admin),
):
    return admin_service.update_plan_price(admin["id"], slug, body.monthly_inr)


# ── Withdrawals ──────────────────────────────────────────────────
@router.get("/withdrawals")
async def admin_list_withdrawals(
    status: Optional[str] = None,
    limit:  int = 50,
    _: dict = Depends(get_current_admin),
):
    return admin_service.list_withdrawals_admin(status=status, limit=limit)


class WithdrawalPatchBody(BaseModel):
    status:        str                  # processing | paid | rejected
    rzp_payout_id: Optional[str] = None
    reason:        Optional[str] = None


@router.patch("/withdrawals/{withdrawal_id}")
async def admin_mark_withdrawal(
    withdrawal_id: str, body: WithdrawalPatchBody,
    admin: dict = Depends(get_current_admin),
):
    return admin_service.mark_withdrawal(
        admin["id"], withdrawal_id, body.status,
        rzp_payout_id=body.rzp_payout_id, reason=body.reason,
    )


# ── Settings ─────────────────────────────────────────────────────
@router.get("/settings")
async def admin_list_settings(_: dict = Depends(get_current_admin)):
    return admin_service.list_settings()


class SettingPatchBody(BaseModel):
    key:   str
    value: Any


@router.patch("/settings")
async def admin_update_setting(
    body: SettingPatchBody,
    admin: dict = Depends(get_current_admin),
):
    return admin_service.update_setting(admin["id"], body.key, body.value)


# ── Audit log ────────────────────────────────────────────────────
@router.get("/audit")
async def admin_list_audit(
    limit: int = 100,
    _: dict = Depends(get_current_admin),
):
    return admin_service.list_audit_log(limit=limit)
