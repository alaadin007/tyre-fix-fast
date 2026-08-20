import { createFileRoute } from "@tanstack/react-router";
import JobsPage from "@/pages/admin/JobsPage";

export const Route = createFileRoute("/admin/dashboard/jobs")({
  component: JobsPage,
});
