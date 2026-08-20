import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/console")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/dashboard/jobs", replace: true });
  },
});
