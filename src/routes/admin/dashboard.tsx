import { createFileRoute } from "@tanstack/react-router";
import DashboardLayout from "@/pages/admin/DashboardLayout";

export const Route = createFileRoute("/admin/dashboard")({
  component: () => <DashboardLayout />,
});
