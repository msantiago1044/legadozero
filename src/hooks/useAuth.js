import { useState, useEffect } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());

async function supabaseRequest(path, options = {}) {
  const token = localStorage.getItem("lz_token");
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  return res.json();
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("lz_user");
    const token = localStorage.getItem("lz_token");
    if (stored && token) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  async function signUp(email, password) {
    const data = await supabaseRequest("/auth/v1/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (data.user) {
      localStorage.setItem("lz_token", data.access_token);
      localStorage.setItem("lz_user", JSON.stringify(data.user));
      setUser(data.user);
      // Create vault for new user
      await supabaseRequest("/rest/v1/rpc/create_vault", {
        method: "POST",
        body: JSON.stringify({ p_email: email }),
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
    }
    return data;
  }

  async function signIn(email, password) {
    const data = await supabaseRequest("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (data.access_token) {
      localStorage.setItem("lz_token", data.access_token);
      localStorage.setItem("lz_user", JSON.stringify(data.user));
      setUser(data.user);
    }
    return data;
  }

  async function signOut() {
    await supabaseRequest("/auth/v1/logout", { method: "POST" });
    localStorage.removeItem("lz_token");
    localStorage.removeItem("lz_user");
    localStorage.removeItem("lz_alert_level");
    setUser(null);
  }

  async function sendMagicLink(email) {
    return supabaseRequest("/auth/v1/magiclink", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  const isAdmin = user && ADMIN_EMAILS.includes(user.email?.toLowerCase());

  return { user, loading, isAdmin, signUp, signIn, signOut, sendMagicLink };
}
