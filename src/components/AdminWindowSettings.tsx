"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DAY_NAMES,
  DEFAULT_WINDOW_CONFIG,
  evaluateReportingWindow,
  type ReportingWindowConfig,
  type WindowMode,
} from "@/lib/windowSchedule";
import { IconBell, IconCheck, IconClock, IconLock, IconSliders } from "./Icons";

export function AdminWindowSettings({
  initialConfig,
  initialTelegram,
  initialAutoWarnEnabled = true,
}: {
  initialConfig: ReportingWindowConfig;
  initialTelegram: {
    configured: boolean;
    botUsername: string | null;
    maskedToken: string | null;
    envOverride: boolean;
  };
  initialAutoWarnEnabled?: boolean;
}) {
  const router = useRouter();
  const [config, setConfig] = useState<ReportingWindowConfig>(initialConfig);
  const [autoWarnEnabled, setAutoWarnEnabled] = useState<boolean>(
    initialAutoWarnEnabled
  );
  const [botTokenInput, setBotTokenInput] = useState("");
  const [telegramState, setTelegramState] = useState(initialTelegram);
  const [savingWindow, setSavingWindow] = useState(false);
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [windowFeedback, setWindowFeedback] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [telegramFeedback, setTelegramFeedback] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const preview = evaluateReportingWindow(config);

  async function saveWindowConfig(e: React.FormEvent) {
    e.preventDefault();
    setSavingWindow(true);
    setWindowFeedback(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          auto_warn_enabled: autoWarnEnabled,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setWindowFeedback({
          type: "err",
          text: data.error || "Failed to save reporting window settings.",
        });
      } else {
        setWindowFeedback({
          type: "ok",
          text: `Schedule updated! ${data.windowStatus.countdownLabel}`,
        });
        router.refresh();
      }
    } catch (err: unknown) {
      setWindowFeedback({
        type: "err",
        text: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setSavingWindow(false);
    }
  }

  async function saveTelegramBot(e: React.FormEvent) {
    e.preventDefault();
    if (!botTokenInput.trim()) {
      setTelegramFeedback({
        type: "err",
        text: "Paste a bot token from @BotFather before verifying.",
      });
      return;
    }
    setSavingTelegram(true);
    setTelegramFeedback(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram_bot_token: botTokenInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setTelegramFeedback({
          type: "err",
          text: data.error || "Bot token verification failed.",
        });
      } else {
        setTelegramState(data.telegram);
        setBotTokenInput("");
        setTelegramFeedback({
          type: "ok",
          text: `Telegram bot verified and connected${
            data.telegram.botUsername ? ` as @${data.telegram.botUsername}` : ""
          }!`,
        });
        router.refresh();
      }
    } catch (err: unknown) {
      setTelegramFeedback({
        type: "err",
        text: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setSavingTelegram(false);
    }
  }

  async function clearTelegramBot() {
    setSavingTelegram(true);
    setTelegramFeedback(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear_telegram_token: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTelegramState(data.telegram);
        setTelegramFeedback({
          type: "ok",
          text: data.telegram.envOverride
            ? "Database token cleared. Environment TELEGRAM_BOT_TOKEN is still active."
            : "Telegram bot token removed.",
        });
        router.refresh();
      }
    } finally {
      setSavingTelegram(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* 1. Ethiopian Time Reporting Window Configuration */}
      <form
        onSubmit={saveWindowConfig}
        className="rounded-xl border border-border bg-card p-5 sm:p-7 shadow-xs space-y-5"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <IconSliders size={20} />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-foreground">
                Reporting Window (Ethiopian Time)
              </h2>
              <p className="text-xs text-muted-foreground">
                Control when staff can create, edit, and submit reports in Africa/Addis_Ababa (UTC+3).
              </p>
            </div>
          </div>
        </div>

        {/* Live Status Preview Box */}
        <div
          className={`rounded-lg border p-3.5 text-xs space-y-1.5 ${
            preview.isOpen
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-amber-500/30 bg-amber-500/10"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
              {preview.isOpen ? (
                <IconClock size={14} className="text-emerald-600 dark:text-emerald-400" />
              ) : (
                <IconLock size={14} className="text-amber-600 dark:text-amber-400" />
              )}
              Live Preview: {preview.isOpen ? "OPEN" : "CLOSED"}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
              {preview.currentEthTimeLabel}
            </span>
          </div>
          <p className="text-foreground font-medium">{preview.countdownLabel}</p>
        </div>

        {/* Mode Selector */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            Access Mode
          </label>
          <select
            value={config.window_mode}
            onChange={(e) =>
              setConfig((c) => ({ ...c, window_mode: e.target.value as WindowMode }))
            }
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            <option value="scheduled">
              Scheduled Weekly Window (Automatic Ethiopian Time)
            </option>
            <option value="force_open">
              Force Open Override (Allow staff submissions anytime)
            </option>
            <option value="force_closed">
              Force Closed Override (Lock staff submissions immediately)
            </option>
          </select>
        </div>

        {/* Open Day & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Opens On (Day)
            </label>
            <select
              value={config.open_day}
              onChange={(e) =>
                setConfig((c) => ({ ...c, open_day: Number(e.target.value) }))
              }
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              {DAY_NAMES.map((name, idx) => (
                <option key={name} value={idx}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Open Time (EAT 24h)
            </label>
            <input
              type="time"
              required
              value={config.open_time}
              onChange={(e) =>
                setConfig((c) => ({ ...c, open_time: e.target.value }))
              }
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground tabular-nums focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>

        {/* Close Day & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Closes On (Day)
            </label>
            <select
              value={config.close_day}
              onChange={(e) =>
                setConfig((c) => ({ ...c, close_day: Number(e.target.value) }))
              }
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              {DAY_NAMES.map((name, idx) => (
                <option key={name} value={idx}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Close Time (EAT 24h)
            </label>
            <input
              type="time"
              required
              value={config.close_time}
              onChange={(e) =>
                setConfig((c) => ({ ...c, close_time: e.target.value }))
              }
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground tabular-nums focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>

        {/* Automatic Disciplinary Enforcement Toggle */}
        <label className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3.5 cursor-pointer hover:bg-muted/50 transition-colors">
          <input
            type="checkbox"
            checked={autoWarnEnabled}
            onChange={(e) => setAutoWarnEnabled(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
          />
          <div className="space-y-0.5 text-xs">
            <span className="font-semibold text-foreground block">
              Automatic Disciplinary Escalation (1st Verbal → 2nd Written Letter)
            </span>
            <span className="text-[11px] text-muted-foreground block">
              After the reporting window closes (daily at 5:00 AM EAT), automatically send a{" "}
              <strong>1st Verbal Warning</strong> via Telegram to staff who missed their report,
              and prepare &amp; send a <strong>Formal Written Warning Letter (.docx)</strong> on
              their 2nd missed report.
            </span>
          </div>
        </label>

        {windowFeedback && (
          <div
            className={`rounded-lg border p-3 text-xs font-medium ${
              windowFeedback.type === "ok"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
            }`}
          >
            {windowFeedback.text}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setConfig({ ...DEFAULT_WINDOW_CONFIG })}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground underline"
          >
            Reset to Default (Fri 6:00 AM → Mon 4:00 AM EAT)
          </button>

          <button
            type="submit"
            disabled={savingWindow}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
          >
            <IconCheck size={14} className="text-emerald-400" />
            {savingWindow ? "Saving Schedule..." : "Save Window Schedule"}
          </button>
        </div>
      </form>

      {/* 2. Telegram Bot Configuration */}
      <form
        onSubmit={saveTelegramBot}
        className="rounded-xl border border-border bg-card p-5 sm:p-7 shadow-xs space-y-5 flex flex-col justify-between"
      >
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <IconBell size={20} />
              </div>
              <div>
                <h2 className="font-display text-base sm:text-lg font-bold text-foreground">
                  Telegram Notification Bot
                </h2>
                <p className="text-xs text-muted-foreground">
                  Connect your @BotFather bot so staff receive instant alerts when tasks are assigned.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-medium">Bot Status:</span>
              {telegramState.configured ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  <IconCheck size={11} />
                  Active{" "}
                  {telegramState.botUsername ? `(@${telegramState.botUsername})` : ""}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 border border-amber-500/20">
                  Not Configured
                </span>
              )}
            </div>

            {telegramState.maskedToken && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Token:</span>
                <span className="font-mono text-foreground">
                  {telegramState.maskedToken}
                </span>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground pt-1 leading-relaxed">
              Create a bot in Telegram with <span className="font-mono font-semibold">@BotFather</span> (`/newbot`), paste the HTTP API token below, and click Verify &amp; Save.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Telegram Bot Token
            </label>
            <input
              type="password"
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              value={botTokenInput}
              onChange={(e) => setBotTokenInput(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3.5 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              You can also set <span className="font-mono">TELEGRAM_BOT_TOKEN</span> in <span className="font-mono">.env.local</span> or hosting environment variables.
            </p>
          </div>

          {telegramFeedback && (
            <div
              className={`rounded-lg border p-3 text-xs font-medium ${
                telegramFeedback.type === "ok"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
              }`}
            >
              {telegramFeedback.text}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
          {telegramState.configured ? (
            <button
              type="button"
              disabled={savingTelegram}
              onClick={clearTelegramBot}
              className="rounded-lg border border-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
            >
              Clear DB Token
            </button>
          ) : (
            <span />
          )}

          <button
            type="submit"
            disabled={savingTelegram}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
          >
            <IconCheck size={14} className="text-emerald-400" />
            {savingTelegram ? "Verifying with Telegram..." : "Verify & Save Bot Token"}
          </button>
        </div>
      </form>
    </div>
  );
}

