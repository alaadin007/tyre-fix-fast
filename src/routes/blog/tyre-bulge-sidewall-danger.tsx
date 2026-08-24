import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/blog/tyre-bulge-sidewall-danger")({
  beforeLoad: () => {
    throw redirect({ to: "/blog/tyre-sidewall-damage-guide/", replace: true });
  },
});
