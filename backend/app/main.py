from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.auth.router import router as auth_router
from app.profile.router import router as profile_router
from app.images.router import router as images_router
from app.matches.router import router as matches_router
from app.messages.router import router as messages_router
from app.messages.ws import router as ws_router
from app.notifications.router import router as notifications_router
from app.wallet.router import router as wallet_router
from app.gifts.router import router as gifts_router
from app.subscriptions.router import router as subscriptions_router
from app.admin.router import router as admin_router
from app.events.router import router as events_router

app = FastAPI(title="MatchInMinutes API", version="2.0.0", docs_url="/docs", redoc_url="/redoc")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(auth_router,     prefix="/auth",     tags=["Auth"])
app.include_router(profile_router,  prefix="/profile",  tags=["Profile"])
app.include_router(images_router,   prefix="/images",   tags=["Images"])
app.include_router(matches_router,  prefix="/matches",  tags=["Matches"])
app.include_router(messages_router, prefix="/messages", tags=["Messages"])
app.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])
app.include_router(wallet_router, prefix="/wallet", tags=["Wallet"])
app.include_router(gifts_router, prefix="/gifts", tags=["Gifts"])
app.include_router(subscriptions_router, prefix="/subscriptions", tags=["Subscriptions"])
app.include_router(admin_router, prefix="/admin", tags=["Admin"])
app.include_router(events_router, prefix="/events", tags=["Events"])
app.include_router(ws_router, tags=["WebSocket"])


@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}
