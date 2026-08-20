import { createFileRoute } from "@tanstack/react-router";
import JobStatus from "@/pages/JobStatus";

export const Route = createFileRoute("/job/$id")({
  component: JobStatus,
});
