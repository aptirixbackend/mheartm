"""
WebSocket layer for real-time chat + WebRTC call signaling.

Protocol
────────
Client connects:  ws://host/ws/chat?token=<JWT>

Server → Client events (JSON):
  { "type": "connected",       "user_id": "..." }
  { "type": "new_message",     "match_id": "...", "message": {...} }
  { "type": "messages_read",   "match_id": "...", "reader_id": "..." }
  { "type": "typing",          "match_id": "...", "user_id": "..." }
  { "type": "match_created",   "match_id": "...", "partner": {...} }
  { "type": "error",           "detail": "..." }
  { "type": "pong" }

  — Call signaling (forwarded as-is to the partner) —
  { "type": "call_invite",   "match_id": "...", "from_user_id": "...",
    "call_id": "...", "media": "audio|video", "caller": {name, photo} }
  { "type": "call_accept",   "match_id": "...", "from_user_id": "...", "call_id": "..." }
  { "type": "call_decline",  "match_id": "...", "from_user_id": "...", "call_id": "...", "reason": "..." }
  { "type": "call_hangup",   "match_id": "...", "from_user_id": "...", "call_id": "...", "duration": 123 }
  { "type": "call_offer",    "match_id": "...", "from_user_id": "...", "call_id": "...", "sdp": {...} }
  { "type": "call_answer",   "match_id": "...", "from_user_id": "...", "call_id": "...", "sdp": {...} }
  { "type": "call_ice",      "match_id": "...", "from_user_id": "...", "call_id": "...", "candidate": {...} }

Client → Server events (JSON):
  { "type": "ping" }
  { "type": "typing", "match_id": "..." }

  — Call signaling (client originates; server verifies match & forwards) —
  { "type": "call_invite|call_accept|call_decline|call_hangup|call_offer|
             call_answer|call_ice",
    "match_id": "...",  // required — used to find the partner
    "call_id":  "...",  // client-generated uuid; ties offer/answer/ice together
    ...payload-specific fields }

Regular text messages are still sent via REST POST /messages/{match_id}; the
server broadcasts a `new_message` event after insert so validation, auth,
and storage all live on a single code path.

Call signaling, by contrast, is latency-sensitive and never persisted —
so it rides the socket directly. We only forward between verified match
participants and only if the caller's tier permits it (Pro or female).
"""

import asyncio
import json
import logging
from typing import Dict, Set

from fastapi import WebSocket, WebSocketDisconnect, Query, APIRouter
from app.auth.utils import decode_token
from app.supabase_client import supabase_admin

log = logging.getLogger("chat.ws")
router = APIRouter()

# Message types that belong to the WebRTC signaling channel. Kept as a
# frozenset so the dispatch-loop lookup is O(1).
_CALL_KINDS = frozenset({
    "call_invite",   # caller → callee: new ring
    "call_accept",   # callee → caller: accepted, please send offer
    "call_decline",  # callee → caller: declined (or busy)
    "call_hangup",   # either → either: end the call
    "call_offer",    # caller → callee: RTCSessionDescription (offer)
    "call_answer",   # callee → caller: RTCSessionDescription (answer)
    "call_ice",      # either → either: RTCIceCandidate
})


