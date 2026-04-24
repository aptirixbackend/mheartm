from app.supabase_client import supabase_admin
from fastapi import HTTPException
from postgrest.exceptions import APIError
from app.notifications import service as notif_service


def _score(candidate: dict, me: dict) -> int:
    score = 0
    if candidate.get("relationship_goal") == me.get("relationship_goal"):
        score += 30
    if candidate.get("city", "").lower() == me.get("city", "").lower():
        score += 25
    elif candidate.get("country", "").lower() == me.get("country", "").lower():
        score += 10
    age_diff = abs((candidate.get("age") or 0) - (me.get("age") or 0))
    if age_diff <= 3:
        score += 20
    elif age_diff <= 7:
        score += 10
    elif age_diff <= 12:
        score += 5
    my_hobbies = set(me.get("hobbies") or [])
    their_hobbies = set(candidate.get("hobbies") or [])
    score += len(my_hobbies & their_hobbies) * 5
    return score


def get_potential_matches(user_id: str, page: int = 1, limit: int = 10, filters: dict | None = None) -> dict:
    filters = filters or {}

    try:
        me_res = supabase_admin.table("profiles").select("*").eq("id", user_id).maybe_single().execute()
    except APIError:
        me_res = None
    me = me_res.data if me_res and me_res.data else None
    if not me or not me.get("is_complete"):
        raise HTTPException(status_code=404, detail="Complete your profile first")
    if not me.get("preferred_gender") or not me.get("gender"):
        raise HTTPException(status_code=404, detail="Complete your profile first")
    if not me.get("is_verified"):
        # Frontend keys off this detail string to render a "Verify now" CTA
        raise HTTPException(status_code=403, detail="verify_required")

    interacted = supabase_admin.table("match_interactions").select("target_id").eq("actor_id", user_id).execute()
    excluded_ids = [r["target_id"] for r in (interacted.data or [])]
    excluded_ids.append(user_id)

    query = (
        supabase_admin.table("profiles")
        .select("*, profile_images(*)")
        .eq("gender", me["preferred_gender"])
        .eq("preferred_gender", me["gender"])
        .eq("is_complete", True)
        # Only face-verified users are visible to others in Discover
        .eq("is_verified", True)
        .not_.in_("id", excluded_ids)
    )

    if filters.get("min_age") is not None:
        query = query.gte("age", filters["min_age"])
    if filters.get("max_age") is not None:
        query = query.lte("age", filters["max_age"])
    if filters.get("city"):
        query = query.ilike("city", f"%{filters['city']}%")
    if filters.get("country"):
        query = query.ilike("country", f"%{filters['country']}%")
    if filters.get("relationship_goal"):
        query = query.eq("relationship_goal", filters["relationship_goal"])
    if filters.get("education_level"):
        query = query.eq("education_level", filters["education_level"])
    if filters.get("search"):
        query = query.ilike("name", f"%{filters['search']}%")

    all_res = query.execute()
    candidates = all_res.data or []

    for c in candidates:
        c["_score"] = _score(c, me)
        c["images"] = c.pop("profile_images", [])

    candidates.sort(key=lambda x: x["_score"], reverse=True)

    offset = (page - 1) * limit
    paginated = candidates[offset: offset + limit]
    for c in paginated:
        c.pop("_score", None)

    return {"matches": paginated, "total": len(candidates), "page": page, "limit": limit}


