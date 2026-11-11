"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { IconCrown, IconFileText, IconPlus, IconShield } from "./Icons";
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
  const department = user?.department || null;

  const initials = fullName
    ? fullName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "YH";

  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "admin" || isSuperAdmin;

  // Close dropdowns on route change
  useEffect(() => {
    setNewReportOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (newReportRef.current && !newReportRef.current.contains(e.target as Node)) {
        setNewReportOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur-md transition-colors">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3">
        {/* Brand */}
        <Link
          href={user ? "/dashboard" : "/"}
          className="group flex items-center gap-3 transition-opacity hover:opacity-90"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden shadow-xs ring-1 ring-border transition-transform group-hover:scale-105">
            <Image src="/logo.jpg" alt="YETAF Holding" width={80} height={80} className="object-contain w-full h-full" priority />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-base sm:text-lg font-bold tracking-tight text-foreground">
                YETAF
              </span>
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Holding
              </span>
              {isSuperAdmin && (
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-950 px-2 py-0.5 text-[10px] font-bold text-amber-300 ring-1 ring-amber-500/30">
                  <IconCrown size={10} className="text-amber-400" />
                  CEO
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
              Executive Reporting Portal
            </p>
          </div>
        </Link>

        {user ? (
          <nav className="flex items-center gap-2 sm:gap-4 text-sm">
            <Link
              href="/dashboard"
              className="hidden sm:inline-block text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {isSuperAdmin ? "CEO Overview" : "Dashboard"}
            </Link>

            {/* New Report Dropdown */}
            <div className="relative" ref={newReportRef}>
              <button
                type="button"
                onClick={() => {
                  setNewReportOpen((p) => !p);
                  setProfileOpen(false);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted shadow-2xs"
              >
                <IconPlus size={14} className="text-muted-foreground" />
                <span>New Report</span>
              </button>
              {newReportOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-border bg-card p-1.5 shadow-xl z-50 animate-in fade-in-50 duration-150">
                  <Link
                    href="/reports/new/weekly"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                  >
                    <IconFileText size={14} className="text-muted-foreground" />
                    Weekly Report
                  </Link>
                  <Link
                    href="/reports/new/monthly"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
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
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all ${
                  isSuperAdmin
                    ? "bg-zinc-950 text-amber-300 ring-1 ring-amber-500/30 hover:bg-zinc-900"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                }`}
              >
                {isSuperAdmin ? (
                  <>
                    <IconCrown size={12} className="text-amber-400" />
                    <span className="hidden sm:inline">Governance &amp; Users</span>
                    <span className="sm:hidden">CEO</span>
                  </>
                ) : (
                  <>
                    <IconShield size={12} className="text-slate-300" />
                    <span className="hidden sm:inline">Admin Console</span>
                    <span className="sm:hidden">Admin</span>
                  </>
                )}
              </Link>
            )}

            <ThemeToggle />

            <div className="hidden h-5 w-px bg-border md:block" />

            {/* User Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((p) => !p);
                  setNewReportOpen(false);
                }}
                className="flex items-center gap-2 rounded-xl p-1 transition-all hover:bg-muted"
                title={fullName || "Profile"}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shadow-xs ${
                    isSuperAdmin
                      ? "bg-zinc-950 text-amber-300 ring-1 ring-amber-500/40"
                      : "bg-muted text-foreground border border-border"
                  }`}
                >
                  {initials}
                </div>
                <div className="hidden text-left md:block">
                  <p className="text-xs font-semibold text-foreground leading-tight">
                    {fullName}
                  </p>
                  <p className="text-[10px] text-muted-foreground capitalize">
                    {isSuperAdmin
                      ? "Super Admin (CEO)"
                      : role === "admin"
                      ? "Admin"
                      : "Staff"}{" "}
                    {department ? `• ${department}` : ""}
                  </p>
                </div>
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-border bg-card p-1.5 shadow-xl z-50 animate-in fade-in-50 duration-150">
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                  >
                    View Profile
                  </Link>
                  <div className="my-1 border-t border-border" />
                  <a
                    href="/logout"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    Sign out
                  </a>
                </div>
              )}
            </div>
          </nav>
        ) : (
          <div className="flex items-center gap-3 text-sm">
            <ThemeToggle />
            <Link
              href="/login"
              className="rounded-lg bg-primary px-3.5 py-1.5 font-medium text-primary-foreground shadow-xs transition-all hover:opacity-90 text-xs"
            >
              Sign In to Portal
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
