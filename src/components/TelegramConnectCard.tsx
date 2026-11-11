"use client";

import { useEffect, useState } from "react";
import { IconBell, IconCheck, IconRefresh, IconSend } from "./Icons";

interface TelegramState {
  connected: boolean;
  telegram_chat_id: string | null;
  telegram_username: string | null;
  botConfigured: boolean;
  botUsername: string | null;
  deepLink: string | null;
}

export function TelegramConnectCard({
  compact = false,
  onConnectedChange,
}: {
  compact?: boolean;
  onConnectedChange?: (connected: boolean) => void;
}) {
  const [state, setState] = useState<TelegramState | null>(null);
  const [manualChatId, setManualChatId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function loadStatus() {
    try {
      const res = await fetch("/api/telegram/link", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.success) {
        setState(data);
        setManualChatId(data.telegram_chat_id || "");
        onConnectedChange?.(!!data.connected);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/telegram/link", { cache: "no-store" })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!active) return;
        if (ok && data.success) {
          setState(data);
          setManualChatId(data.telegram_chat_id || "");
          onConnectedChange?.(!!data.connected);
        }
      })
      .catch(() => {
        // ignore
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGenerateLink() {
    setBusy("link");
    setMessage(null);
    try {
      const res = await fetch("/api/telegram/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_link" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: "err", text: data.error || "Could not generate link." });
      } else {
        setState((prev) =>
          prev
            ? { ...prev, deepLink: data.deepLink, botUsername: data.botUsername }
            : prev
        );
        window.open(data.deepLink, "_blank", "noopener,noreferrer");
        setMessage({
          type: "ok",
          text: `Opened @${data.botUsername}. Tap "Start" in Telegram, then click "Verify Connection" below.`,
        });
      }
    } catch (err: unknown) {
      setMessage({ type: "err", text: err instanceof Error ? err.message : "Network error" });
    } finally {
      setBusy(null);
    }
  }

  async function handleSync() {
    setBusy("sync");
    setMessage(null);
    try {
      const res = await fetch("/api/telegram/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: "err", text: data.error || "Sync failed." });
      } else if (data.connected) {
        setState((prev) =>
          prev
            ? {
                ...prev,
                connected: true,
                telegram_chat_id: data.telegram_chat_id,
                telegram_username: data.telegram_username,
              }
            : prev
        );
        setManualChatId(data.telegram_chat_id || "");
        onConnectedChange?.(true);
        setMessage({
          type: "ok",
          text: data.linkedNow
            ? "Telegram connected! Confirmation message sent to your chat."
            : "Telegram connection verified.",
        });
      } else {
        setMessage({
          type: "err",
          text: "No /start confirmation detected yet. Make sure you clicked Start in Telegram first, or enter your Chat ID manually.",
        });
      }
    } catch (err: unknown) {
      setMessage({ type: "err", text: err instanceof Error ? err.message : "Network error" });
    } finally {
      setBusy(null);
    }
  }

  async function handleSaveManual(e: React.FormEvent) {
    e.preventDefault();
    setBusy("save");
    setMessage(null);
    try {
      const res = await fetch("/api/telegram/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_chat_id",
          chat_id: manualChatId,
          sendTest: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: "err", text: data.error || "Failed to save Chat ID." });
      } else {
        await loadStatus();
        setMessage({
          type: "ok",
          text: data.connected
            ? data.testDelivered
              ? "Chat ID saved and test alert sent to your Telegram!"
              : "Chat ID saved. (Configure bot token in Admin Settings to send test messages.)"
            : "Telegram Chat ID cleared.",
        });
      }
    } catch (err: unknown) {
      setMessage({ type: "err", text: err instanceof Error ? err.message : "Network error" });
    } finally {
      setBusy(null);
    }
  }

  async function handleTest() {
    setBusy("test");
    setMessage(null);
    try {
      const res = await fetch("/api/telegram/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage({ type: "err", text: data.error || "Test alert failed." });
      } else {
        setMessage({ type: "ok", text: "Test notification delivered to your Telegram!" });
      }
    } catch (err: unknown) {
      setMessage({ type: "err", text: err instanceof Error ? err.message : "Network error" });
    } finally {
      setBusy(null);
    }
  }

  async function handleDisconnect() {
    setBusy("disconnect");
    setMessage(null);
    try {
      await fetch("/api/telegram/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      });
      setManualChatId("");
      await loadStatus();
      setMessage({ type: "ok", text: "Telegram disconnected." });
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-xs text-muted-foreground">
        Checking Telegram connection status...
      </div>
    );
  }

  const isConnected = !!state?.connected;

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              isConnected
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-sky-500/10 text-sky-600 dark:text-sky-400"
            }`}
          >
            <IconBell size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm sm:text-base font-bold text-foreground">
                Telegram Task Notifications
              </h3>
              {isConnected ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  <IconCheck size={10} />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-500/20">
                  Not Linked
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isConnected
                ? `Alerts active${
                    state?.telegram_username ? ` for @${state.telegram_username}` : ""
                  } (Chat ID: ${state?.telegram_chat_id})`
                : "Link your Telegram account to get instant alerts whenever management assigns you a task."}
            </p>
          </div>
        </div>

        {isConnected && (
          <div className="flex items-center gap-2">
            {state?.botConfigured && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={handleTest}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                <IconSend size={13} className="text-sky-500" />
                {busy === "test" ? "Sending..." : "Test Alert"}
              </button>
            )}
            <button
              type="button"
              disabled={busy !== null}
              onClick={handleDisconnect}
              className="rounded-lg border border-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {(!compact || !isConnected) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Method 1: 1-Click Bot Deep Link */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <p className="text-xs font-bold text-foreground">
              Option 1: 1-Click Connect via Bot
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {state?.botConfigured && state?.botUsername
                ? `Click Connect to open @${state.botUsername} in Telegram, press "Start", then click Verify Connection.`
                : "Requires an Administrator to configure the Telegram Bot Token in Admin Settings first."}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busy !== null || !state?.botConfigured || !state?.botUsername}
                onClick={handleGenerateLink}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
              >
                <IconSend size={13} />
                {busy === "link" ? "Opening..." : "Connect Telegram Bot"}
              </button>

              <button
                type="button"
                disabled={busy !== null || !state?.botConfigured}
                onClick={handleSync}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
              >
                <IconRefresh size={13} />
                {busy === "sync" ? "Checking..." : "Verify Connection"}
              </button>
            </div>

            {state?.deepLink && (
              <p className="text-[11px] text-muted-foreground break-all">
                Link:{" "}
                <a
                  href={state.deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline font-mono"
                >
                  {state.deepLink}
                </a>
              </p>
            )}
          </div>

          {/* Method 2: Manual Chat ID */}
          <form
            onSubmit={handleSaveManual}
            className="rounded-lg border border-border bg-muted/30 p-4 space-y-3"
          >
            <p className="text-xs font-bold text-foreground">
              Option 2: Enter Telegram Chat ID Manually
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Message <span className="font-mono">@userinfobot</span> on Telegram to find your numeric Chat ID, or ask your administrator to set it for you.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. 5123456789"
                value={manualChatId}
                onChange={(e) => setManualChatId(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-card px-3 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
              <button
                type="submit"
                disabled={busy !== null}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
              >
                {busy === "save" ? "Saving..." : "Save ID"}
              </button>
            </div>
          </form>
        </div>
      )}

      {message && (
        <div
          className={`rounded-lg border p-3 text-xs font-medium ${
            message.type === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
              : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
