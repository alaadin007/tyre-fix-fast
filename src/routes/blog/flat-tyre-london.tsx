import { createFileRoute } from "@tanstack/react-router";
import FlatTyreLondon from "@/pages/blog/FlatTyreLondon";

export const Route = createFileRoute("/blog/flat-tyre-london")({
  component: FlatTyreLondon,
});
