"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconBuilding, IconCheck, IconLock, IconUser } from "./Icons";

const DEPARTMENTS = [
  "Office of the CEO & Board",
  "Executive Management",
  "Logistics",
  "Finance & Accounting",
  "IT",
  "Engineering",
  "Legal",
  "Human Resources",
  "Sales",
];

export function ProfileForm({
  initialProfile,
  email,
}: {
  initialProfile: {
    id: string;
    full_name: string | null;
    department: string | null;
    role: string;
    created_at: string;
  };
  email: string;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialProfile.full_name || "");
  const [department, setDepartment] = useState(
    initialProfile.department || "Operations & Logistics"
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess(false);
    setProfileError(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          department,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setProfileError(data.error || "Failed to update profile.");
      } else {
        setProfileSuccess(true);
        router.refresh();
        setTimeout(() => setProfileSuccess(false), 3000);
      }
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPasswordError(data.error || "Failed to update password.");
      } else {
        setPasswordSuccess(true);
        setPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSuccess(false), 4000);
      }
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Profile Details Card */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-7 shadow-xs">
        <div className="flex items-center gap-3 border-b border-border pb-4 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent font-bold">
            <IconUser size={20} />
          </div>
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-foreground">
              Personal Information
            </h2>
            <p className="text-xs text-muted-foreground">
              Update your corporate title, display name, and assigned division.
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Corporate Email Address
            </label>
            <input
              type="email"
              disabled
              value={email}
              className="w-full rounded-lg border border-border bg-muted/50 px-3.5 py-2 text-xs text-muted-foreground cursor-not-allowed"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Managed by executive IT administration.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Full Name &amp; Title
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3.5 py-2 text-xs text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Division / Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3.5 py-2 text-xs text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Account Role
            </label>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-lg bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent uppercase">
                {initialProfile.role}
              </span>
              <span className="text-xs text-muted-foreground">
                {initialProfile.role === "super_admin"
                  ? "Office of the CEO: Panoramic holding-wide oversight and executive governance."
                  : initialProfile.role === "admin"
                  ? "Full administrative and account provisioning privileges."
                  : "Department reporting and personal submission access."}
              </span>
            </div>
          </div>

          {profileError && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
              {profileError}
            </div>
          )}

          {profileSuccess && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <IconCheck size={16} />
              Profile updated successfully.
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {savingProfile ? "Saving Changes..." : "Save Profile Details"}
            </button>
          </div>
        </form>
      </div>

      {/* Security & Password Card */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-7 shadow-xs">
        <div className="flex items-center gap-3 border-b border-border pb-4 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-foreground font-bold">
            <IconLock size={20} />
          </div>
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-foreground">
              Security &amp; Password
            </h2>
            <p className="text-xs text-muted-foreground">
              Change your portal password to maintain secure corporate access.
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              New Password
            </label>
            <input
              type="password"
              required
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3.5 py-2 text-xs text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3.5 py-2 text-xs text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {passwordError && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
              {passwordError}
            </div>
          )}

          {passwordSuccess && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <IconCheck size={16} />
              Password updated successfully.
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {savingPassword ? "Updating Password..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
