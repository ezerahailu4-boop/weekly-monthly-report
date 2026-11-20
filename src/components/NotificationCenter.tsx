"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type Notice = { id: string; title: string; message: string; href: string | null; kind: string; read_at: string | null; created_at: string };

export function NotificationCenter() {
  const [items, setItems] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (response.ok) setItems((await response.json()).notifications ?? []);
    } catch { /* Notifications are supplementary; keep the workspace usable offline. */ }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => { void refresh(); }, 0);
    const timer = window.setInterval(refresh, 60_000);
    const close = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => { window.clearTimeout(initialLoad); window.clearInterval(timer); document.removeEventListener("mousedown", close); };
  }, [refresh]);

  const unread = items.filter((item) => !item.read_at).length;
  async function markRead(id?: string) {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(id ? { id } : { all: true }) });
    setItems((current) => current.map((item) => !id || item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
  }

  return <div className="relative" ref={root}>
    <button type="button" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-expanded={open} onClick={() => setOpen((value) => !value)} className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>
      {unread > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-accent px-1 text-center text-[9px] font-bold leading-4 text-white">{unread > 9 ? "9+" : unread}</span>}
    </button>
    {open && <section className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl" aria-label="Notifications">
      <div className="flex items-center justify-between border-b border-border px-4 py-3"><div><h2 className="text-sm font-semibold text-foreground">Notifications</h2><p className="text-[11px] text-muted-foreground">Updates that need your attention</p></div>{unread > 0 && <button type="button" onClick={() => void markRead()} className="text-[11px] font-semibold text-accent hover:underline">Mark all read</button>}</div>
      <div className="max-h-[min(26rem,70vh)] overflow-y-auto">
        {items.length ? items.map((item) => {
          const content = <div className={`border-b border-border/70 px-4 py-3 transition hover:bg-muted/60 ${!item.read_at ? "bg-accent/[0.045]" : ""}`}><div className="flex gap-3"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read_at ? "bg-border" : item.kind === "success" ? "bg-emerald-500" : item.kind === "warning" ? "bg-amber-500" : "bg-accent"}`} /><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-foreground">{item.title}</p><p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.message}</p><p className="mt-1.5 text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p></div></div></div>;
          return item.href ? <Link key={item.id} href={item.href} onClick={() => { if (!item.read_at) void markRead(item.id); setOpen(false); }}>{content}</Link> : <button key={item.id} type="button" onClick={() => { if (!item.read_at) void markRead(item.id); }} className="block w-full text-left">{content}</button>;
        }) : <div className="px-5 py-10 text-center"><div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">✓</div><p className="text-xs font-semibold text-foreground">You’re all caught up</p><p className="mt-1 text-[11px] text-muted-foreground">New updates will appear here.</p></div>}
      </div>
    </section>}
  </div>;
}
