"use client";

import { useState } from "react";
import { IconAlertCircle, IconSend, IconX } from "./Icons";
import { TelegramConnectCard } from "./TelegramConnectCard";

interface TelegramConnectionBannerProps {
  connected: boolean;
}

export function TelegramConnectionBanner({ connected }: TelegramConnectionBannerProps) {
  const [open, setOpen] = useState(false);

  if (connected) return null;

  return (
    <>
      {/* Focused required-action banner in the shared navy, white, and gold palette. */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-accent" />
        <div className="relative z-10 flex flex-col gap-4 border border-border bg-card p-5 pl-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6 sm:pl-7 animate-fade-in">
          <div className="flex items-center gap-3 sm:flex-1">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent">
              <IconSend size={21} />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold leading-tight text-foreground sm:text-base">
                Connect Telegram &mdash; Required
              </h3>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Link your Telegram account to receive instant task assignments, SLA alerts, and compliance notifications from management.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[10px] font-bold text-foreground">
              <IconAlertCircle size={11} className="text-accent" />
              Action Required
            </span>
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <IconSend size={13} />
              Connect Now
            </button>
          </div>
        </div>
      </div>

      {/* Connection modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-fade-in">
          <div
            className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl p-6 sm:p-8 animate-zoom-in-95"
            role="dialog"
            aria-modal="true"
            aria-label="Connect Telegram Account"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-sm sm:text-base font-bold text-foreground">
                Connect Telegram Account
              </h3>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <IconX size={16} />
              </button>
            </div>
            <p className="mb-6 text-xs sm:text-sm text-muted-foreground">
              Complete the steps below to link your Telegram chat. Once connected, you&rsquo;ll receive real-time notifications for new tasks and SLA alerts.
            </p>
            <TelegramConnectCard />
          </div>
        </div>
      )}
    </>
  );
}
