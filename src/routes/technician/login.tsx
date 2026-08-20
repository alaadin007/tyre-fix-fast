import { createFileRoute } from "@tanstack/react-router";
import TechnicianLogin from "@/pages/TechnicianLogin";

export const Route = createFileRoute("/technician/login")({
  component: TechnicianLogin,
});
