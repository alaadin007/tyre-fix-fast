import { MessageSquare } from "lucide-react";
import { SUPPORT_WHATSAPP, waLink } from "@/lib/whatsapp";

const DEFAULT_MSG = "Hi Tyre Fly — I need a hand";

type Props = {
  message?: string;
  variant?: "card" | "floating" | "inline";
  label?: string;
  subLabel?: string;
};

export const WhatsAppChatCta = ({
  message = DEFAULT_MSG,
  variant = "card",
  label = "Chat with us on WhatsApp",
  subLabel = "Real humans · typically reply in under 2 mins",
}: Props) => {
  const href = waLink(SUPPORT_WHATSAPP, message);

  if (variant === "floating") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold shadow-lg transition-transform hover:scale-105 active:scale-95"
        style={{ backgroundColor: "#25D366", color: "#0D0D0D" }}
      >
        <MessageSquare className="h-5 w-5" strokeWidth={2.5} />
        <span className="hidden sm:inline">Chat with us</span>
      </a>
    );
  }

  if (variant === "inline") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-transform active:scale-[0.98]"
        style={{ backgroundColor: "#25D366", color: "#0D0D0D" }}
      >
        <MessageSquare className="h-5 w-5" strokeWidth={2.5} />
        {label}
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent"
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: "#25D366" }}
        >
          <MessageSquare className="h-5 w-5" strokeWidth={2.5} color="#0D0D0D" />
        </span>
        <div className="text-left">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{subLabel}</p>
        </div>
      </div>
      <span className="text-xs font-medium text-primary">Open</span>
    </a>
  );
};

export default WhatsAppChatCta;
