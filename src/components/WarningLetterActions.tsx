"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconCheckCircle,
  IconDownload,
  IconFileText,
  IconRefresh,
  IconSend,
  IconX,
} from "./Icons";
import type { WarningLevel, WarningStatus } from "@/types/warning";

export function WarningLetterActions({
  warningId,
  warningLevel,
  status,
  isOwner,
  isPrivileged,
}: {
  warningId: string;
  warningLevel: WarningLevel;
  status: WarningStatus;
  isOwner: boolean;
  isPrivileged: boolean;
}) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  async function runAction(action: "acknowledge" | "resend_telegram" | "revoke" | "restore") {
    setBusyAction(action);
    setFeedback(null);
    try {
      const res = await fetch(`/api/warnings/${warningId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({
          type: "err",
          text: data.error || "Action failed.",
        });
      } else {
        const msg =
          action === "acknowledge"
            ? "Receipt acknowledged."
            : action === "resend_telegram"
            ? warningLevel === "written_letter"
              ? "Official warning letter (.docx) sent to employee via Telegram!"
              : "Verbal warning sent to employee via Telegram!"
            : action === "revoke"
            ? "Warning revoked and excluded from strike count."
            : "Warning restored.";
        setFeedback({ type: "ok", text: msg });
        router.refresh();
      }
    } catch (err: unknown) {
      setFeedback({
        type: "err",
        text: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="print:hidden space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {warningLevel === "written_letter" && (
          <a
            href={`/api/warnings/${warningId}/docx`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-all shadow-xs"
          >
            <IconDownload size={14} />
            Download Official Letter (.docx)
          </a>
        )}

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
        >
          <IconFileText size={14} className="text-muted-foreground" />
          Print / Save PDF
        </button>

        {isOwner && status === "active" && (
          <button
            type="button"
            disabled={busyAction !== null}
            onClick={() => runAction("acknowledge")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            <IconCheckCircle size={14} />
            {busyAction === "acknowledge" ? "Saving..." : "Acknowledge Receipt"}
          </button>
        )}

        {isPrivileged && status !== "revoked" && (
          <button
            type="button"
            disabled={busyAction !== null}
            onClick={() => runAction("resend_telegram")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3.5 py-2 text-xs font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 disabled:opacity-50 transition-colors"
          >
            <IconSend size={14} />
            {busyAction === "resend_telegram"
              ? "Sending..."
              : warningLevel === "written_letter"
              ? "Resend Letter to Telegram"
              : "Resend Verbal Warning"}
          </button>
        )}

        {isPrivileged && status !== "revoked" && (
          <button
            type="button"
            disabled={busyAction !== null}
            onClick={() => runAction("revoke")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-rose-600 hover:border-rose-500/30 disabled:opacity-50 transition-colors"
          >
            <IconX size={14} />
            {busyAction === "revoke" ? "Revoking..." : "Revoke Warning"}
          </button>
        )}

        {isPrivileged && status === "revoked" && (
          <button
            type="button"
            disabled={busyAction !== null}
            onClick={() => runAction("restore")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
          >
            <IconRefresh size={14} />
            {busyAction === "restore" ? "Restoring..." : "Restore Warning"}
          </button>
        )}
      </div>

      {feedback && (
        <div
          className={`rounded-lg border p-3 text-xs font-medium ${
            feedback.type === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
              : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
          }`}
        >
          {feedback.text}
        </div>
      )}
    </div>
  );
}

