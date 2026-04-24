const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const WS_URL = (() => {
  try {
    const url = new URL(BASE_URL);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return url.toString().replace(/\/$/, "");
  } catch {
    return BASE_URL.replace(/^http/, "ws");
  }
})();

function getToken() {
  return localStorage.getItem("access_token");
}

function qs(params) {
  const entries = Object.entries(params || {}).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (!entries.length) return "";
  return "?" + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.clear();
    window.location.href = "/login";
    throw new Error("Session expired. Please sign in again.");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    // Structured detail (e.g. 402 quota_exceeded) is an object — surface
    // it to callers via a typed Error so they can pop the paywall. String
    // details keep the old message-only behaviour.
    if (err.detail && typeof err.detail === "object") {
      const e = new Error(err.detail.message || "Request failed");
      e.status = res.status;
      e.code   = err.detail.code;
      e.detail = err.detail;
      throw e;
    }
    const e = new Error(err.detail || "Request failed");
    e.status = res.status;
    throw e;
  }

  return res.json();
}

async function upload(path, formData) {
  const token = getToken();
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { method: "POST", headers, body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export const api = {
  auth: {
    signup: (data) => request("/auth/signup", { method: "POST", body: JSON.stringify(data) }),
    login:  (data) => request("/auth/login",  { method: "POST", body: JSON.stringify(data) }),
    logout: ()     => request("/auth/logout",  { method: "POST" }).catch(() => {}),
    google: (id_token) => request("/auth/google", { method: "POST", body: JSON.stringify({ id_token }) }),
  },

  profile: {
    me:       ()          => request("/profile/me"),
    byId:     (userId)    => request(`/profile/${userId}`),
    complete: (data)      => request("/profile/complete", { method: "POST", body: JSON.stringify(data) }),
    update:   (data)      => request("/profile/me",       { method: "PATCH", body: JSON.stringify(data) }),
  },

  images: {
    upload:  (file, isMain = false) => {
      const fd = new FormData();
      fd.append("file", file);
      return upload(`/images/upload?is_main=${isMain}`, fd);
    },
    list:    ()   => request("/images/"),
    setMain: (id) => request(`/images/${id}/set-main`, { method: "PATCH" }),
    delete:  (id) => request(`/images/${id}`,          { method: "DELETE" }),
    uploadCover: (file) => {
      const fd = new FormData();
      fd.append("file", file);
      return upload(`/images/cover`, fd);
    },
    deleteCover: () => request(`/images/cover`, { method: "DELETE" }),
    uploadVerification: (file) => {
      const fd = new FormData();
      fd.append("file", file);
      return upload(`/images/verification`, fd);
    },
  },

  matches: {
    discover:  (page = 1, filters = {}) =>
      request(`/matches/discover${qs({ page, limit: 12, ...filters })}`),
    like:      (id) => request(`/matches/${id}/like`, { method: "POST" }),
    pass:      (id) => request(`/matches/${id}/pass`, { method: "POST" }),
    myMatches: ()   => request("/matches/my-matches"),
    likedMe:   ()   => request("/matches/liked-me"),
    likesSent:    ()   => request("/matches/likes-sent"),
    dislikedByMe: ()   => request("/matches/disliked-by-me"),
    reject:       (id) => request(`/matches/${id}/reject`, { method: "POST" }),
    unmatch:      (partnerId) => request(`/matches/${partnerId}/unmatch`, { method: "DELETE" }),
    reinvite:     (partnerId, giftSlug = null) => request(`/matches/${partnerId}/reinvite`, {
      method: "POST",
      body: JSON.stringify(giftSlug ? { gift_slug: giftSlug } : {}),
    }),
    acceptInvitation:  (notificationId) => request(`/matches/invitations/${notificationId}/accept`,  { method: "POST" }),
    declineInvitation: (notificationId) => request(`/matches/invitations/${notificationId}/decline`, { method: "POST" }),
  },

  notifications: {
    list:        ()   => request("/notifications"),
    unreadCount: ()   => request("/notifications/unread-count"),
    read:        (id) => request(`/notifications/${id}/read`, { method: "POST" }),
    readAll:     ()   => request("/notifications/read-all",   { method: "POST" }),
  },

  messages: {
    conversations: ()              => request("/messages/conversations"),
    history:       (matchId)       => request(`/messages/${matchId}`),
    send:          (matchId, text) => request(`/messages/${matchId}`, {
      method: "POST",
      body: JSON.stringify({ content: text }),
    }),
    markRead: (matchId) => request(`/messages/${matchId}/read`, { method: "PATCH" }),
    // Log a completed / missed call as a system message in the thread.
    // Server formats the human text so clients can't spoof durations.
    logCall: (matchId, { media, durationSeconds = 0, missed = false }) =>
      request(`/messages/${matchId}/call-summary`, {
        method: "POST",
        body: JSON.stringify({
          media,
          duration_seconds: durationSeconds,
          missed,
        }),
      }),
  },

  gifts: {
    catalog:  ()                                    => request("/gifts/"),
    send:     ({ receiverId, giftSlug, context, matchId = null }) =>
      request("/gifts/send", {
        method: "POST",
        body: JSON.stringify({
          receiver_id: receiverId,
          gift_slug:   giftSlug,
          context,
          match_id:    matchId,
        }),
      }),
    received: ()                                    => request("/gifts/received"),
    forMatch: (matchId)                             => request(`/gifts/match/${matchId}`),
  },

  subscriptions: {
    me:           ()         => request("/subscriptions/me"),
    plans:        ()         => request("/subscriptions/plans"),
    createOrder:  (plan)     => request("/subscriptions/purchase/order", {
      method: "POST",
      body: JSON.stringify({ plan }),
    }),
    verify:       (payload)  => request("/subscriptions/purchase/verify", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  },

  wallet: {
    config:          ()             => request("/wallet/config"),
    balance:         ()             => request("/wallet/balance"),
    packs:           ()             => request("/wallet/packs"),
    createOrder:     (credits)      => request("/wallet/purchase/order", {
      method: "POST",
      body: JSON.stringify({ credits }),
    }),
    verifyPayment:   (payload)      => request("/wallet/purchase/verify", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    transactions:    ()             => request("/wallet/transactions"),
    getBillingDetails: ()           => request("/wallet/billing-details"),
    setBillingDetails: (payload)    => request("/wallet/billing-details", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
    getPayoutDetails: ()            => request("/wallet/payout-details"),
    setPayoutDetails: (payload)     => request("/wallet/payout-details", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
    withdrawals:     ()             => request("/wallet/withdrawals"),
    withdraw:        (credits)      => request("/wallet/withdraw", {
      method: "POST",
      body: JSON.stringify({ credits }),
    }),
  },
};
