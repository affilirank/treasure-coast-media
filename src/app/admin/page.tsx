"use client";

import { useEffect, useState } from "react";

type DeliveryProject = {
  id: string;
  customerName: string;
  customerEmail: string;
  createdAt: string;
};

// New media deliveries are the default landing page; the old client-file hub lives at /admin?hub=1.
function goToDefaultPage() {
  if (new URLSearchParams(window.location.search).has("hub")) return false;
  window.location.replace("/admin/deliveries/new");
  return true;
}

export default function AdminPortalPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [projects, setProjects] = useState<DeliveryProject[]>([]);
  const [projectId, setProjectId] = useState("");
  const [customerName, setCustomerName] = useState("sample-customer");
  const [customerEmail, setCustomerEmail] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      try {
        const response = await fetch("/api/portal/login");
        const result = await response.json();
        if (!result.authenticated) return;
        if (goToDefaultPage()) return;
        const projectsResponse = await fetch("/api/portal/projects");
        const projectsResult = await projectsResponse.json();
        if (!projectsResponse.ok) throw new Error(projectsResult.error ?? "Unable to load projects.");
        if (cancelled) return;
        setAuthenticated(true);
        setProjects(projectsResult.projects ?? []);
        if (projectsResult.projects?.length) setProjectId(projectsResult.projects[0].id);
      } catch {
        if (!cancelled) setError("Unable to check admin session.");
      }
    }
    void checkSession();
    return () => { cancelled = true; };
  }, []);

  async function loadProjects() {
    setError("");
    const response = await fetch("/api/portal/projects");
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Unable to load files");
      return;
    }
    setProjects(result.projects ?? []);
    if (!projectId && result.projects?.length) setProjectId(result.projects[0].id);
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/portal/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      setError("Unauthorized.");
      return;
    }

    if (goToDefaultPage()) return;
    setAuthenticated(true);
    await loadProjects();
  }

  async function handleCreateProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setShareUrl("");
    const response = await fetch("/api/portal/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ customerName, customerEmail }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Project creation failed.");
      return;
    }
    setProjects((current) => [result.project, ...current]);
    setProjectId(result.project.id);
    setShareUrl(result.shareUrl);
    setCustomerName("");
    setCustomerEmail("");
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // currentTarget is null after an await, so keep a reference to the form.
    const form = event.currentTarget;
    const fileInput = (form.elements.namedItem("file") as HTMLInputElement | null)?.files?.[0];
    if (!fileInput) {
      setError("Choose an image or file to upload.");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const response = await fetch("/api/uploads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId, fileName: fileInput.name, size: fileInput.size }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Upload could not be prepared.");

      const uploadResponse = await fetch(result.uploadUrl, {
        method: "PUT",
        headers: { "content-type": result.contentType },
        body: fileInput,
      });
      if (!uploadResponse.ok) throw new Error("The file could not be uploaded.");
      form.reset();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  if (!authenticated) {
    return (
      <main style={{ minHeight: "100vh", background: "#0d0d0f", color: "#f5f1ea", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ width: "min(100%, 420px)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: 32 }}>
          <p style={{ margin: 0, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "#d4b37a" }}>Admin</p>
          <h1 style={{ margin: "12px 0 8px", fontSize: 34 }}>Upload client files</h1>
          <form onSubmit={handleLogin} style={{ display: "grid", gap: 16 }}>
            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: "#d4b37a" }}>Password</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} style={{ borderRadius: 12, border: "1px solid #3d352d", background: "#111", color: "#fff", padding: "12px 14px" }} />
            </label>
            {error && <p style={{ margin: 0, color: "#ffaba5" }}>{error}</p>}
            <button type="submit" style={{ border: 0, borderRadius: 12, background: "linear-gradient(135deg, #c3925a, #a66e34)", padding: "14px 18px", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
              Enter admin panel
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0d0d0f", color: "#f5f1ea", padding: "64px 24px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 24 }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "#d4b37a" }}>Admin delivery</p>
            <h1 style={{ margin: "8px 0 0", fontSize: 40 }}>Project delivery hub</h1>
          </div>
          <a href="/admin/deliveries/new" style={{ marginLeft: "auto", background: "#d4b37a", color: "#14201e", fontWeight: 700, borderRadius: 10, padding: "10px 14px", textDecoration: "none" }}>
            + New media delivery
          </a>
          <button type="button" onClick={async () => { await fetch("/api/portal/login", { method: "DELETE" }); setAuthenticated(false); }} style={{ border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#fff", borderRadius: 10, padding: "10px 14px", cursor: "pointer" }}>
            Log out
          </button>
        </div>

        <form onSubmit={handleCreateProject} style={{ display: "grid", gap: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: 22, marginBottom: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ color: "#d4b37a", textTransform: "uppercase", letterSpacing: 1.4, fontSize: 12 }}>Customer name</span>
              <input required value={customerName} onChange={(event) => setCustomerName(event.target.value)} style={{ background: "#111", color: "#fff", border: "1px solid #3d352d", borderRadius: 12, padding: "12px 14px" }} />
            </label>
            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ color: "#d4b37a", textTransform: "uppercase", letterSpacing: 1.4, fontSize: 12 }}>Customer email</span>
              <input required type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} style={{ background: "#111", color: "#fff", border: "1px solid #3d352d", borderRadius: 12, padding: "12px 14px" }} />
            </label>
          </div>
          <button type="submit" style={{ justifySelf: "start", border: 0, borderRadius: 12, background: "linear-gradient(135deg, #c3925a, #a66e34)", padding: "13px 18px", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Create delivery project</button>
        </form>

        {shareUrl && <div style={{ display: "grid", gap: 10, marginBottom: 18, padding: 18, border: "1px solid rgba(157,224,181,0.4)", background: "rgba(59,140,91,0.12)" }}><strong>Private customer delivery link</strong><input readOnly value={shareUrl} aria-label="Customer delivery link" style={{ width: "100%", background: "#111", color: "#fff", border: "1px solid #3d352d", padding: 12 }} /><button type="button" onClick={() => void navigator.clipboard.writeText(shareUrl)} style={{ justifySelf: "start", border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#fff", padding: "10px 14px", cursor: "pointer" }}>Copy link</button></div>}

        <form onSubmit={handleUpload} style={{ display: "grid", gap: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: 22, marginBottom: 32 }}>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "#d4b37a", textTransform: "uppercase", letterSpacing: 1.4, fontSize: 12 }}>Delivery project</span>
            <select required value={projectId} onChange={(event) => setProjectId(event.target.value)} style={{ background: "#111", color: "#fff", border: "1px solid #3d352d", borderRadius: 12, padding: "12px 14px" }}>
              <option value="">Choose a customer project</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.customerName} · {project.customerEmail}</option>)}
            </select>
          </label>

          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "#d4b37a", textTransform: "uppercase", letterSpacing: 1.4, fontSize: 12 }}>Upload file</span>
            <input required type="file" name="file" accept="image/jpeg,image/png,image/webp,image/heic,image/tiff,application/pdf,video/mp4,video/quicktime" style={{ padding: 12, background: "#111", border: "1px solid #3d352d", borderRadius: 12, color: "#fff" }} />
            <small style={{ color: "#c8c0b5" }}>Private photo, PDF, or MP4/MOV upload up to 250 MB.</small>
          </label>

          {error && <p style={{ color: "#ffaba5", margin: 0 }}>{error}</p>}

          <button type="submit" disabled={uploading || !projects.length} style={{ border: 0, borderRadius: 12, background: "linear-gradient(135deg, #c3925a, #a66e34)", padding: "14px 18px", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
            {uploading ? "Uploading…" : "Upload and publish"}
          </button>
        </form>

        <div style={{ display: "grid", gap: 12 }}>
          {projects.length === 0 ? (
            <div style={{ padding: 20, border: "1px dashed rgba(255,255,255,0.15)", color: "#d1c9c1", background: "rgba(255,255,255,0.02)" }}>
              No delivery projects yet.
            </div>
          ) : (
            projects.map((project) => (
              <div key={project.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "18px 20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{project.customerName}</div>
                  <div style={{ fontSize: 12, color: "#c8c0b5", marginTop: 4 }}>{project.customerEmail}</div>
                </div>
                <button type="button" onClick={() => setProjectId(project.id)} style={{ color: "#d4b37a", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", padding: "9px 12px" }}>Select project</button>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
