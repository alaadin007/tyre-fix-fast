import { createFileRoute } from "@tanstack/react-router";
import ServiceAreaPage from "@/pages/ServiceAreaPage";

export const Route = createFileRoute("/services/$service/$city")({
  component: ServiceAreaPage,
});
