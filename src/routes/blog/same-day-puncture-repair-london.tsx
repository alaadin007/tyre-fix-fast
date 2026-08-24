import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/blog/same-day-puncture-repair-london")({
  beforeLoad: () => {
    throw redirect({ to: "/blog/mobile-puncture-repair-london/", replace: true });
  },
});
