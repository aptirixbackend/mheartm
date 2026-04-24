import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../api/client";

// Must match backend `settings.google_client_id`. Both projects share the same
// Google Cloud client — reusing credentials from the `app_developement` project.
export const GOOGLE_CLIENT_ID =
  "594414222454-leq90b0c39cobg35krqdavdirkghdoej.apps.googleusercontent.com";

// Lazy-load Google Identity Services script, memoised so multiple pages share one load.
let gsiPromise = null;
export function loadGoogleScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google));
      existing.addEventListener("error", () => reject(new Error("Failed to load Google script")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(window.google);
    s.onerror = () => reject(new Error("Failed to load Google script"));
    document.head.appendChild(s);
  });
  return gsiPromise;
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const savedUser = localStorage.getItem("user");
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      api.profile.me().then(setProfile).catch(() => {}).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email, password) {
    const res = await api.auth.login({ email, password });
    localStorage.setItem("access_token", res.access_token);
    localStorage.setItem("refresh_token", res.refresh_token);
    const u = { id: res.user_id, email: res.email };
    localStorage.setItem("user", JSON.stringify(u));
    setUser(u);
    const p = await api.profile.me().catch(() => null);
    setProfile(p);
    return { user: u, profile: p };
  }

  async function signup(email, password, name, phone_number) {
    const res = await api.auth.signup({ email, password, name, phone_number });
    if (res.access_token) {
      localStorage.setItem("access_token", res.access_token);
      const u = { id: res.user_id, email: res.email };
      localStorage.setItem("user", JSON.stringify(u));
      setUser(u);
    }
    return res;
  }

  // Exchanges a Google ID token for our own session. Returns the backend payload
  // including `is_new_user` and `is_complete` so callers can route correctly.
  async function googleSignIn(idToken) {
    const res = await api.auth.google(idToken);
    localStorage.setItem("access_token", res.access_token);
    localStorage.setItem("refresh_token", res.refresh_token || res.access_token);
    const u = { id: res.user_id, email: res.email };
    localStorage.setItem("user", JSON.stringify(u));
    setUser(u);
    const p = await api.profile.me().catch(() => null);
    setProfile(p);
    return { ...res, profile: p };
  }

  function logout() {
    api.auth.logout();
    localStorage.clear();
    setUser(null);
    setProfile(null);
  }

  function refreshProfile() {
    return api.profile.me().then(setProfile);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, signup, googleSignIn, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
