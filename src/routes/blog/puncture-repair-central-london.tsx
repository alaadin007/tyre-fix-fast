import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/blog/puncture-repair-central-london")({
  beforeLoad: () => {
    throw redirect({ to: "/blog/mobile-puncture-repair-london/", replace: true });
  },
});
