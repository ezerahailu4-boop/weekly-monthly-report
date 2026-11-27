"use client";

import { useEffect, useState } from "react";
import { Button, Badge } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";

interface ResetRequest {
  id: string;
  email: string;
  status: string;
  created_at: string;
  expires_at: string | null;
  requested_by_user_id: string | null;
  admin_action_by: string | null;
  admin_action_at: string | null;
  admin_notes: string | null;
}

const FILTER_CHIPS: Array<[string, string]> = [
  ["all", "All"],
  ["pending", "Pending"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
  ["fulfilled", "Fulfilled"],
  ["expired", "Expired"],
];

async function queryResetRequests(filter: string): Promise<ResetRequest[]> {
  const url = new URL("/api/auth/reset-requests", window.location.origin);
  url.searchParams.set("status", filter === "all" ? "" : filter);
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load requests");
  const data = await res.json();
  return data.requests || [];
}

export function AdminPasswordResets() {
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reloadRequests() {
    setLoading(true);
    try {
      const data = await queryResetRequests(filter);
      setRequests(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load reset requests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    queryResetRequests(filter)
      .then((data) => {
        if (!active) return;
        setRequests(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load reset requests");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filter]);

  async function review(requestId: string, action: "approve" | "reject") {
    const notes = window.prompt(
      action === "reject" ? "Reason for rejection:" : "Approval notes (optional):"
    );
    if (notes === null) return; // user cancelled

    try {
      const res = await fetch("/api/auth/reset-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action, notes: notes || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Review failed");
      }
      await reloadRequests();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Review failed");
    }
  }

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const statusColors: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    rejected: "bg-destructive/10 text-destructive border-destructive/20",
    expired: "bg-muted text-muted-foreground border-muted",
    fulfilled: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground font-display">
            Password Reset Requests
          </h2>
          <p className="text-xs text-muted-foreground">
            Review and approve or deny user password reset requests.
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" size="sm">
            {pendingCount} Pending
          </Badge>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTER_CHIPS.map(([value, label]) => {
          const chipColor = statusColors[value] || "";
          return (
            <Button
              key={value}
              variant={filter === value ? "brand" : "outline"}
              size="sm"
              onClick={() => {
                if (filter !== value) {
                  setLoading(true);
                  setFilter(value);
                }
              }}
              className={`text-xs ${chipColor}`}
            >
              {label}
            </Button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Loading requests…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No {filter === "all" ? "reset requests" : filter} requests found.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/60 text-muted-foreground font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-4">Email</th>
                <th className="p-4">Status</th>
                <th className="p-4">Requested</th>
                <th className="p-4">Expires</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-muted/30 transition-colors align-top"
                >
                  <td className="p-4">
                    <span className="text-foreground font-medium truncate max-w-[200px] block">
                      {r.email}
                    </span>
                    {r.requested_by_user_id && (
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">
                        User ID: {r.requested_by_user_id}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <StatusBadge status={r.status} size="sm" />
                  </td>
                  <td className="p-4 text-muted-foreground font-mono tabular-nums">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="p-4 text-muted-foreground font-mono tabular-nums">
                    {r.expires_at ? new Date(r.expires_at).toLocaleString() : "—"}
                  </td>
                  <td className="p-4 text-right">
                    {r.status === "pending" ? (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => review(r.id, "approve")}
                          className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/5"
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => review(r.id, "reject")}
                          className="text-destructive border-destructive/30 hover:bg-destructive/5"
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
