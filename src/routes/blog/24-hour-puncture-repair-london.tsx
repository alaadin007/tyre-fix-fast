import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/blog/24-hour-puncture-repair-london")({
  beforeLoad: () => {
    throw redirect({ to: "/blog/emergency-puncture-repair-london/", replace: true });
  },
});
