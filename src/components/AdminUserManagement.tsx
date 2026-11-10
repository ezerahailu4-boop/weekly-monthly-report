"use client";

import { useState } from "react";
import {
  IconCheck,
  IconPlus,
  IconTrash,
  IconBuilding,
  IconAlertCircle,
  IconCrown,
  IconShield,
  IconUser,
  IconSearch,
  IconX,
} from "./Icons";
import { formatDate } from "@/lib/dateUtils";

export interface TeamMember {
  id: string;
  full_name: string | null;
  department: string | null;
  role: "employee" | "admin" | "super_admin";
  created_at?: string;
  email?: string;
}

const DEPARTMENTS = [
  "Office of the CEO & Board",
  "Executive Management",
  "Operations & Logistics",
  "Finance & Accounting",
  "Commercial & Sales",
  "Technology & Engineering",
  "Legal & Governance",
  "Human Resources",
  "Strategy & Business Dev",
];

export function AdminUserManagement({
  initialTeam,
  currentUserRole = "admin",
}: {
  initialTeam: TeamMember[];
  currentUserRole?: "employee" | "admin" | "super_admin";
}) {
  const [team, setTeam] = useState<TeamMember[]>(initialTeam);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("Operations & Logistics");
  const [role, setRole] = useState<"employee" | "admin" | "super_admin">("employee");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
    fullName: string;
    role: string;
    department: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isSuperAdmin = currentUserRole === "super_admin";

  function generateRandomPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let res = "";
    for (let i = 0; i < 12; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          department,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create user account.");
        setLoading(false);
        return;
      }

      setCreatedCredentials({
        email,
        password,
        fullName,
        role,
        department,
      });

      if (data.user) {
        setTeam((prev) => [data.user, ...prev]);
      }

      setFullName("");
      setEmail("");
      setPassword("");
      setRole("employee");
      setShowModal(false);
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
      setLoading(false);
    }
  }

  async function handleDeleteUser(userId: string, memberName: string | null) {
    if (
      !confirm(
        `Are you sure you want to deactivate and remove ${
          memberName || "this user"
        }? This will revoke their portal access immediately.`
      )
    ) {
      return;
    }

    setDeletingId(userId);
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTeam((prev) => prev.filter((m) => m.id !== userId));
      } else {
        alert("Failed to delete user: " + (data.error || "Unknown error"));
      }
    } catch (err: unknown) {
      alert("Failed to delete user: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDeletingId(null);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const filteredTeam = team.filter((m) => {
    const matchesDept = deptFilter === "all" || m.department === deptFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      (m.full_name && m.full_name.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q)) ||
      (m.department && m.department.toLowerCase().includes(q));
    return matchesDept && matchesSearch;
  });

  const superAdminCount = team.filter((m) => m.role === "super_admin").length;
  const adminCount = team.filter((m) => m.role === "admin").length;
  const employeeCount = team.filter((m) => m.role === "employee").length;

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold text-foreground">
              Corporate User Provisioning
            </h2>
            {isSuperAdmin && (
              <span className="rounded-full bg-zinc-950 px-2 py-0.5 text-[10px] font-bold text-amber-300 ring-1 ring-amber-500/30">
                Full CEO Control
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Public sign-up is strictly disabled. Create and provision corporate accounts for executive leaders, department managers, and staff contributors.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowModal(true);
            generateRandomPassword();
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90 transition-all shrink-0"
        >
          <IconPlus size={15} />
          Create New Account
        </button>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Total Users
          </p>
          <p className="font-display text-2xl font-bold text-foreground mt-1 tabular-nums">
            {team.length}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Corporate accounts</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Super Admins (CEO)
          </p>
          <p className="font-display text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1 tabular-nums">
            {superAdminCount}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Executive leadership</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Administrators
          </p>
          <p className="font-display text-2xl font-bold text-foreground mt-1 tabular-nums">
            {adminCount}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Department managers</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Department Staff
          </p>
          <p className="font-display text-2xl font-bold text-accent mt-1 tabular-nums">
            {employeeCount}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Report contributors</p>
        </div>
      </div>

      {/* Success Notification after creation */}
      {createdCredentials && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 shadow-xs animate-in fade-in-50">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold text-sm">
              <IconCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
              <span>Account Provisioned Successfully!</span>
            </div>
            <button
              type="button"
              onClick={() => setCreatedCredentials(null)}
              className="text-xs text-emerald-700 dark:text-emerald-300 hover:underline font-bold"
            >
              &times; Close
            </button>
          </div>

          <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">
            Copy these corporate credentials and provide them to the team member:
          </p>

          <div className="mt-3 rounded-lg bg-card p-3.5 border border-border text-xs font-mono space-y-1 text-foreground">
            <p><strong>Name:</strong> {createdCredentials.fullName}</p>
            <p><strong>Email:</strong> {createdCredentials.email}</p>
            <p><strong>Temporary Password:</strong> {createdCredentials.password}</p>
            <p><strong>Department:</strong> {createdCredentials.department}</p>
            <p><strong>Role:</strong> <span className="capitalize">{createdCredentials.role}</span></p>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() =>
                copyToClipboard(
                  `Yetaf Holding Reporting Portal\nPortal Login: ${window.location.origin}/login\nEmail: ${createdCredentials.email}\nTemporary Password: ${createdCredentials.password}\nRole: ${createdCredentials.role}`
                )
              }
              className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity shadow-2xs"
            >
              {copied ? "Copied to Clipboard!" : "Copy Credentials Text"}
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <IconSearch
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search by name, email, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 shadow-2xs"
          />
        </div>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground shadow-2xs focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        >
          <option value="all">All Departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Team Roster Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums">
            <thead className="sticky top-0 z-10 border-b border-border bg-muted/70 backdrop-blur-xs font-semibold text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Staff Member</th>
                <th className="px-4 py-3">Division / Department</th>
                <th className="px-4 py-3">Assigned Role</th>
                <th className="px-4 py-3">Joined Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredTeam.map((member) => {
                const initials = (member.full_name || "YH")
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                const isSuper = member.role === "super_admin";
                const isAdm = member.role === "admin";

                return (
                  <tr key={member.id} className="hover:bg-muted/40 transition-colors duration-150">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-2xs ${
                            isSuper
                              ? "bg-zinc-950 text-amber-300 ring-1 ring-amber-500/30"
                              : isAdm
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground border border-border"
                          }`}
                        >
                          {initials}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground leading-tight">
                            {member.full_name || "Unnamed"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1 border border-border/80 text-xs text-foreground">
                        <IconBuilding size={12} className="text-muted-foreground" />
                        <span>{member.department || "Operations"}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      {isSuper ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-950 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 ring-1 ring-amber-500/40">
                          <IconCrown size={11} className="text-amber-400" />
                          SUPER ADMIN (CEO)
                        </span>
                      ) : isAdm ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                          <IconShield size={11} />
                          ADMINISTRATOR
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          <IconUser size={11} />
                          STAFF MEMBER
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-muted-foreground" suppressHydrationWarning>
                      {member.created_at ? formatDate(member.created_at) : "Active"}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {!isSuper && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(member.id, member.full_name)}
                          disabled={deletingId === member.id}
                          className="inline-flex items-center gap-1 rounded-md border border-rose-500/20 px-2.5 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50 shadow-2xs"
                        >
                          <IconTrash size={12} />
                          <span>Delete</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground flex items-center justify-between">
          <span>Showing {filteredTeam.length} of {team.length} registered accounts</span>
          <span className="font-mono text-[10px]">AUTH DOMAIN: @YETAF-HOLDING.COM</span>
        </div>
      </div>

      {/* Provision Account Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <IconPlus size={16} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    Provision Corporate Account
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Issue portal credentials for an employee or executive.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <IconX size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Full Name &amp; Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins, Operations Lead"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Corporate Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@yetaf-holding.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-foreground">
                    Initial Password
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] font-semibold text-accent hover:underline"
                  >
                    Regenerate Secure
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 font-mono text-xs text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Department / Subsidiary
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  System Role &amp; Permissions
                </label>
                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as "employee" | "admin" | "super_admin")
                  }
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 font-semibold"
                >
                  <option value="employee">
                    Staff Member (Can author, edit &amp; submit reports)
                  </option>
                  <option value="admin">
                    Administrator (Can review submissions &amp; provision accounts)
                  </option>
                  {isSuperAdmin && (
                    <option value="super_admin">
                      Super Admin (CEO &amp; Board · Full panoramic access)
                    </option>
                  )}
                </select>
              </div>

              {error && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "Provisioning..." : "Provision Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
