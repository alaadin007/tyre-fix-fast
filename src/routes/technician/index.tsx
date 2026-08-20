import { createFileRoute } from "@tanstack/react-router";
import TechnicianDashboard from "@/pages/TechnicianDashboard";

export const Route = createFileRoute("/technician/")({
  component: TechnicianDashboard,
});
