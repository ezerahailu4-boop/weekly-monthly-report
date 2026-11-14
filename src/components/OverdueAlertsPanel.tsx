"use client";

import { useState } from "react";
import { IconAlertCircle, IconSend, IconX } from "./Icons";

export interface OverdueEntry {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
  telegram_chat_id: string | null;
  missingWeekly: boolean;
  missingMonthly: boolean;
}

export function OverdueAlertsPanel({
  initialOverdue,
  telegramConfigured,
  weekLabel,
  monthLabel,
}: {
  initialOverdue: OverdueEntry[];
  telegramConfigured: boolean;
  weekLabel: string;
  monthLabel: string;
}) {
  const [overdue] = useState<OverdueEntry[]>(initialOverdue);
  const [sending, setSending] = useState(false);
  const [sendingKey, setSendingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const telegramLinked = overdue.filter((e) => e.telegram_chat_id);
  const totalMissing = overdue.length;

  if (totalMissing === 0) return null;

  async function sendAll() {
    setSending(true);
    setNotice(null);
    try {
      const res = await fetch("/api/reports/overdue", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setNotice({ type: "err", text: data.error || "Failed to send reminders." });
      } else {
        setNotice({
          type: "ok",
          text: `Reminders sent: ${data.sent} delivered, ${data.skipped} skipped (no Telegram), ${data.failed} failed.`,
        });
      }
    } catch {
      setNotice({ type: "err", text: "Network error." });
    } finally {
      setSending(false);
    }
  }

  async function sendOne(userId: string, reportType: "weekly" | "monthly") {
    const key = `${userId}_${reportType}`;
    setSendingKey(key);
    setNotice(null);
    try {
      const res = await fetch("/api/reports/overdue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets: [{ userId, reportType }] }),
      });
      const data = await res.json();
      if (!res.ok || data.sent === 0) {
        setNotice({ type: "err", text: data.error || "Could not send reminder." });
      } else {
        setNotice({ type: "ok", text: "Telegram reminder sent!" });
      }
    } catch {
      setNotice({ type: "err", text: "Network error." });
    } finally {
      setSendingKey(null);
    }
  }

  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b border-rose-500/20">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
            <IconAlertCircle size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">
                {totalMissing} Staff Member{totalMissing !== 1 ? "s" : ""} Overdue
              </span>
              <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300 border border-rose-500/25">
                Current Period
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Week: {weekLabel} · Month: {monthLabel}
              {telegramConfigured && (
                <> · <span className="text-sky-600 dark:text-sky-400">{telegramLinked.length} Telegram-linked</span></>
              )}
            </p>
          </div>
        </div>

        {telegramConfigured && telegramLinked.length > 0 && (
          <button
            type="button"
            disabled={sending}
            onClick={sendAll}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors shrink-0"
          >
            <IconSend size={13} />
            {sending ? "Sending..." : `Remind All (${telegramLinked.length})`}
          </button>
        )}
      </div>

      {/* Notice */}
      {notice && (
        <div
          className={`flex items-center justify-between gap-2 px-4 py-2 text-xs font-medium border-b ${
            notice.type === "ok"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
              : "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300"
          }`}
        >
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} className="opacity-70 hover:opacity-100">
            <IconX size={13} />
          </button>
        </div>
      )}

      {/* Staff list */}
      <div className="divide-y divide-rose-500/10">
        {overdue.map((member) => {
          const initials = member.full_name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();

          return (
            <div
              key={member.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-2.5"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted border border-border text-[10px] font-bold text-foreground">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{member.full_name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {member.department || member.email}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pl-9 sm:pl-0">
                {member.missingWeekly && (
                  <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-300 border border-rose-500/20">
                    Missing Weekly
                  </span>
                )}
                {member.missingMonthly && (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300 border border-amber-500/20">
                    Missing Monthly
                  </span>
                )}
                {!member.telegram_chat_id && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground border border-border">
                    No Telegram
                  </span>
                )}
                {telegramConfigured && member.telegram_chat_id && (
                  <>
                    {member.missingWeekly && (
                      <button
                        type="button"
                        disabled={sendingKey === `${member.id}_weekly`}
                        onClick={() => sendOne(member.id, "weekly")}
                        className="inline-flex items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 disabled:opacity-50 transition-colors"
                      >
                        <IconSend size={9} />
                        {sendingKey === `${member.id}_weekly` ? "..." : "Remind Weekly"}
                      </button>
                    )}
                    {member.missingMonthly && (
                      <button
                        type="button"
                        disabled={sendingKey === `${member.id}_monthly`}
                        onClick={() => sendOne(member.id, "monthly")}
                        className="inline-flex items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 disabled:opacity-50 transition-colors"
                      >
                        <IconSend size={9} />
                        {sendingKey === `${member.id}_monthly` ? "..." : "Remind Monthly"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
