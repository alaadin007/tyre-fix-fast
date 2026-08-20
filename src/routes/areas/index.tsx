import { createFileRoute } from "@tanstack/react-router";
import AreasIndex from "@/pages/AreasIndex";

export const Route = createFileRoute("/areas/")({
  component: AreasIndex,
});