class ConnectionManager:
    """Tracks active WebSocket connections per user. One user may have many
    open tabs/devices — all of them receive broadcasts addressed to that user."""

    def __init__(self) -> None:
        self._conns: Dict[str, Set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, user_id: str, ws: WebSocket) -> None:
        async with self._lock:
            self._conns.setdefault(user_id, set()).add(ws)

    async def disconnect(self, user_id: str, ws: WebSocket) -> None:
        async with self._lock:
            sockets = self._conns.get(user_id)
            if not sockets:
                return
            sockets.discard(ws)
            if not sockets:
                self._conns.pop(user_id, None)

    def is_online(self, user_id: str) -> bool:
        return user_id in self._conns

    async def send_to_user(self, user_id: str, payload: dict) -> None:
        sockets = list(self._conns.get(user_id, ()))
        if not sockets:
            return
        data = json.dumps(payload, default=str)
        dead: list[WebSocket] = []
        for ws in sockets:
            try:
                await ws.send_text(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(user_id, ws)

    async def send_to_many(self, user_ids, payload: dict) -> None:
        await asyncio.gather(*(self.send_to_user(uid, payload) for uid in user_ids))


manager = ConnectionManager()


def _match_participants(match_id: str) -> tuple[str, str] | None:
    res = supabase_admin.table("matches").select("user1_id, user2_id").eq("id", match_id).execute()
    if not res.data:
        return None
    row = res.data[0]
    return row["user1_id"], row["user2_id"]


async def broadcast_new_message(match_id: str, message: dict) -> None:
    parties = _match_participants(match_id)
    if not parties:
        return
    await manager.send_to_many(parties, {
        "type": "new_message",
        "match_id": match_id,
        "message": message,
    })


async def broadcast_messages_read(match_id: str, reader_id: str) -> None:
    parties = _match_participants(match_id)
    if not parties:
        return
    await manager.send_to_many(parties, {
        "type": "messages_read",
        "match_id": match_id,
        "reader_id": reader_id,
    })


async def broadcast_notification(user_id: str, notification: dict) -> None:
    """Push a new notification row to any connected tab/device of the user."""
    await manager.send_to_user(user_id, {
        "type": "notification",
        "notification": notification,
    })


async def broadcast_match_removed(match_id: str, remover_id: str, partner_id: str) -> None:
    """Notify both parties that a match was torn down. Frontends should drop the
    conversation from their UI and close any open chat for that match."""
    for uid in (remover_id, partner_id):
        await manager.send_to_user(uid, {
            "type": "match_removed",
            "match_id": match_id,
            "removed_by": remover_id,
            "partner_id": partner_id if uid == remover_id else remover_id,
        })


async def broadcast_match_created(match_id: str, user_a_id: str, user_b_id: str) -> None:
    """Notify both parties that a mutual match was formed."""
    profiles = supabase_admin.table("profiles") \
        .select("id, name, main_image_url, city, age") \
        .in_("id", [user_a_id, user_b_id]).execute()
    by_id = {p["id"]: p for p in (profiles.data or [])}

    for uid, partner_id in ((user_a_id, user_b_id), (user_b_id, user_a_id)):
        await manager.send_to_user(uid, {
            "type": "match_created",
            "match_id": match_id,
            "partner": by_id.get(partner_id),
        })


@router.websocket("/ws/chat")
async def chat_socket(ws: WebSocket, token: str = Query(...)):
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("Invalid token")
    except Exception:
        await ws.close(code=4401)
        return

    await ws.accept()
    await manager.connect(user_id, ws)
    await ws.send_json({"type": "connected", "user_id": user_id})

    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_json({"type": "error", "detail": "Invalid JSON"})
                continue

            kind = msg.get("type")

            if kind == "ping":
                await ws.send_json({"type": "pong"})

            elif kind == "typing":
                match_id = msg.get("match_id")
                if not match_id:
                    continue
                parties = _match_participants(match_id)
                if not parties or user_id not in parties:
                    continue
                partner_id = parties[1] if parties[0] == user_id else parties[0]
                await manager.send_to_user(partner_id, {
                    "type": "typing",
                    "match_id": match_id,
                    "user_id": user_id,
                })

            elif kind in _CALL_KINDS:
                # Call signaling is forwarded as-is to the partner. We
                # verify the match participation on every hop, and on the
                # initial `call_invite` we additionally gate on tier so
                # non-Pro users can't even start ringing a partner.
                match_id = msg.get("match_id")
                if not match_id:
                    continue
                parties = _match_participants(match_id)
                if not parties or user_id not in parties:
                    continue
                partner_id = parties[1] if parties[0] == user_id else parties[0]

                if kind == "call_invite":
                    # Gate the caller — women + Pro pass; everyone else
                    # gets a typed error the client turns into a paywall.
                    try:
                        from app.subscriptions import service as subs
                        subs.check_can_call(user_id)
                    except Exception:
                        await ws.send_json({
                            "type":     "call_error",
                            "match_id": match_id,
                            "call_id":  msg.get("call_id"),
                            "code":     "calls_locked",
                            "detail":   "Voice & video calls are a Pro feature.",
                        })
                        continue

                # Forward full payload (sdp, candidate, media, etc.) plus
                # the sender id so the receiver can match the call_id.
                forward = {**msg, "from_user_id": user_id}
                await manager.send_to_user(partner_id, forward)

            # silently ignore unknown types
    except WebSocketDisconnect:
        pass
    except Exception as e:
        log.warning("ws error for user=%s: %s", user_id, e)
    finally:
        await manager.disconnect(user_id, ws)
