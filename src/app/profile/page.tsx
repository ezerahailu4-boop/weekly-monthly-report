import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ProfileForm } from "@/components/ProfileForm";
import { AppShell } from "@/components/AppShell";

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

        <ProfileForm initialProfile={initialProfile} email={user.email || ""} />
      </div>
    </AppShell>
  );
}
