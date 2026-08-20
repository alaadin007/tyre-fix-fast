import { createFileRoute } from "@tanstack/react-router";
import SettingsPage from "@/pages/admin/SettingsPage";

export const Route = createFileRoute("/admin/dashboard/settings")({
  component: SettingsPage,
});
