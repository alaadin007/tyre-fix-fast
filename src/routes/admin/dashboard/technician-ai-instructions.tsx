import { createFileRoute } from "@tanstack/react-router";
import TechnicianAIInstructionsPage from "@/pages/admin/TechnicianAIInstructionsPage";

export const Route = createFileRoute("/admin/dashboard/technician-ai-instructions")({
  component: TechnicianAIInstructionsPage,
});
