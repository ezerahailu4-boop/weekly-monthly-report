import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getReportingWindowStatus } from "@/lib/portalSettings";
import { ReportingWindowLockedView } from "@/components/ReportingWindowBanner";
import WeeklyReportForm from "./WeeklyReportForm";

export const dynamic = "force-dynamic";

export default async function NewWeeklyReportGatePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.role === "employee") {
    const windowStatus = await getReportingWindowStatus();
    if (!windowStatus.isOpen) {
      return <ReportingWindowLockedView status={windowStatus} />;
    }
  }

  return <WeeklyReportForm />;
}
