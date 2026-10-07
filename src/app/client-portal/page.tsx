"use client";

import { useEffect, useState } from "react";

type PortalFile = {
  name: string;
  pathname: string;
  size: number;
  uploadedAt: string;
};

export default function ClientPortalPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [files, setFiles] = useState<PortalFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function openDelivery() {
      const url = new URL(window.location.href);
      const requestedProject = url.searchParams.get("project") ?? "";
      const shareToken = url.searchParams.get("share");
      if (!requestedProject) {
        setError("Open the private delivery link provided by your production team.");
        setLoading(false);
        return;
      }

      setProjectId(requestedProject);
      try {
        if (shareToken) {
          const accessResponse = await fetch("/api/portal/access", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ projectId: requestedProject, shareToken }),
          });
          const accessResult = await accessResponse.json();
          if (!accessResponse.ok) throw new Error(accessResult.error ?? "This delivery link is invalid or expired.");
          if (cancelled) return;
          setCustomerName(accessResult.customerName ?? "");
          url.searchParams.delete("share");
          window.history.replaceState(null, "", url);
        }

        const response = await fetch(`/api/portal/files?project=${encodeURIComponent(requestedProject)}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Unable to load your delivery.");
        if (cancelled) return;
        setFiles(result.files ?? []);
        setAuthenticated(true);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load your delivery.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void openDelivery();
    return () => { cancelled = true; };
  }, []);

  if (!authenticated) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0d0d0f", color: "#f5f1ea", padding: 24 }}>
        <div style={{ width: "min(100%, 420px)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: 32 }}>
          <p style={{ margin: 0, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "#d4b37a" }}>Client portal</p>
          <h1 style={{ margin: "12px 0 8px", fontSize: 36 }}>{loading ? "Opening your delivery" : "Private delivery link"}</h1>
          <p style={{ margin: "0 0 24px", color: "#c8c0b5", lineHeight: 1.6 }}>{error || "Your files are protected by a private project link. Ask your production contact to resend it if it has expired."}</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0d0d0f", color: "#f5f1ea", padding: "64px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 26 }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "#d4b37a" }}>Client delivery</p>
            <h1 style={{ margin: "8px 0 0", fontSize: 40 }}>{customerName ? `${customerName} · Delivery` : "Your project files"}</h1>
          </div>
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/portal/access", { method: "DELETE" });
              setAuthenticated(false);
              setError("Access closed. Reopen your private delivery link to sign in again.");
            }}
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "#f5f1ea", borderRadius: 10, padding: "10px 14px", cursor: "pointer" }}
          >
            Log out
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 26 }}>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 20 }}>
            <div style={{ color: "#d4b37a", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.4 }}>Files</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 10 }}>{files.length}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 20 }}>
            <div style={{ color: "#d4b37a", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.4 }}>Project</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 10, overflowWrap: "anywhere" }}>{projectId.slice(0, 8).toUpperCase()}</div>
          </div>
        </div>

        {loading ? <p>Loading files…</p> : null}
        {error ? <p style={{ color: "#ffaba5" }}>{error}</p> : null}

        <div style={{ display: "grid", gap: 12 }}>
          {files.length === 0 ? (
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 16, padding: 28, color: "#ccc" }}>
              No files have been uploaded for this client yet.
            </div>
          ) : (
            files.map((file) => (
              <a key={file.pathname} href={`/api/portal/files?project=${encodeURIComponent(projectId)}&pathname=${encodeURIComponent(file.pathname)}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "18px 20px", borderRadius: 16, textDecoration: "none", color: "#f5f1ea", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{file.name}</div>
                  <div style={{ fontSize: 12, color: "#c8c0b5" }}>{new Date(file.uploadedAt).toLocaleString()}</div>
                </div>
                <div style={{ fontSize: 12, color: "#d4b37a" }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
              </a>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
