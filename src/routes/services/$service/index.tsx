import { createFileRoute } from "@tanstack/react-router";
import ServicePage from "@/pages/ServicePage";

export const Route = createFileRoute("/services/$service/")({
  component: ServicePage,
});
