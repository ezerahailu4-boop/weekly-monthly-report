"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconArrowLeft,
  IconCheckCircle,
  IconCrown,
  IconDownload,
  IconEdit,
  IconPrinter,
  IconSend,
  IconShield,
  IconX,
} from "./Icons";
import type { ReportStatus } from "@/types/report";

export function ReportActionButtons({
  reportId,
  currentStatus,
  currentNotes,
  isOwner,
  isAdmin,
  isSuperAdmin,
  windowLocked = false,
}: {
  reportId: string;
  currentStatus: ReportStatus;
  currentNotes?: string | null;
  isOwner: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  windowLocked?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<ReportStatus>(currentStatus);
  const [updating, setUpdating] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState(currentNotes || "");

  function handlePrint() {
    window.print();
  }

  async function handleStatusChange(newStatus: ReportStatus, notesToSave?: string) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          review_notes: notesToSave !== undefined ? notesToSave : reviewNotes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus(newStatus);
        setShowReviewModal(false);
        router.refresh();
      } else {
        alert("Failed to update status: " + (data.error || "Unknown error"));
      }
    } catch (err: unknown) {
      alert("Failed to update status: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUpdating(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 no-print text-xs">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 font-semibold text-foreground hover:bg-muted shadow-2xs transition-colors"
        >
          <IconArrowLeft size={13} />
          Back
        </Link>

        {/* 1. Employee: Send/Submit Draft to Management */}
        {isOwner && status === "draft" && !windowLocked && (
          <button
            type="button"
            disabled={updating}
            onClick={() => handleStatusChange("submitted")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 font-semibold text-white shadow-xs hover:bg-emerald-700 transition-all disabled:opacity-50"
          >
            <IconSend size={13} />
            {updating ? "Sending..." : "Submit to Management"}
          </button>
        )}

        {/* 2. Admin & CEO: Review Action with Guidance Notes */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowReviewModal(true)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-semibold shadow-xs transition-all ${
              status === "reviewed"
                ? "bg-muted border border-border text-foreground hover:bg-muted/80"
                : isSuperAdmin
                ? "bg-zinc-950 text-amber-300 ring-1 ring-amber-500/40 hover:bg-zinc-900"
                : "bg-primary text-primary-foreground hover:opacity-90"
            }`}
          >
            {isSuperAdmin ? (
              <IconCrown size={13} className="text-amber-400" />
            ) : (
              <IconShield size={13} />
            )}
            <span>
              {status === "reviewed" ? "Update Executive Sign-off" : "Executive Review & Sign-off"}
            </span>
          </button>
        )}

        {/* 3. Edit Report (Owner or Admin, when window is open or privileged) */}
        {(isAdmin || (isOwner && !windowLocked)) && (
          <Link
            href={`/reports/${reportId}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 font-semibold text-foreground hover:bg-muted shadow-2xs transition-colors"
          >
            <IconEdit size={13} className="text-muted-foreground" />
            Edit
          </Link>
        )}

        {/* 4. Native Print / PDF */}
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 font-semibold text-foreground hover:bg-muted shadow-2xs transition-colors"
        >
          <IconPrinter size={13} className="text-muted-foreground" />
          Print / PDF
        </button>

        {/* 5. Export Word */}
        <a
          href={`/api/reports/${reportId}/export/docx`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 font-semibold text-primary-foreground shadow-xs hover:opacity-90 transition-all"
        >
          <IconDownload size={13} />
          Export Word (.docx)
        </a>
      </div>

      {/* Executive Review Modal (for Admins and CEO) */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                {isSuperAdmin ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-950 text-amber-400 ring-1 ring-amber-500/30">
                    <IconCrown size={16} />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <IconShield size={16} />
                  </div>
                )}
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    {isSuperAdmin ? "CEO Executive Sign-off" : "Management Review & Feedback"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Provide governance feedback, directions, or approval notes.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <IconX size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Executive Review Guidance &amp; Directives (Optional)
                </label>
                <textarea
                  rows={4}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Enter strategic feedback, directions for the coming period, or approval remarks..."
                  className="w-full rounded-lg border border-border bg-muted/40 p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-accent focus:bg-card focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  This note will be permanently stamped on the report and visible to the author and holding executives.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleStatusChange("draft")}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 disabled:opacity-50 transition-colors"
                >
                  Request Revisions (Reopen Draft)
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(false)}
                    className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => handleStatusChange("reviewed")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    <IconCheckCircle size={14} className="text-emerald-400" />
                    {updating ? "Saving..." : "Approve & Mark Reviewed"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
