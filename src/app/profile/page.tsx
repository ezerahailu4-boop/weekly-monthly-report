import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ProfileForm } from "@/components/ProfileForm";
import { TelegramConnectCard } from "@/components/TelegramConnectCard";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui";
import {
  IconUser,
  IconShield,
  IconClock,
  IconBell,
} from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const initialProfile = {
    id: user.id,
    full_name: user.full_name || user.email.split("@")[0] || "Staff Member",
    department: user.department || "Operations & Logistics",
    role: user.role || "employee",
    created_at: new Date().toISOString(),
  };

  return (
    <AppShell
      user={user}
      title="My Profile & Security"
      subtitle="Corporate Account Settings"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        <div className="border-b border-border pb-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            <span>Corporate Account</span>
            <span>&middot;</span>
            <span>Security &amp; Preferences</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Staff Profile &amp; Preferences
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Manage your personal profile details, division assignment, and authentication credentials.
          </p>
        </div>

        {/* Overview stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            title="Account Role"
            value={user.role?.replace("_", " ").toUpperCase() || "STAFF"}
            caption={`${user.department || "Division not set"}`}
            icon={
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <IconShield size={16} />
              </div>
            }
          />
          <StatCard
            title="Full Name"
            value={user.full_name || "—"}
            icon={
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <IconUser size={16} />
              </div>
            }
          />
          <StatCard
            title="Corporate Email"
            value={user.email || "—"}
            icon={
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <IconBell size={16} />
              </div>
            }
          />
          <StatCard
            title="Telegram Alerts"
            value={user.telegram_chat_id ? "Linked" : "Not Linked"}
            caption={user.telegram_chat_id ? "Telegram notifications active" : "Link Telegram for alerts"}
            icon={
              <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${user.telegram_chat_id ? "bg-emerald-500/10 text-emerald-600 dark:text-[#36A879]" : "bg-muted text-muted-foreground"}`}>
                <IconClock size={16} />
              </div>
            }
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <ProfileForm initialProfile={initialProfile} email={user.email || ""} />
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-foreground font-display">Account Security</h3>
                <Badge
                  variant="brand"
                  size="sm"
                >
                  {user.role?.replace("_", " ").toUpperCase() || "STAFF"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Passwords are stored with bcrypt encryption. Change your password anytime below.
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${user.role === "super_admin" ? "bg-amber-500/20 text-amber-700 dark:text-[#D6B56D]" : "bg-brand/10 text-brand"}`}>
                  <IconShield size={12} />
                </span>
                <span className="font-medium text-foreground">
                  {user.role === "super_admin"
                    ? "Super Admin — full platform access"
                    : user.role === "admin"
                      ? "Executive Administrator"
                      : "Employee — standard reporting access"}
                </span>
              </div>
            </div>

            <TelegramConnectCard />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
