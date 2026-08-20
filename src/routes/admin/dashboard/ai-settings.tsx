import { createFileRoute } from "@tanstack/react-router";
import AISettingsPage from "@/pages/admin/AISettingsPage";

export const Route = createFileRoute("/admin/dashboard/ai-settings")({
  component: AISettingsPage,
});
