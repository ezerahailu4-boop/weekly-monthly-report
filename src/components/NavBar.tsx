"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { IconCrown, IconFileText, IconPlus, IconShield, IconUser } from "./Icons";
import { ThemeToggle } from "./ThemeProvider";

interface NavUser {
  email: string;
  full_name?: string | null;
  department?: string | null;
  role: "employee" | "admin" | "super_admin";
}

export default function NavBar({ user }: { user: NavUser | null }) {
  const pathname = usePathname();
  const [newReportOpen, setNewReportOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const newReportRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const fullName = user?.full_name || user?.email || null;
  const role = user?.role || "employee";
  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "admin" || isSuperAdmin;
  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "YH";

  useEffect(() => {
    setNewReportOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (newReportRef.current && !newReportRef.current.contains(e.target as Node))
        setNewReportOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg ring-1 ring-border transition-transform group-hover:scale-105">
            <Image src="/logo.jpg" alt="YETAF" width={64} height={64} className="h-full w-full object-contain" priority />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold tracking-tight text-foreground">YETAF Holding</span>
              {isSuperAdmin && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-950 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-amber-500/30">
                  <IconCrown size={9} />
                  CEO
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">Executive Reporting Portal</p>
          </div>
        </Link>

        {user ? (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {isSuperAdmin ? "CEO Overview" : "Dashboard"}
            </Link>

            {/* New Report Dropdown */}
            <div className="relative" ref={newReportRef}>
              <button
                type="button"
                onClick={() => { setNewReportOpen((p) => !p); setProfileOpen(false); }}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <IconPlus size={14} />
                <span className="hidden sm:inline">New Report</span>
              </button>
              {newReportOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 rounded-lg border border-border bg-popover p-1 shadow-lg z-50 animate-in fade-in-50">
                  <Link
                    href="/reports/new/weekly"
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <IconFileText size={14} className="text-muted-foreground" />
                    Weekly Report
                  </Link>
                  <Link
                    href="/reports/new/monthly"
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <IconFileText size={14} className="text-muted-foreground" />
                    Monthly Report
                  </Link>
                </div>
              )}
            </div>

            {isAdmin && (
              <Link
                href="/admin"
                className={`hidden sm:inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                  isSuperAdmin
                    ? "bg-amber-950 text-amber-300 ring-1 ring-amber-500/30 hover:bg-amber-900"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                }`}
              >
                {isSuperAdmin ? <IconCrown size={13} /> : <IconShield size={13} />}
                <span>{isSuperAdmin ? "Governance" : "Admin"}</span>
              </Link>
            )}

            <ThemeToggle />

            <div className="h-5 w-px bg-border hidden sm:block" />

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => { setProfileOpen((p) => !p); setNewReportOpen(false); }}
                className="flex items-center gap-2 rounded-md p-1 transition-colors hover:bg-accent"
                title={fullName || "Profile"}
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

              {profileOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 rounded-lg border border-border bg-popover p-1 shadow-lg z-50 animate-in fade-in-50">
                  <div className="px-2 py-1.5 border-b border-border mb-1">
                    <p className="text-xs font-semibold text-foreground truncate">{fullName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <IconUser size={14} className="text-muted-foreground" />
                    Profile & Settings
                  </Link>
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
        ) : (
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className="rounded-md bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