def _assert_verified(user_id: str) -> None:
    """Only face-verified users can send likes/requests. Keeps the pool clean
    and matches the 'only verified users are visible' rule symmetrically."""
    res = (
        supabase_admin.table("profiles")
        .select("is_verified")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    if not res or not res.data or not res.data.get("is_verified"):
        raise HTTPException(
            status_code=403,
            detail="Please verify your face before sending requests",
        )


def like_user(actor_id: str, target_id: str) -> dict:
    _assert_verified(actor_id)
    # Gate: women + premium = unlimited. Free-tier men get 10/day.
    # Throws a structured 402 the frontend uses to open the paywall.
    from app.subscriptions import service as subs
    subs.check_and_consume_heart(actor_id)
    _record_interaction(actor_id, target_id, "like")

    mutual = supabase_admin.table("match_interactions").select("id").eq("actor_id", target_id).eq("target_id", actor_id).eq("action", "like").execute()
    is_mutual = bool(mutual.data)

    match_id: str | None = None
    if is_mutual:
        existing = supabase_admin.table("matches").select("id").or_(
            f"and(user1_id.eq.{actor_id},user2_id.eq.{target_id}),and(user1_id.eq.{target_id},user2_id.eq.{actor_id})"
        ).execute()
        if existing.data:
            match_id = existing.data[0]["id"]
        else:
            created = supabase_admin.table("matches").insert(
                {"user1_id": actor_id, "user2_id": target_id}
            ).execute()
            if created.data:
                match_id = created.data[0]["id"]

        # Both sides get a "you matched!" bell notification.
        if match_id:
            notif_service.create(target_id, "match_created", actor_id=actor_id, match_id=match_id)
            notif_service.create(actor_id, "match_created", actor_id=target_id, match_id=match_id)
    else:
        # Not mutual yet — ping the target so they see "someone liked you".
        notif_service.create(target_id, "like_received", actor_id=actor_id)

    return {"liked": True, "matched": is_mutual, "match_id": match_id}


def pass_user(actor_id: str, target_id: str) -> dict:
    # Passing doesn't trigger any outgoing request, but we still require
    # verification so unverified users don't silently burn through the pool.
    _assert_verified(actor_id)
    from app.subscriptions import service as subs
    subs.check_and_consume_pass(actor_id)
    _record_interaction(actor_id, target_id, "pass")
    return {"passed": True}


def _record_interaction(actor_id: str, target_id: str, action: str):
    existing = (
        supabase_admin.table("match_interactions")
        .select("id")
        .eq("actor_id", actor_id)
        .eq("target_id", target_id)
        .execute()
    )
    if existing.data:
        supabase_admin.table("match_interactions").update({"action": action}).eq("id", existing.data[0]["id"]).execute()
    else:
        supabase_admin.table("match_interactions").insert(
            {"actor_id": actor_id, "target_id": target_id, "action": action}
        ).execute()


def get_my_matches(user_id: str) -> list:
    res = supabase_admin.table("matches").select("*, user1:profiles!user1_id(*, profile_images(*)), user2:profiles!user2_id(*, profile_images(*))").or_(
        f"user1_id.eq.{user_id},user2_id.eq.{user_id}"
    ).execute()

    matches = []
    for row in res.data or []:
        partner = row["user2"] if row["user1_id"] == user_id else row["user1"]
        if partner:
            partner["images"] = partner.pop("profile_images", [])
            matches.append({
                "match_id": row["id"],
                "partner": partner,
                "created_at": row["created_at"],
                "removed_at": row.get("removed_at"),
                "removed_by": row.get("removed_by"),
            })
    return matches


def get_who_liked_me(user_id: str) -> list:
    res = (
        supabase_admin.table("match_interactions")
        .select("*, actor:profiles!actor_id(*, profile_images(*))")
        .eq("target_id", user_id)
        .eq("action", "like")
        .execute()
    )
    # Exclude actors I've already responded to (liked back or passed)
    my_responses = (
        supabase_admin.table("match_interactions")
        .select("target_id, action")
        .eq("actor_id", user_id)
        .execute()
    )
    responded_ids = {r["target_id"] for r in (my_responses.data or [])}

    results = []
    for row in res.data or []:
        actor = row.get("actor")
        if actor and actor["id"] not in responded_ids:
            actor["images"] = actor.pop("profile_images", [])
            results.append(actor)
    return results


def get_likes_sent(user_id: str) -> list:
    """Likes I sent, with status: pending / accepted / rejected."""
    sent = (
        supabase_admin.table("match_interactions")
        .select("*, target:profiles!target_id(*, profile_images(*))")
        .eq("actor_id", user_id)
        .eq("action", "like")
        .order("created_at", desc=True)
        .execute()
    )
    target_ids = [row["target_id"] for row in (sent.data or [])]
    if not target_ids:
        return []

    # Fetch responses from those targets back towards me
    resp = (
        supabase_admin.table("match_interactions")
        .select("actor_id, action")
        .eq("target_id", user_id)
        .in_("actor_id", target_ids)
        .execute()
    )
    response_map = {r["actor_id"]: r["action"] for r in (resp.data or [])}

    results = []
    for row in sent.data or []:
        target = row.get("target")
        if not target:
            continue
        their_action = response_map.get(target["id"])
        if their_action == "like":
            status = "accepted"
        elif their_action == "pass":
            status = "rejected"
        else:
            status = "pending"
        target["images"] = target.pop("profile_images", [])
        results.append({
            "profile": target,
            "status": status,
            "sent_at": row.get("created_at"),
        })
    return results


def reject_liker(user_id: str, liker_id: str) -> dict:
    """Reject a pending incoming like (records a 'pass' from me toward the liker)."""
    _record_interaction(user_id, liker_id, "pass")
    return {"rejected": True}


def unmatch_user(user_id: str, partner_id: str) -> dict:
    """Soft-remove the friendship between `user_id` and `partner_id`.

    We intentionally DO NOT delete the matches row or the chat history — both
    sides keep access to the conversation as read-only so the record of what
    was said is preserved. What we do:

    - Stamp `matches.removed_at` + `matches.removed_by`. The messages router
      refuses new sends on a removed match; the UI shows a "Removed as friend"
      banner and disables the input.
    - Record a 'pass' from me → them so Discover won't resurface them.

    Required columns (run once in Supabase SQL editor):
        alter table matches add column if not exists removed_at timestamptz;
        alter table matches add column if not exists removed_by uuid;
    """
    from datetime import datetime, timezone

    existing = (
        supabase_admin.table("matches")
        .select("id, user1_id, user2_id, removed_at")
        .or_(
            f"and(user1_id.eq.{user_id},user2_id.eq.{partner_id}),"
            f"and(user1_id.eq.{partner_id},user2_id.eq.{user_id})"
        )
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="You're not connected with this person")

    row = existing.data[0]
    match_id = row["id"]

    # If already removed we still succeed (idempotent) but don't overwrite the
    # original remover — keeps the "who ended it" audit trail truthful.
    if not row.get("removed_at"):
        try:
            supabase_admin.table("matches").update({
                "removed_at": datetime.now(timezone.utc).isoformat(),
                "removed_by": user_id,
            }).eq("id", match_id).execute()
        except Exception as e:
            # Columns are probably missing on this database — surface a clear fix.
            raise HTTPException(
                status_code=500,
                detail=(
                    "Matches table is missing `removed_at` / `removed_by` columns. Run: "
                    "alter table matches add column if not exists removed_at timestamptz; "
                    "alter table matches add column if not exists removed_by uuid;"
                ),
            ) from e

    # Mark my side as 'pass' so Discover won't resurface them
    _record_interaction(user_id, partner_id, "pass")

    return {"unmatched": True, "match_id": match_id, "partner_id": partner_id}


def reinvite(user_id: str, partner_id: str, gift_slug: str | None = None) -> dict:
    """Ask to reconnect after an unfriend.

    Two cases:
    - **I was the remover** (matches.removed_by == me): I can restore the match
      myself — clear the removal stamps and flip my interaction back to 'like'.
      We notify the partner so they know we're back.
    - **They were the remover**: I can only invite — we write a `match_invitation`
      notification for them. Accepting it restores the match (see `accept_invitation`).

    If the match isn't removed or doesn't exist, we 400 — there's nothing to
    reinvite (callers shouldn't be hitting this endpoint for strangers).
    """
    from datetime import datetime, timezone

    match_res = (
        supabase_admin.table("matches")
        .select("id, user1_id, user2_id, removed_at, removed_by")
        .or_(
            f"and(user1_id.eq.{user_id},user2_id.eq.{partner_id}),"
            f"and(user1_id.eq.{partner_id},user2_id.eq.{user_id})"
        )
        .execute()
    )
    if not match_res.data:
        raise HTTPException(404, "No existing match found with this person")

    match = match_res.data[0]
    match_id = match["id"]

    if not match.get("removed_at"):
        raise HTTPException(400, "You're still connected — nothing to reinvite")

    # Case 1: I'm the remover — I can un-remove unilaterally.
    if match.get("removed_by") == user_id:
        supabase_admin.table("matches").update({
            "removed_at": None,
            "removed_by": None,
        }).eq("id", match_id).execute()
        _record_interaction(user_id, partner_id, "like")

        # Gift attached? Since restore is unilateral (no accept step),
        # send it chat-context so the receiver is credited immediately
        # and a gift card appears in history.
        gift_payload = None
        if gift_slug:
            from app.gifts import service as gifts_service
            sent = gifts_service.send_gift(
                sender_id=user_id, receiver_id=partner_id,
                gift_slug=gift_slug, context="chat", match_id=match_id,
            )
            gift_payload = {
                "gift_send_id": sent["gift_send"]["id"],
                "gift": sent["gift"],
            }

        note = notif_service.create(
            partner_id, "match_restored",
            actor_id=user_id, match_id=match_id,
            payload={"restored_by": user_id, **(gift_payload or {})},
        )
        return {
            "restored": True,
            "match_id": match_id,
            "notification": note,
        }

    # Case 2: They removed me — need their approval. Don't create a duplicate
    # pending invitation if one is already outstanding.
    try:
        existing = (
            supabase_admin.table("notifications")
            .select("id, created_at, is_handled")
            .eq("user_id", partner_id)
            .eq("actor_id", user_id)
            .eq("match_id", match_id)
            .eq("type", "match_invitation")
            .eq("is_handled", False)
            .execute()
        )
        if existing.data:
            return {
                "invited": True,
                "already_pending": True,
                "match_id": match_id,
                "notification": existing.data[0],
            }
    except Exception:
        # notifications table missing — surface a clear migration hint
        raise HTTPException(
            500,
            "Notifications table missing. See app/notifications/service.py "
            "for the required SQL migration.",
        )

    # Attach a pending gift if requested. Sender is debited now;
    # receiver's 70% is held until they accept.
    gift_payload = None
    if gift_slug:
        from app.gifts import service as gifts_service
        sent = gifts_service.send_gift(
            sender_id=user_id, receiver_id=partner_id,
            gift_slug=gift_slug, context="invite", match_id=match_id,
        )
        gift_payload = {
            "gift_send_id": sent["gift_send"]["id"],
            "gift": sent["gift"],
        }

    note = notif_service.create(
        partner_id, "match_invitation",
        actor_id=user_id, match_id=match_id,
        payload={"invited_by": user_id, **(gift_payload or {})},
    )
    if not note:
        raise HTTPException(500, "Failed to send invitation")

    return {"invited": True, "match_id": match_id, "notification": note}


def accept_invitation(user_id: str, notification_id: str) -> dict:
    """Accept a `match_invitation` — restore the match and record a 'like' back."""
    note = notif_service.get(user_id, notification_id)
    if not note:
        raise HTTPException(404, "Invitation not found")
    if note["type"] != "match_invitation":
        raise HTTPException(400, "This notification isn't an invitation")
    if note.get("is_handled"):
        raise HTTPException(400, "This invitation has already been handled")

    inviter_id = note["actor_id"]
    match_id = note["match_id"]
    if not inviter_id or not match_id:
        raise HTTPException(400, "Malformed invitation")

    # Restore the match row
    supabase_admin.table("matches").update({
        "removed_at": None,
        "removed_by": None,
    }).eq("id", match_id).execute()

    # Flip our interaction back to 'like' (we were the ones who had set it to
    # 'pass' when we removed them). Inviter's row is already 'like'.
    _record_interaction(user_id, inviter_id, "like")

    notif_service.mark_handled(user_id, notification_id)

    # If the invitation had a pending gift attached, release the receiver's
    # 70% share now that the invite is accepted.
    payload = note.get("payload") or {}
    gift_send_id = payload.get("gift_send_id")
    if gift_send_id:
        try:
            from app.gifts import service as gifts_service
            gifts_service.settle_invite_gift_accept(gift_send_id)
        except Exception:
            # Don't block the accept on a gift-settlement hiccup.
            pass

    back_note = notif_service.create(
        inviter_id, "match_restored",
        actor_id=user_id, match_id=match_id,
        payload={"accepted": True, **({"gift": payload.get("gift")} if payload.get("gift") else {})},
    )

    return {
        "accepted": True,
        "match_id": match_id,
        "partner_id": inviter_id,
        "notification": back_note,
    }


def decline_invitation(user_id: str, notification_id: str) -> dict:
    note = notif_service.get(user_id, notification_id)
    if not note:
        raise HTTPException(404, "Invitation not found")
    if note["type"] != "match_invitation":
        raise HTTPException(400, "This notification isn't an invitation")
    if note.get("is_handled"):
        return {"declined": True, "already_handled": True}

    notif_service.mark_handled(user_id, notification_id)

    # Refund the sender 50% if a gift was attached — the other 50% stays
    # on the platform per spec.
    payload = note.get("payload") or {}
    gift_send_id = payload.get("gift_send_id")
    if gift_send_id:
        try:
            from app.gifts import service as gifts_service
            gifts_service.settle_invite_gift_decline(gift_send_id)
        except Exception:
            pass

    # Soft ping back so the inviter knows their invitation was passed on —
    # best-effort, a failure here shouldn't block the decline.
    notif_service.create(
        note["actor_id"], "invitation_declined",
        actor_id=user_id, match_id=note.get("match_id"),
    )

    return {"declined": True}


def get_disliked_by_me(user_id: str) -> list:
    """Profiles I passed on. I can reconsider and send them a like from here."""
    res = (
        supabase_admin.table("match_interactions")
        .select("*, target:profiles!target_id(*, profile_images(*))")
        .eq("actor_id", user_id)
        .eq("action", "pass")
        .order("created_at", desc=True)
        .execute()
    )
    results = []
    for row in res.data or []:
        target = row.get("target")
        if not target:
            continue
        target["images"] = target.pop("profile_images", [])
        results.append({
            "profile": target,
            "passed_at": row.get("created_at"),
        })
    return results
