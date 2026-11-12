"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconCalendar,
  IconCheckSquare,
  IconCrown,
  IconDownload,
  IconFileText,
  IconPlus,
  IconSearch,
  IconShield,
  IconSliders,
  IconUser,
} from "./Icons";

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  href?: string;
  action?: () => void;
  badge?: string;
  group: string;
}

function triggerCsvDownload() {
  const link = document.createElement("a");
  link.href = "/api/reports/export/csv";
  link.download = "";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function CommandPalette({
  isOpen,
  onClose,
  isPrivileged = false,
  isSuperAdmin = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  isPrivileged?: boolean;
  isSuperAdmin?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const items: CommandItem[] = [
    { id: "dashboard", group: "Navigation", title: isSuperAdmin ? "CEO Command Center" : "Dashboard", subtitle: "View submissions and performance overview", icon: isSuperAdmin ? IconCrown : IconFileText, href: "/dashboard" },
    { id: "tasks", group: "Navigation", title: isPrivileged ? "Tasks & Telegram" : "My Tasks", subtitle: "Track and complete assigned tasks", icon: IconCheckSquare, href: "/tasks", badge: "Tasks" },
    { id: "new-weekly", group: "Reports", title: "New Weekly Report", subtitle: "7-section operational performance template", icon: IconPlus, href: "/reports/new/weekly", badge: "Weekly" },
    { id: "new-monthly", group: "Reports", title: "New Monthly Report", subtitle: "Strategic directives & milestones template", icon: IconCalendar, href: "/reports/new/monthly", badge: "Monthly" },
    ...(isPrivileged ? [
      { id: "users", group: "Admin", title: "User Management", subtitle: "Create and manage staff accounts", icon: isSuperAdmin ? IconCrown : IconShield, href: "/admin?tab=team", badge: "Admin" },
      { id: "settings", group: "Admin", title: "Window & Telegram Settings", subtitle: "Configure reporting schedule and bot", icon: IconSliders, href: "/admin?tab=settings", badge: "Settings" },
      { id: "export", group: "Admin", title: "Export All Reports (CSV)", subtitle: "Download Excel-ready summary spreadsheet", icon: IconDownload, action: triggerCsvDownload, badge: "Export" },
    ] : []),
    { id: "profile", group: "Account", title: "Profile & Security", subtitle: "Update name, department, or password", icon: IconUser, href: "/profile" },
  ];

  const filtered = query
    ? items.filter((i) =>
        i.title.toLowerCase().includes(query.toLowerCase()) ||
        i.subtitle.toLowerCase().includes(query.toLowerCase()) ||
        (i.badge?.toLowerCase().includes(query.toLowerCase()))
      )
    : items;

  const groups = Array.from(new Set(filtered.map((i) => i.group)));

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((p) => (p + 1) % (filtered.length || 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((p) => (p - 1 + filtered.length) % (filtered.length || 1)); }
      else if (e.key === "Enter") {
        e.preventDefault();
        const sel = filtered[selectedIndex];
        if (sel) { if (sel.action) sel.action(); else if (sel.href) router.push(sel.href); onClose(); }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose, router]);

  if (!isOpen) return null;

  let globalIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[15vh] backdrop-blur-sm animate-in fade-in-50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-popover shadow-2xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-3">
          <IconSearch size={15} className="shrink-0 text-muted-foreground" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[320px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No results found.</p>
          ) : (
            groups.map((group) => (
              <div key={group} className="mb-2">
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{group}</p>
                {filtered.filter((i) => i.group === group).map((item) => {
                  const idx = globalIndex++;
                  const Icon = item.icon;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { if (item.action) item.action(); else if (item.href) router.push(item.href); onClose(); }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`group flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors ${
                        isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${isSelected ? "border-border bg-background text-foreground" : "border-border bg-muted text-muted-foreground"}`}>
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-medium ${isSelected ? "text-accent-foreground" : "text-foreground group-hover:text-accent-foreground"}`}>{item.title}</p>
                        <p className={`truncate text-xs ${isSelected ? "text-accent-foreground/80" : "text-muted-foreground group-hover:text-accent-foreground/80"}`}>{item.subtitle}</p>
                      </div>
                      {item.badge && (
                        <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${isSelected ? "border-accent-foreground/20 bg-background/15 text-accent-foreground" : "border-border bg-muted text-muted-foreground group-hover:border-accent-foreground/20 group-hover:bg-background/15 group-hover:text-accent-foreground"}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
          <span>↑↓ navigate · Enter select · Esc close</span>
          <span className="font-mono text-[10px]">YETAF HOLDING</span>
        </div>
      </div>
    </div>
  );
}
