"use client";

import { useState } from "react";
import {
  IconAlertCircle,
  IconCheck,
  IconClock,
  IconCopy,
  IconDatabase,
  IconFileText,
  IconKey,
  IconRefresh,
} from "./Icons";
import type { LetterheadConfig } from "@/lib/portalSettings";

export function AdminGovernanceControls({
  initialSlaDays,
  initialSystemName,
  initialLetterhead,
  initialErpConfigured,
  initialErpMaskedKey,
}: {
  initialSlaDays: number;
  initialSystemName: string;
  initialLetterhead: LetterheadConfig;
  initialErpConfigured: boolean;
  initialErpMaskedKey: string | null;
}) {
  const [slaDays, setSlaDays] = useState(initialSlaDays);
  const [systemName, setSystemName] = useState(initialSystemName);
  const [letterhead, setLetterhead] = useState<LetterheadConfig>(initialLetterhead);
  const [savingGov, setSavingGov] = useState(false);
  const [govMsg, setGovMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [erpConfigured, setErpConfigured] = useState(initialErpConfigured);
  const [erpMaskedKey, setErpMaskedKey] = useState<string | null>(initialErpMaskedKey);
  const [newPlainKey, setNewPlainKey] = useState<string | null>(null);
  const [erpBusy, setErpBusy] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  async function saveGovernance(e: React.FormEvent) {
    e.preventDefault();
    setSavingGov(true);
    setGovMsg(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sla_response_days: slaDays,
          system_name: systemName,
          letterhead_config: letterhead,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setGovMsg({ type: "err", text: data.error || "Failed to save governance settings." });
      } else {
        setGovMsg({
          type: "ok",
          text: `Saved! Default directive comment SLA is now ${data.slaResponseDays} day(s) and official letterhead updated.`,
        });
      }
    } finally {
      setSavingGov(false);
    }
  }

  async function rotateErpKey(revoke = false) {
    setErpBusy(true);
    setNewPlainKey(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          revoke ? { revoke_erp_api_key: true } : { generate_erp_api_key: true }
        ),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setErpConfigured(Boolean(data.erp?.configured));
        setErpMaskedKey(data.erp?.maskedKey || null);
        if (data.erp?.plaintextKeyOnce) {
          setNewPlainKey(data.erp.plaintextKeyOnce);
        }
      }
    } finally {
      setErpBusy(false);
    }
  }

  async function copyPlainKey() {
    if (!newPlainKey) return;
    try {
      await navigator.clipboard.writeText(newPlainKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6 mt-6">
      {/* Penalty Scale Audit Notice */}
      <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-4 sm:p-5 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300">
          <IconAlertCircle size={18} />
        </div>
        <div className="space-y-1 text-xs">
          <h3 className="font-bold text-amber-950 dark:text-amber-200">
            Audit Flag: Legacy &quot;Penalty Scale&quot; Logic Paused Pending Official HR Policy Review
          </h3>
          <p className="text-amber-900 dark:text-amber-200/85 leading-relaxed">
            Hardcoded 2-strike escalation rules (<code>src/lib/warnings.ts</code> &amp;{" "}
            <code>src/lib/warningLetter.ts</code>) have been quarantined: automated daily cron
            enforcement has been removed from <code>vercel.json</code> and{" "}
            <code>auto_warn_enabled</code> is defaulted to <strong>OFF</strong> until aligned with
            verified company HR policy.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SLA Timer & Official Company Letterhead */}
        <form
          onSubmit={saveGovernance}
          className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-5"
        >
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <IconClock size={20} />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-foreground">
                SLA Countdown &amp; Official Letterhead
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Enforce comment response deadlines and standardize all exported PDF/DOCX documents.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Comment Response SLA (Days) *
              </label>
              <input
                type="number"
                min={1}
                max={60}
                required
                value={slaDays}
                onChange={(e) => setSlaDays(Number(e.target.value) || 3)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground tabular-nums"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Strict countdown triggered after a directive comment is posted.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                System Display Title
              </label>
              <input
                type="text"
                value={systemName}
                onChange={(e) => setSystemName(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-border">
            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <IconFileText size={14} className="text-accent" />
              Official Company Letterhead Standards
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={letterhead.organizationName}
                  onChange={(e) =>
                    setLetterhead((l) => ({ ...l, organizationName: e.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  Reference Prefix
                </label>
                <input
                  type="text"
                  value={letterhead.referencePrefix}
                  onChange={(e) =>
                    setLetterhead((l) => ({ ...l, referencePrefix: e.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-mono text-foreground"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  Division / Office Subtitle
                </label>
                <input
                  type="text"
                  value={letterhead.divisionSubtitle}
                  onChange={(e) =>
                    setLetterhead((l) => ({ ...l, divisionSubtitle: e.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  Address &amp; Contact Line
                </label>
                <input
                  type="text"
                  value={letterhead.contactLine}
                  onChange={(e) =>
                    setLetterhead((l) => ({ ...l, contactLine: e.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  Authorized Signatory / Footer Line
                </label>
                <input
                  type="text"
                  value={letterhead.signatoryTitle}
                  onChange={(e) =>
                    setLetterhead((l) => ({ ...l, signatoryTitle: e.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground"
                />
              </div>
            </div>
          </div>

          {govMsg && (
            <div
              className={`rounded-lg border p-3 text-xs font-medium ${
                govMsg.type === "ok"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
              }`}
            >
              {govMsg.text}
            </div>
          )}

          <div className="flex justify-end border-t border-border pt-4">
            <button
              type="submit"
              disabled={savingGov}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              <IconCheck size={14} className="text-emerald-400" />
              {savingGov ? "Saving..." : "Save SLA & Letterhead"}
            </button>
          </div>
        </form>

        {/* ERP Integration Readiness Panel */}
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <IconDatabase size={20} />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  ERP Integration Readiness (REST API v1)
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Connect your company ERP to sync directives, action plans, tasks, and reports.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <IconKey size={13} className="text-accent" />
                  ERP Bearer API Key
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    erpConfigured
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {erpConfigured ? "Active" : "Not Generated"}
                </span>
              </div>

              {erpMaskedKey && !newPlainKey && (
                <p className="font-mono text-[11px] text-muted-foreground">
                  Current key: {erpMaskedKey}
                </p>
              )}

              {newPlainKey && (
                <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2.5 space-y-1.5">
                  <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-200">
                    Copy this ERP API key now (shown once):
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate font-mono text-[11px] text-foreground bg-card px-2 py-1 rounded border border-border">
                      {newPlainKey}
                    </code>
                    <button
                      type="button"
                      onClick={copyPlainKey}
                      className="inline-flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground cursor-pointer"
                    >
                      <IconCopy size={11} />
                      {copiedKey ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  disabled={erpBusy}
                  onClick={() => rotateErpKey(false)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  <IconRefresh size={12} />
                  {erpConfigured ? "Rotate ERP API Key" : "Generate ERP API Key"}
                </button>
                {erpConfigured && (
                  <button
                    type="button"
                    disabled={erpBusy}
                    onClick={() => rotateErpKey(true)}
                    className="rounded-lg border border-rose-500/30 px-3 py-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                  >
                    Revoke Key
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-bold text-foreground">Standardized ERP REST Endpoints</p>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="rounded-md border border-border bg-muted/25 px-3 py-2 flex items-center justify-between gap-2">
                  <span>
                    <strong className="text-emerald-600 dark:text-emerald-400">GET</strong>{" "}
                    /api/erp/v1/export?entity=all
                  </span>
                  <a
                    href="/api/erp/v1/schema"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent font-sans font-semibold hover:underline"
                  >
                    Schema →
                  </a>
                </div>
                <div className="rounded-md border border-border bg-muted/25 px-3 py-2">
                  <strong className="text-blue-600 dark:text-blue-400">POST</strong>{" "}
                  /api/erp/v1/ingest
                </div>
                <div className="rounded-md border border-border bg-muted/25 px-3 py-2">
                  <strong className="text-amber-600 dark:text-amber-400">GET</strong>{" "}
                  /api/erp/v1/schema
                </div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground border-t border-border pt-3">
            Supports dual entry (structured ERP forms &amp; file uploads) across Directives, Action Plans, and Reports.
          </p>
        </div>
      </div>
    </div>
  );
}

