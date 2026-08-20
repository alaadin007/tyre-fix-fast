import { createFileRoute } from "@tanstack/react-router";
import Confirmed from "@/pages/Confirmed";

export const Route = createFileRoute("/confirmed")({
  component: Confirmed,
});
