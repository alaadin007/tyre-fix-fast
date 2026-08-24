import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/blog/run-flat-vs-standard-tyres")({
  beforeLoad: () => {
    throw redirect({ to: "/blog/run-flat-tyres-uk-guide/", replace: true });
  },
});
