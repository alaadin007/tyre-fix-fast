import { directAnswer } from "@/data/pricing";

/**
 * 40–60 word direct-answer block shown at the top of commercial pages.
 * Figures come from src/data/pricing.ts — never hand-typed.
 */
export function DirectAnswer({
  service,
  place,
  serviceSlug,
  citySlug,
  className = "",
}: {
  service: string;
  place: string;
  serviceSlug?: string;
  citySlug?: string;
  className?: string;
}) {
  const { question, answer } = directAnswer({
    service,
    place,
    ...(serviceSlug ? { serviceSlug } : {}),
    ...(citySlug ? { citySlug } : {}),
  });
  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 ${className}`}
      style={{ backgroundColor: "rgba(255,107,26,0.07)", borderColor: "rgba(255,107,26,0.30)" }}
    >
      <p className="text-sm font-semibold text-white/90">{question}</p>
      <p className="mt-2 text-sm text-white/75 leading-relaxed">{answer}</p>
    </div>
  );
}
