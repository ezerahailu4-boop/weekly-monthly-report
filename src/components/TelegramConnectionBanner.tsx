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
      {/* Prominent required-action banner */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/50 to-emerald-600/70" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-amber-200/30 bg-gradient-to-r from-amber-500 to-emerald-600 p-6 sm:p-7 text-white shadow-xl animate-fade-in">
          <div className="flex items-center gap-3 sm:flex-1">
            <div className="h-11 w-11 shrink-0 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <IconSend size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-display text-sm sm:text-base font-bold text-white leading-tight">
                Connect Telegram &mdash; Required
              </h3>
              <p className="mt-0.5 text-xs sm:text-sm text-amber-100/90 leading-relaxed">
                Link your Telegram account to receive instant task assignments, SLA alerts, and compliance notifications from management.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:flex-shrink-0">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white border border-white/20">
              <IconAlertCircle size={10} className="text-amber-300" />
              Action Required
            </span>
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-md hover:bg-amber-50 transition-colors"
            >
              <IconSend size={13} className="text-amber-600" />
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
