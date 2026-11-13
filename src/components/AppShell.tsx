"use client";

import React, { useState, useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  IconCalendar,
  IconCheckSquare,
  IconChevronLeft,
  IconChevronRight,
  IconCrown,
  IconFileText,
  IconLayers,
  IconMenu,
  IconPlus,
  IconSearch,
  IconShield,
  IconUser,
  IconX,
} from "./Icons";
import { ThemeToggle } from "./ThemeProvider";
import { CommandPalette } from "./CommandPalette";

export interface ShellUser {
  id?: string;
  email: string;
  full_name?: string | null;
  department?: string | null;
  role: "employee" | "admin" | "super_admin";
}

interface NavGroup {
  label: string;
  links: {
    label: string;
    href: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    active: boolean;
    highlight?: boolean;
  }[];
}

const SIDEBAR_EVENT = "yh-sidebar-change";

function subscribeCollapsed(callback: () => void) {
  window.addEventListener(SIDEBAR_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(SIDEBAR_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getCollapsedSnapshot(): boolean {
  try {
    return localStorage.getItem("yh_sidebar_collapsed") === "true";
  } catch {
    return false;
  }
}

interface SidebarContentProps {
  mobile?: boolean;
  collapsed: boolean;
  navGroups: NavGroup[];
  fullName: string;
  initials: string;
  role: ShellUser["role"];
  isSuperAdmin: boolean;
  onToggleCollapse: () => void;
  onNavigate?: () => void;
}

function SidebarContent({
  mobile = false,
  collapsed,
  navGroups,
  fullName,
  initials,
  role,
  isSuperAdmin,
  onToggleCollapse,
  onNavigate,
}: SidebarContentProps) {
  return (
    <>
      {/* Brand */}
      <div className={`flex h-16 items-center border-b border-sidebar-border px-3 ${collapsed && !mobile ? "justify-center" : "gap-3"}`}>
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-3 min-w-0" title="YETAF Holding">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-border">
            <Image src="/logo.jpg" alt="YETAF" width={96} height={96} className="h-full w-full object-contain" priority />
          </div>
          {(!collapsed || mobile) && (
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight text-sidebar-foreground truncate">YETAF Holding</p>
              <p className="text-[10px] text-muted-foreground truncate">Executive Portal</p>
            </div>
          )}
        </Link>
      </div>

      {/* Nav Groups */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            {(!collapsed || mobile) && (
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.links.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    title={collapsed && !mobile ? link.label : undefined}
                    onClick={onNavigate}
                    className={`group flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-all duration-100 ${
                      collapsed && !mobile ? "justify-center" : ""
                    } ${
                      link.active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <Icon
                      size={16}
                      className={`shrink-0 ${
                        link.active ? "text-brand" : "text-muted-foreground group-hover:text-sidebar-accent-foreground"
                      }`}
                    />
                    {(!collapsed || mobile) && (
                      <span className="truncate">{link.label}</span>
                    )}
                    {(!collapsed || mobile) && link.active && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Quick file card */}
        {(!collapsed || mobile) && (
          <div className="mx-1 mt-2 rounded-lg border border-dashed border-border bg-muted/40 p-3">
            <p className="text-xs font-semibold text-foreground">File a report</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Corporate governance templates</p>
            <div className="mt-2.5 flex flex-col gap-1.5">
              <Link
                href="/reports/new/weekly"
                onClick={onNavigate}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <IconPlus size={12} />
                Weekly Filing
              </Link>
              <Link
                href="/reports/new/monthly"
                onClick={onNavigate}
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                <IconFileText size={12} className="text-muted-foreground" />
                Monthly Filing
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2 space-y-1">
        <div className={`flex items-center gap-2 rounded-md p-2 ${collapsed && !mobile ? "justify-center" : ""}`}>
          <ThemeToggle showLabel={!collapsed || mobile} />
        </div>

        <Link
          href="/profile"
          onClick={onNavigate}
          className={`flex items-center gap-2.5 rounded-md p-2 transition-colors hover:bg-sidebar-accent ${collapsed && !mobile ? "justify-center" : ""}`}
        >
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
              isSuperAdmin
                ? "bg-amber-950 text-amber-300 ring-1 ring-amber-500/40"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {initials}
          </div>
          {(!collapsed || mobile) && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-sidebar-foreground leading-tight">{fullName}</p>
              <p className="truncate text-[10px] text-muted-foreground capitalize">
                {isSuperAdmin ? "CEO · Super Admin" : role === "admin" ? "Administrator" : "Staff Member"}
              </p>
            </div>
          )}
        </Link>

        {(!collapsed || mobile) && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <IconChevronLeft size={14} />
            <span>Collapse</span>
          </button>
        )}

        {collapsed && !mobile && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Expand sidebar"
            className="hidden lg:flex w-full items-center justify-center rounded-md py-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <IconChevronRight size={14} />
          </button>
        )}
      </div>
    </>
  );
}

interface AppShellProps {
  user: ShellUser | null;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AppShell({ user, title, subtitle, children }: AppShellProps) {
  const pathname = usePathname() || "";
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    getCollapsedSnapshot,
    () => false
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function toggleCollapse() {
    const next = !collapsed;
    try {
      localStorage.setItem("yh_sidebar_collapsed", String(next));
    } catch {}
    window.dispatchEvent(new Event(SIDEBAR_EVENT));
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const role = user?.role || "employee";
  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "admin" || isSuperAdmin;
  const fullName = user?.full_name || user?.email?.split("@")[0] || "Executive";
  const initials = fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  const navGroups: NavGroup[] = [
    {
      label: "Overview",
      links: [
        {
          label: isSuperAdmin ? "CEO Command Center" : "Dashboard",
          href: "/dashboard",
          icon: IconLayers,
          active: pathname === "/dashboard",
        },
        {
          label: isAdmin ? "Tasks & Alerts" : "My Tasks",
          href: "/tasks",
          icon: IconCheckSquare,
          active: pathname.startsWith("/tasks"),
        },
      ],
    },
    {
      label: "Reports",
      links: [
        {
          label: "New Weekly Report",
          href: "/reports/new/weekly",
          icon: IconCalendar,
          active: pathname.startsWith("/reports/new/weekly"),
        },
        {
          label: "New Monthly Report",
          href: "/reports/new/monthly",
          icon: IconFileText,
          active: pathname.startsWith("/reports/new/monthly"),
        },
      ],
    },
    ...(isAdmin
      ? [
          {
            label: "Administration",
            links: [
              {
                label: isSuperAdmin ? "Governance Console" : "Admin Console",
                href: "/admin",
                icon: isSuperAdmin ? IconCrown : IconShield,
                active: pathname.startsWith("/admin"),
                highlight: isSuperAdmin,
              },
            ],
          },
        ]
      : []),
    {
      label: "Account",
      links: [
        {
          label: "Profile & Security",
          href: "/profile",
          icon: IconUser,
          active: pathname.startsWith("/profile"),
        },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-in-out z-30 shrink-0 sticky top-0 h-screen ${
          collapsed ? "w-[60px]" : "w-[240px]"
        }`}
      >
        <SidebarContent
          collapsed={collapsed}
          navGroups={navGroups}
          fullName={fullName}
          initials={initials}
          role={role}
          isSuperAdmin={isSuperAdmin}
          onToggleCollapse={toggleCollapse}
        />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 flex w-[260px] flex-col border-r border-sidebar-border bg-sidebar shadow-2xl animate-in slide-in-from-left">
            <div className="absolute right-3 top-3">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <IconX size={16} />
              </button>
            </div>
            <SidebarContent
              mobile
              collapsed={collapsed}
              navGroups={navGroups}
              fullName={fullName}
              initials={initials}
              role={role}
              isSuperAdmin={isSuperAdmin}
              onToggleCollapse={toggleCollapse}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              aria-label="Open menu"
            >
              <IconMenu size={18} />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {title || "Executive Portal"}
              </span>
              {subtitle && (
                <span className="hidden sm:inline text-xs text-muted-foreground">
                  / {subtitle}
                </span>
              )}
            </div>

            <div className="hidden md:flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <span suppressHydrationWarning>
                Q{Math.ceil((new Date().getMonth() + 1) / 3)} {new Date().getFullYear()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search / Command Palette */}
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <IconSearch size={13} />
              <span className="hidden sm:inline">Search...</span>
              <kbd className="hidden sm:inline-flex items-center rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                ⌘K
              </kbd>
            </button>

            {/* New Report */}
            <Link
              href="/reports/new/weekly"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <IconPlus size={13} />
              New Report
            </Link>

            {/* Theme */}
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {/* Separator */}
            <div className="hidden sm:block h-5 w-px bg-border" />

            {/* Avatar */}
            <div className="relative" ref={avatarRef}>
              <button
                type="button"
                onClick={() => setAvatarOpen((p) => !p)}
                className="flex items-center gap-2 rounded-md p-1 transition-colors hover:bg-muted"
                title={fullName}
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${
                    isSuperAdmin
                      ? "bg-amber-950 text-amber-300 ring-1 ring-amber-500/40"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {initials}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-medium text-foreground leading-tight">{fullName}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">
                    {isSuperAdmin ? "CEO" : role === "admin" ? "Admin" : "Staff"}
                  </p>
                </div>
              </button>

              {avatarOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 rounded-lg border border-border bg-popover p-1 shadow-lg z-50 animate-in fade-in-50">
                  <div className="px-2 py-1.5 border-b border-border mb-1">
                    <p className="text-xs font-semibold text-foreground truncate">{fullName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setAvatarOpen(false)}
                    className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <IconUser size={14} className="text-muted-foreground group-hover:text-accent-foreground" />
                    Profile & Settings
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setAvatarOpen(false)}
                      className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <IconShield size={14} className="text-muted-foreground group-hover:text-accent-foreground" />
                      Admin Console
                    </Link>
                  )}
                  <div className="my-1 border-t border-border" />
                  <a
                    href="/logout"
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
                  >
                    Sign out
                  </a>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 w-full">{children}</main>

        {/* Command Palette */}
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          isPrivileged={isAdmin}
          isSuperAdmin={isSuperAdmin}
        />
      </div>
    </div>
  );
}
