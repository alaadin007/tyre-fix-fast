import { createFileRoute } from "@tanstack/react-router";
import CommandCenter from "@/pages/admin/CommandCenter";

export const Route = createFileRoute("/admin/dashboard/command")({
  component: CommandCenter,
});
