import { createFileRoute } from "@tanstack/react-router";
import ReportsPage from "@/pages/admin/ReportsPage";

export const Route = createFileRoute("/admin/dashboard/reports")({
  component: ReportsPage,
});
