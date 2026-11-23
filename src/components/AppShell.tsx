"use client";

import React, { useState, useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconCalendar,
  IconCheckSquare,
  IconChevronLeft,
  IconChevronRight,
  IconCompass,
  IconCrown,
  IconFileText,
  IconLayers,
  IconMenu,
  IconPlus,
  IconSearch,
  IconShield,
  IconTarget,
  IconUser,
  IconX,
} from "./Icons";
import { ThemeToggle } from "./ThemeProvider";
import { CommandPalette } from "./CommandPalette";
import { Button } from "./ui/Button";
import { NotificationCenter } from "./NotificationCenter";
import { BrandLogo } from "./BrandLogo";

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
      <div
        className={`flex h-16 items-center border-b border-sidebar-border px-3.5 transition-colors ${
          collapsed && !mobile ? "justify-center" : "gap-3"
        } bg-sidebar-light-bg border-sidebar-light-divider`}
      >
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-3 min-w-0 group"
          title="YETAF Holding Follow-up System"
        >
          <BrandLogo size={collapsed && !mobile ? "compact" : "sidebar"} priority className="transition-transform duration-150 group-hover:scale-[1.03]" />
          {(!collapsed || mobile) && (
            <div className="min-w-0">
              <p
                className="text-sm font-bold tracking-tight truncate leading-tight text-sidebar-profile-name"
              >
                Directive Follow-up
              </p>
              <p
                className="text-[11px] font-medium truncate text-sidebar-profile-desc"
              >
                Report Follow-up Center
              </p>
            </div>
          )}
        </Link>
      </div>

      {/* Nav Groups */}
      <div className="flex-1 overflow-y-auto py-3.5 px-2.5 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            {(!collapsed || mobile) && (
              <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-sidebar-section">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.links.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    title={collapsed && !mobile ? link.label : undefined}
                    onClick={onNavigate}
                    className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-150 ${
                      collapsed && !mobile ? "justify-center" : ""
                    } ${
                      link.active
                        ? "bg-sidebar-light-active-bg text-sidebar-light-active-text font-semibold shadow-2xs"
                        : "text-sidebar-light-text hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <span className={`shrink-0 text-sidebar-light-icon ${link.active ? "text-sidebar-active-icon" : ""}`}>
                      <Icon size={16} className="shrink-0" />
                    </span>
                    {(!collapsed || mobile) && (
                      <span className="truncate">{link.label}</span>
                    )}
                    {(!collapsed || mobile) && link.active && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full text-sidebar-active-icon" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Quick filing action card */}
        {(!collapsed || mobile) && (
          <div className="mx-0.5 mt-3 rounded-xl border border-dashed border-sidebar-border bg-card/60 p-3 shadow-2xs">
            <p className="text-xs font-semibold text-foreground">File a report</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Official governance submission
            </p>
            <div className="mt-2.5 flex flex-col gap-1.5">
              <Link
                href="/reports/new/weekly"
                onClick={onNavigate}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-all duration-150 hover:opacity-90 active:scale-[0.98] shadow-2xs"
              >
                <IconPlus size={12} />
                Weekly Report
              </Link>
              <Link
                href="/reports/new/monthly"
                onClick={onNavigate}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-all duration-150 hover:bg-muted active:scale-[0.98]"
              >
                <IconFileText size={12} className="text-muted-foreground" />
                Monthly Report
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2.5 space-y-1.5">
        <div
          className={`flex items-center gap-2 rounded-lg p-1.5 ${
            collapsed && !mobile ? "justify-center" : ""
          }`}
        >
          <ThemeToggle showLabel={!collapsed || mobile} />
        </div>

        <Link
          href="/profile"
          onClick={onNavigate}
          className={`flex items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-sidebar-accent ${
            collapsed && !mobile ? "justify-center" : ""
          }`}
        >
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
              isSuperAdmin
                ? "bg-zinc-950 text-amber-300 ring-1 ring-amber-500/40"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {initials}
          </div>
          {(!collapsed || mobile) && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-sidebar-profile-name leading-tight">
                {fullName}
              </p>
              <p className="truncate text-[10px] text-sidebar-profile-desc">
                {isSuperAdmin
                  ? "Direction · Super Admin"
                  : role === "admin"
                  ? "Administrator"
                  : "Staff Member"}
              </p>
            </div>
          )}
        </Link>

        {(!collapsed || mobile) && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-sidebar-light-text transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer"
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
            className="hidden lg:flex w-full items-center justify-center rounded-lg py-1.5 text-sidebar-light-text transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer"
          >
            <IconChevronRight size={14} />
          </button>
        )}
      </div>
    </>
  );
}

