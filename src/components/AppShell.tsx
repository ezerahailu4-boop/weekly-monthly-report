"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBuilding,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconCrown,
  IconDownload,
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

interface AppShellProps {
  user: ShellUser | null;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AppShell({
  user,
  title,
  subtitle,
  children,
}: AppShellProps) {
  const pathname = usePathname() || "";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Restore collapsed state from localStorage if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem("yh_sidebar_collapsed");
      if (saved !== null) {
        setCollapsed(saved === "true");
      }
    } catch {
      // ignore
    }
  }, []);

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("yh_sidebar_collapsed", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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

  const navLinks = [
    {
      label: isSuperAdmin ? "CEO Command Center" : "Executive Dashboard",
      shortLabel: "Dashboard",
      href: "/dashboard",
      icon: IconLayers,
      active: pathname === "/dashboard",
    },
    {
      label: "New Weekly Report",
      shortLabel: "Weekly",
      href: "/reports/new/weekly",
      icon: IconCalendar,
      active: pathname.startsWith("/reports/new/weekly"),
    },
    {
      label: "New Monthly Report",
      shortLabel: "Monthly",
      href: "/reports/new/monthly",
      icon: IconFileText,
      active: pathname.startsWith("/reports/new/monthly"),
    },
    ...(isAdmin
      ? [
          {
            label: isSuperAdmin ? "Governance & Users" : "Admin Console",
            shortLabel: "Admin",
            href: "/admin",
            icon: isSuperAdmin ? IconCrown : IconShield,
            active: pathname.startsWith("/admin"),
            highlight: isSuperAdmin,
          },
        ]
      : []),
    {
      label: "My Profile & Security",
      shortLabel: "Profile",
      href: "/profile",
      icon: IconUser,
      active: pathname.startsWith("/profile"),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* ======================================================== */}
      {/* DESKTOP COLLAPSIBLE SIDEBAR                             */}
      {/* ======================================================== */}
      <aside
        className={`hidden lg:flex flex-col border-r border-border bg-card transition-all duration-200 z-30 shrink-0 sticky top-0 h-screen ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Brand header */}
        <div className="h-16 border-b border-border flex items-center px-4 justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 overflow-hidden group"
            title="YETAF HOLDING"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 dark:bg-emerald-950/60 text-white dark:text-emerald-400 shadow-xs ring-1 ring-border group-hover:scale-105 transition-transform">
              <IconBuilding size={20} className="text-emerald-400" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-bold text-sm tracking-tight text-foreground truncate">
                    YETAF
                  </span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    Holding
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider truncate">
                  Executive Reporting
                </p>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {!collapsed && (
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Navigation
            </div>
          )}

          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                title={collapsed ? link.label : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
                  link.active
                    ? "bg-accent/10 text-accent font-semibold border-l-2 border-accent"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                } ${collapsed ? "justify-center px-0" : ""}`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                    link.active
                      ? "text-accent"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon size={18} />
                </div>
                {!collapsed && <span className="truncate">{link.label}</span>}
              </Link>
            );
          })}

          {/* Quick submission button when expanded */}
          {!collapsed && (
            <div className="pt-6 px-1">
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/40 p-3">
                <p className="text-[11px] font-semibold text-foreground">
                  Need to file a report?
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Templates follow corporate governance standards.
                </p>
                <div className="mt-2.5 flex flex-col gap-1.5">
                  <Link
                    href="/reports/new/weekly"
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    <IconPlus size={13} />
                    <span>Weekly Filing</span>
                  </Link>
                  <Link
                    href="/reports/new/monthly"
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                  >
                    <IconFileText size={13} className="text-muted-foreground" />
                    <span>Monthly Filing</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom user card & tools */}
        <div className="border-t border-border p-3 space-y-2">
          {/* Theme switcher */}
          <div
            className={`flex items-center justify-between px-2 py-1.5 rounded-lg bg-muted/40 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            {!collapsed && (
              <span className="text-[11px] font-medium text-muted-foreground">
                Theme
              </span>
            )}
            <ThemeToggle showLabel={!collapsed} />
          </div>

          {/* Profile pill */}
          <div
            className={`flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/20 p-2 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <Link
              href="/profile"
              title={fullName}
              className="flex items-center gap-2 min-w-0"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isSuperAdmin
                    ? "bg-zinc-950 text-amber-300 ring-1 ring-amber-500/40"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {initials}
              </div>
              {!collapsed && (
                <div className="min-w-0 truncate text-left">
                  <p className="text-xs font-semibold text-foreground truncate leading-tight">
                    {fullName}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate capitalize">
                    {isSuperAdmin
                      ? "CEO (Super Admin)"
                      : role === "admin"
                      ? "Admin"
                      : "Staff"}
                  </p>
                </div>
              )}
            </Link>
          </div>

          {/* Sidebar collapse button */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={toggleCollapse}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <IconChevronRight size={16} />
              ) : (
                <>
                  <IconChevronLeft size={16} />
                  <span className="text-[11px]">Collapse sidebar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* MOBILE DRAWER SHEET                                      */}
      {/* ======================================================== */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer container */}
          <div className="fixed inset-y-0 left-0 w-72 bg-card border-r border-border p-4 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200">
            <div>
              {/* Header with close button */}
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <IconBuilding size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <span className="font-display font-bold text-sm tracking-tight text-foreground">
                      YETAF
                    </span>
                    <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      Holding
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <IconX size={18} />
                </button>
              </div>

              {/* Navigation list */}
              <div className="py-4 space-y-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
                        link.active
                          ? "bg-accent/10 text-accent font-semibold border-l-2 border-accent"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon size={18} />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Bottom section */}
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs text-muted-foreground">Theme</span>
                <ThemeToggle showLabel />
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted/40 p-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {initials}
                  </div>
                  <div className="min-w-0 truncate">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {fullName}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate capitalize">
                      {role.replace("_", " ")}
                    </p>
                  </div>
                </div>
                <Link
                  href="/logout"
                  className="rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  Sign out
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MAIN CONTENT AREA & TOP BAR                              */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Top Bar */}
        <header className="sticky top-0 z-20 h-16 border-b border-border bg-card/85 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between transition-colors">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Open navigation menu"
            >
              <IconMenu size={20} />
            </button>

            {/* Page title & context */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm sm:text-base text-foreground tracking-tight">
                {title || "Executive Portal"}
              </span>
              {subtitle && (
                <span className="hidden sm:inline-block text-xs text-muted-foreground border-l border-border pl-2">
                  {subtitle}
                </span>
              )}
            </div>

            {/* Week / Period Indicator */}
            <div className="hidden md:flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Current Cycle: Q4 2026</span>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Command Palette Trigger */}
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 hover:bg-muted px-2.5 sm:px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shadow-2xs"
            >
              <IconSearch size={14} />
              <span className="hidden sm:inline">Search &amp; actions...</span>
              <kbd className="hidden sm:inline-flex rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                ⌘K
              </kbd>
            </button>

            {/* Top bar quick new report */}
            <Link
              href="/reports/new/weekly"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-all shadow-2xs"
            >
              <IconPlus size={14} />
              <span>New Report</span>
            </Link>

            {/* Theme toggle in top bar */}
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {/* User Avatar link */}
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-lg p-1 hover:bg-muted transition-colors"
              title={fullName}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  isSuperAdmin
                    ? "bg-zinc-950 text-amber-300 ring-1 ring-amber-500/40"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                }`}
              >
                {initials}
              </div>
            </Link>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="flex-1 w-full">{children}</main>

        {/* Global Command Palette */}
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

