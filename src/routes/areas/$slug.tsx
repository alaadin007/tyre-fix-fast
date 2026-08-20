import { createFileRoute } from "@tanstack/react-router";
import AreaPage from "@/pages/AreaPage";

export const Route = createFileRoute("/areas/$slug")({
  component: AreaPage,
});
