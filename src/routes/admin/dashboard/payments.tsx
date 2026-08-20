import { createFileRoute } from "@tanstack/react-router";
import PaymentsPage from "@/pages/admin/PaymentsPage";

export const Route = createFileRoute("/admin/dashboard/payments")({
  component: PaymentsPage,
});
