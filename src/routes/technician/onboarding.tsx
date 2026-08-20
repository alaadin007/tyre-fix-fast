import { createFileRoute } from "@tanstack/react-router";
import TechnicianOnboarding from "@/pages/TechnicianOnboarding";

export const Route = createFileRoute("/technician/onboarding")({
  component: TechnicianOnboarding,
});
