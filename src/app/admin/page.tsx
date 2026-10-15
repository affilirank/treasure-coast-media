"use client";

import { useEffect, useState } from "react";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/login")
      .then((response) => response.json())
      .then((result: { authenticated?: boolean }) => {
        if (cancelled) return;
        if (result.authenticated) window.location.replace("/admin/deliveries/new");
        else setChecking(false);
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });
    return () => { cancelled = true; };
  }, []);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      setError("Unauthorized.");
      return;
    }
    window.location.replace("/admin/deliveries/new");
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0d0d0f", color: "#f5f1ea", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "min(100%, 420px)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: 32 }}>
        <p style={{ margin: 0, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "#d4b37a" }}>Admin</p>
        <h1 style={{ margin: "12px 0 8px", fontSize: 34 }}>Sign in</h1>
        <form onSubmit={handleLogin} style={{ display: "grid", gap: 16 }}>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: "#d4b37a" }}>Password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} style={{ borderRadius: 12, border: "1px solid #3d352d", background: "#111", color: "#fff", padding: "12px 14px" }} />
          </label>
          {error && <p style={{ margin: 0, color: "#ffaba5" }}>{error}</p>}
          <button type="submit" disabled={checking} style={{ border: 0, borderRadius: 12, background: "linear-gradient(135deg, #c3925a, #a66e34)", padding: "14px 18px", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: checking ? 0.6 : 1 }}>
            Enter admin panel
          </button>
        </form>
      </div>
    </main>
  );
}
