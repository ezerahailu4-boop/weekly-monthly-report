"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { IconBuilding, IconEdit, IconPlus, IconShield, IconX } from "./Icons";
import { Input } from "./ui/Input";

interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  window_mode?: string | null;
  system_name?: string | null;
  sla_response_days?: number | null;
}

export function AdminCompanies() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/companies")
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load companies");
        return r.json();
      })
      .then((data) => setCompanies(data.companies || []))
      .catch((err) => setMsg({ type: "err", text: err.message }))
      .finally(() => setLoading(false));
  }, []);

  function slugify(input: string) {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setName(e.target.value);
    if (!slug) setSlug(slugify(e.target.value));
  }

  async function uploadLogo(file: File | undefined, onUploaded: (url: string) => void) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMsg({ type: "err", text: "Choose an image file for the company logo." });
      return;
    }
    setUploadingLogo(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Logo upload failed.");
      onUploaded(data.file.url);
    } catch (err: unknown) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "Logo upload failed." });
    } finally {
      setUploadingLogo(false);
    }
  }

  async function saveCompanyLogo(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCompany) return;
    setSaving(true);
    setMsg(null);
    try {
      const response = await fetch(`/api/admin/companies/${editingCompany.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo_url: editLogoUrl.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Could not save the company logo.");
      setCompanies((current) => current.map((company) => company.id === editingCompany.id ? { ...company, ...data.company } : company));
      setEditingCompany(null);
      setMsg({ type: "ok", text: `Logo updated for ${editingCompany.name}.` });
      router.refresh();
    } catch (err: unknown) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "Could not save the company logo." });
    } finally {
      setSaving(false);
    }
  }

  async function createCompany(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim(), logo_url: logoUrl.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMsg({ type: "err", text: data.error || "Failed to create company." });
      } else {
        setCompanies((prev) => [...prev, data.company]);
        setOpen(false);
        setName("");
        setSlug("");
        setLogoUrl("");
        setMsg({ type: "ok", text: `Company "${data.company.name}" created.` });
        router.refresh();
      }
    } catch (err: unknown) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "Network error" });
    } finally {
      setSaving(false);
    }
  }

  async function toggleCompany(id: string, isActive: boolean) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/companies/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMsg({ type: "err", text: data.error || "Failed to update company." });
      } else {
        setCompanies((prev) =>
          prev.map((c) => (c.id === id ? data.company : c))
        );
        router.refresh();
      }
    } catch (err: unknown) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "Network error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            <IconBuilding size={20} className="mr-2 text-muted-foreground" />
            Companies
          </h2>
          <p className="text-xs text-muted-foreground">
            Each company owns its own deadline window, letterhead/print format,
            logo, and SLA settings.
          </p>
        </div>

        <button
          onClick={() => { setOpen(true); setMsg(null); }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          <IconPlus size={14} />
          Add Company
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          Loading companies…
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground">
                  <th className="pb-3 px-4">Company</th>
                  <th className="pb-3 px-4">Slug</th>
                  <th className="pb-3 px-4 text-center">Window</th>
                  <th className="pb-3 px-4 text-center">SLA (days)</th>
                  <th className="pb-3 px-4 text-center">Status</th>
                  <th className="pb-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {c.logo_url ? (
                          <Image src={c.logo_url} alt={`${c.name} logo`} width={36} height={36} unoptimized className="h-9 w-9 shrink-0 rounded-lg border border-border bg-white object-contain p-1" />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold tracking-wide text-primary">{c.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div>
                        )}
                        <div>
                          <p className="font-medium text-foreground">{c.name}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">
                            {c.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-muted-foreground">
                      {c.slug}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          c.window_mode === "scheduled"
                            ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                            : c.window_mode === "force_open"
                            ? "bg-amber-500/10 text-amber-700 border border-amber-500/20"
                            : "bg-rose-500/10 text-rose-700 border border-rose-500/20"
                        }`}
                      >
                        {c.window_mode === "scheduled" ? "Scheduled" : c.window_mode === "force_open" ? "Force Open" : "Force Closed"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center tabular-nums text-foreground">
                      {c.sla_response_days ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={c.is_active}
                          onChange={() => toggleCompany(c.id, c.is_active)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 rounded-full bg-gray-200 peer-checked:bg-emerald-600 after:absolute after:left-[2px] after:top-[2px] after:rounded-full after:h-3 after:w-3 after:bg-white after:transition-all after:peer-checked:translate-x-4"></div>
                        <span
                          className={`ml-2 text-[11px] font-medium ${
                            c.is_active ? "text-foreground" : "text-muted-foreground/50"
                          }`}
                        >
                          {c.is_active ? "Active" : "Inactive"}
                        </span>
                      </label>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-3">
                        <button type="button" onClick={() => { setEditingCompany(c); setEditLogoUrl(c.logo_url || ""); setMsg(null); }} className="inline-flex items-center gap-1 text-xs font-medium text-foreground hover:text-accent"><IconEdit size={13} />Logo</button>
                        <Link href={`/admin?tab=settings&company_id=${c.id}`} className="inline-flex items-center text-xs font-medium text-primary hover:underline">Manage Settings<IconShield size={12} className="ml-1" /></Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {companies.length === 0 && (
            <div className="mt-6 text-center py-8 text-muted-foreground text-sm">
              No companies yet. Add one to get started.
            </div>
          )}
        </div>
      )}

      {msg && (
        <div
          className={`rounded-lg border p-3 text-xs font-medium ${
            msg.type === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-brand"
              : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Create company dialog */}
      <div
        className={`fixed inset-0 z-50 ${open ? "flex" : "hidden"} items-center justify-center`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
        <div role="dialog" aria-modal="true" aria-labelledby="add-company-title" className="relative max-h-[calc(100dvh-2rem)] overflow-y-auto bg-card rounded-xl border border-border p-5 shadow-xl w-full sm:max-w-md sm:p-7 animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 id="add-company-title" className="text-base font-bold text-foreground">Add Company</h3>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <form onSubmit={createCompany} className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Company Name *</label>
              <Input
                value={name}
                onChange={handleNameChange}
                placeholder="e.g. Team Transport"
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">URL Slug *</label>
              <Input
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="team-transport"
                className="text-sm font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Used in URLs and as a unique identifier.
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Logo URL</label>
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                Used in the portal, company selector, and official reports. Paste a public image URL or upload a logo.
              </p>
              <input type="file" accept="image/*" aria-label="Upload company logo" disabled={uploadingLogo} onChange={(event) => uploadLogo(event.target.files?.[0], setLogoUrl)} className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-xs file:font-semibold file:text-foreground hover:file:bg-muted/70" />
              {uploadingLogo && <p className="text-xs text-muted-foreground">Uploading logo…</p>}
              {logoUrl && <Image src={logoUrl} alt="Company logo preview" width={120} height={72} unoptimized className="h-16 w-28 rounded-lg border border-border bg-white object-contain p-2" />}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex w-fit items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !name || !slug}
                className="flex w-fit items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? "Creating…" : "Create Company"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {editingCompany && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form onSubmit={saveCompanyLogo} role="dialog" aria-modal="true" aria-labelledby="edit-company-logo-title" className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div><h3 id="edit-company-logo-title" className="text-base font-bold text-foreground">Company Logo</h3><p className="mt-1 text-xs text-muted-foreground">{editingCompany.name}</p></div>
              <button type="button" onClick={() => setEditingCompany(null)} aria-label="Close" className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><IconX size={16} /></button>
            </div>
            <label className="block space-y-1.5 text-xs font-semibold text-foreground">
              Logo URL
              <Input value={editLogoUrl} onChange={(event) => setEditLogoUrl(event.target.value)} placeholder="https://… or upload a file" className="text-sm font-normal" />
            </label>
            <input type="file" accept="image/*" aria-label="Upload company logo" disabled={uploadingLogo} onChange={(event) => uploadLogo(event.target.files?.[0], setEditLogoUrl)} className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-xs file:font-semibold file:text-foreground hover:file:bg-muted/70" />
            {uploadingLogo && <p className="text-xs text-muted-foreground">Uploading logo…</p>}
            {editLogoUrl ? <Image src={editLogoUrl} alt="Company logo preview" width={120} height={72} unoptimized className="h-16 w-28 rounded-lg border border-border bg-white object-contain p-2" /> : <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No logo selected. The portal will use the YETAF brand mark.</p>}
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <button type="button" onClick={() => setEditingCompany(null)} className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted">Cancel</button>
              <button type="submit" disabled={saving || uploadingLogo} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">{saving ? "Saving…" : "Save Logo"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
