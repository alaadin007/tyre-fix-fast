import { createFileRoute } from "@tanstack/react-router";
import SlowPunctureUkGuide from "@/pages/blog/SlowPunctureUkGuide";

export const Route = createFileRoute("/blog/slow-puncture-uk-guide")({
  component: SlowPunctureUkGuide,
});
