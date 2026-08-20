import { createFileRoute } from "@tanstack/react-router";
import AdminAIInstructionsPage from "@/pages/admin/AdminAIInstructionsPage";

export const Route = createFileRoute("/admin/dashboard/admin-ai-instructions")({
  component: AdminAIInstructionsPage,
});
