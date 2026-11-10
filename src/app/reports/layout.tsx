import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <AppShell
      user={user}
      title="Performance Reports"
      subtitle="Governance & Accountability"
    >
      {children}
    </AppShell>
  );
}
