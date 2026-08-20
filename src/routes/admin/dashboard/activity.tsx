import { createFileRoute } from "@tanstack/react-router";
import ActivityPage from "@/pages/admin/ActivityPage";

export const Route = createFileRoute("/admin/dashboard/activity")({
  component: ActivityPage,
});
