import { createFileRoute } from "@tanstack/react-router";
import TechniciansPage from "@/pages/admin/TechniciansPage";

export const Route = createFileRoute("/admin/dashboard/technicians")({
  component: TechniciansPage,
});
