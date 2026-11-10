"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconCalendar,
  IconCommand,
  IconCrown,
  IconDownload,
  IconFileText,
  IconPlus,
  IconSearch,
  IconShield,
  IconUser,
  IconX,
} from "./Icons";

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  href?: string;
  action?: () => void;
  badge?: string;
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
    {
      id: "dashboard",
      title: isSuperAdmin ? "CEO Executive Command Center" : "Dashboard Overview",
      subtitle: "View latest performance submissions and status",
      icon: isSuperAdmin ? IconCrown : IconFileText,
      href: "/dashboard",
    },
    {
      id: "new-weekly",
      title: "New Weekly Performance Report",
      subtitle: "7-Section operational report template",
      icon: IconPlus,
      href: "/reports/new/weekly",
      badge: "Weekly",
    },
    {
      id: "new-monthly",
      title: "New Monthly Progress Report",
      subtitle: "Strategic directives & milestones template",
      icon: IconPlus,
      href: "/reports/new/monthly",
      badge: "Monthly",
    },
    ...(isPrivileged
      ? [
          {
            id: "users",
            title: isSuperAdmin ? "CEO User & Privilege Governance" : "Admin User Accounts",
            subtitle: "Create and manage corporate staff accounts",
            icon: isSuperAdmin ? IconCrown : IconShield,
            href: "/admin?tab=team",
            badge: "Admin",
          },
          {
            id: "export-csv",
            title: "Download Portfolio Submissions Summary (CSV)",
            subtitle: "Excel-ready spreadsheet with all group report metrics",
            icon: IconDownload,
            action: () => {
              window.location.href = "/api/reports/export/csv";
            },
            badge: "Excel",
          },
        ]
      : []),
    {
      id: "profile",
      title: "My Profile & Security",
      subtitle: "Update name, department, or change corporate password",
      icon: IconUser,
      href: "/profile",
    },
  ];

  const filtered = items.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(query.toLowerCase()) ||
      (item.badge && item.badge.toLowerCase().includes(query.toLowerCase()))
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // open handled by parent or state
        }
      }

      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = filtered[selectedIndex];
        if (selected) {
          if (selected.action) selected.action();
          else if (selected.href) router.push(selected.href);
          onClose();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose, router]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-24 bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in-50">
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center border-b border-border px-3.5 py-3">
          <IconSearch size={16} className="text-muted-foreground mr-2.5 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No matching pages or actions found.
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Quick Navigation &amp; Actions
              </div>
              {filtered.map((item, index) => {
                const Icon = item.icon;
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.action) item.action();
                      else if (item.href) router.push(item.href);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs transition-colors ${
                      isSelected
                        ? "bg-accent/10 text-foreground font-semibold"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-md border ${
                          isSelected
                            ? "border-accent/40 bg-accent text-accent-foreground"
                            : "border-border bg-card text-muted-foreground"
                        }`}
                      >
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0 truncate">
                        <p className="text-foreground font-medium leading-tight truncate">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    {item.badge && (
                      <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground border border-border">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-border bg-muted/40 px-3.5 py-2 text-[11px] text-muted-foreground flex items-center justify-between">
          <span>Navigate with &uarr; &darr; arrows &middot; Select with Enter</span>
          <span className="font-mono text-[10px]">YETAF HOLDING</span>
        </div>
      </div>
    </div>
  );
}