function getBreadcrumbs(pathname: string): { label: string; href?: string }[] {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0 || parts[0] === "dashboard") {
    return [{ label: "Dashboard" }];
  }

  const crumbs: { label: string; href?: string }[] = [{ label: "Dashboard", href: "/dashboard" }];

  if (parts[0] === "directives") {
    crumbs.push({ label: "Directives", href: parts.length > 1 ? "/directives" : undefined });
    if (parts[1]) {
      crumbs.push({ label: "Directive Detail" });
    }
  } else if (parts[0] === "plans") {
    crumbs.push({ label: "Action Plans", href: parts.length > 1 ? "/plans" : undefined });
    if (parts[1]) {
      crumbs.push({ label: "Plan Detail" });
    }
  } else if (parts[0] === "tasks") {
    crumbs.push({ label: "Tasks" });
  } else if (parts[0] === "admin") {
    crumbs.push({ label: "Governance & Administration" });
  } else if (parts[0] === "profile") {
    crumbs.push({ label: "Profile & Security" });
  } else if (parts[0] === "reports") {
    crumbs.push({ label: "Reports" });
    if (parts[1] === "new") {
      crumbs.push({ label: `New ${parts[2] === "monthly" ? "Monthly" : "Weekly"}` });
    } else if (parts[1]) {
      crumbs.push({ label: "Report View" });
    }
  } else if (parts[0] === "warnings") {
    crumbs.push({ label: "Disciplinary Notice" });
  } else {
    crumbs.push({ label: parts[0].charAt(0).toUpperCase() + parts[0].slice(1) });
  }

  return crumbs;
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

  const breadcrumbs = getBreadcrumbs(pathname);

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
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const navGroups: NavGroup[] = [
    {
      label: "Follow-up Center",
      links: [
        {
          label: isSuperAdmin ? "Direction Command" : "Dashboard",
          href: "/dashboard",
          icon: IconLayers,
          active: pathname === "/dashboard",
        },
        {
          label: "Directives",
          href: "/directives",
          icon: IconCompass,
          active: pathname.startsWith("/directives"),
        },
        {
          label: "Action Plans",
          href: "/plans",
          icon: IconTarget,
          active: pathname.startsWith("/plans"),
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
        className={`hidden lg:flex flex-col border-r border-sidebar-border transition-[width] duration-200 ease-in-out z-30 shrink-0 sticky top-0 h-screen ${
          collapsed ? "w-[64px]" : "w-[240px]"
        }`}
        style={{
          backgroundColor: "var(--sidebar-light-bg)",
          borderColor: "var(--sidebar-light-divider)",
        }}
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
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-150"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 flex w-[260px] flex-col border-r border-sidebar-border bg-sidebar-light-bg border-sidebar-light-divider shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="absolute right-3 top-3">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer text-sidebar-light-text"
                aria-label="Close navigation"
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

      {/* Main Container */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Bar with Breadcrumbs */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              aria-label="Open navigation menu"
            >
              <IconMenu size={18} />
            </button>

            {/* Breadcrumb Navigation */}
            <nav className="flex items-center gap-1.5 text-xs min-w-0" aria-label="Breadcrumb">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={crumb.label}>
                    {idx > 0 && <span className="text-muted-foreground/60">/</span>}
                    {crumb.href && !isLast ? (
                      <Link
                        href={crumb.href}
                        className="text-muted-foreground hover:text-foreground transition-colors truncate"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="font-semibold text-foreground truncate">
                        {title && isLast ? title : crumb.label}
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
              {subtitle && (
                <span className="hidden md:inline text-xs text-muted-foreground truncate">
                  · {subtitle}
                </span>
              )}
            </nav>

            <div className="hidden xl:flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span suppressHydrationWarning>
                Q{Math.ceil((new Date().getMonth() + 1) / 3)} {new Date().getFullYear()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <NotificationCenter />
            {/* Quick Search Trigger */}
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer shadow-2xs"
            >
              <IconSearch size={13} />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden sm:inline-flex items-center rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                ⌘K
              </kbd>
            </button>

            {/* Quick Action Button */}
            <Link href="/reports/new/weekly" className="hidden sm:inline-flex">
              <Button variant="primary" size="xs" leftIcon={<IconPlus size={12} />}>
                New Report
              </Button>
            </Link>

            {/* Theme Toggle */}
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {/* User Dropdown */}
            <div className="relative" ref={avatarRef}>
              <button
                type="button"
                onClick={() => setAvatarOpen((p) => !p)}
                className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-muted cursor-pointer"
                title={fullName}
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${
                    isSuperAdmin
                      ? "bg-zinc-950 text-amber-300 ring-1 ring-amber-500/40"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {initials}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-medium text-foreground leading-tight truncate max-w-[120px]">
                    {fullName}
                  </p>
                  <p className="text-[10px] text-muted-foreground capitalize">
                    {isSuperAdmin ? "Direction" : role === "admin" ? "Admin" : "Staff"}
                  </p>
                </div>
              </button>

              {avatarOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-border bg-popover p-1 shadow-lg z-50 animate-in fade-in-50 zoom-in-95 duration-100">
                  <div className="px-2.5 py-2 border-b border-border/80 mb-1">
                    <p className="text-xs font-semibold text-foreground truncate">{fullName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setAvatarOpen(false)}
                    className="group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <IconUser size={13} className="text-muted-foreground group-hover:text-accent-foreground" />
                    Profile & Security
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setAvatarOpen(false)}
                      className="group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <IconShield size={13} className="text-muted-foreground group-hover:text-accent-foreground" />
                      Admin Console
                    </Link>
                  )}
                  <div className="my-1 border-t border-border/80" />
                  <a
                    href="/logout"
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive/10"
                  >
                    Sign out
                  </a>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content View */}
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
