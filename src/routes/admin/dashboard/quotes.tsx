import { createFileRoute } from "@tanstack/react-router";
import QuotesPage from "@/pages/admin/QuotesPage";

export const Route = createFileRoute("/admin/dashboard/quotes")({
  component: QuotesPage,
});
