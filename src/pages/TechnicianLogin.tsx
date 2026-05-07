import { MessageSquare } from "lucide-react";
import { toWaNumber } from "@/lib/whatsapp";

const SUPPORT_WA = "447447199903";

export default function TechnicianLogin() {
  const message =
    "Hi Tyre Fly — I'd like to sign up as a technician. Please guide me through the registration.";
  const waHref = `https://wa.me/${toWaNumber(SUPPORT_WA)}?text=${encodeURIComponent(message)}`;

  return (
    <main className="min-h-screen bg-[#0B0B0E] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h1 className="text-2xl font-semibold">Become a Tyre Fly technician</h1>
        <p className="mt-2 text-sm text-white/60">
          Sign up takes 2 minutes — all on WhatsApp. Our AI will ask for your
          name, country, service area, travel radius, vehicle and skills, then
          our team approves your profile.
        </p>

        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-4 font-semibold text-black shadow-lg transition-transform active:scale-[0.98] hover:scale-[1.01]"
          style={{ boxShadow: "0 10px 30px -10px rgba(37,211,102,0.5)" }}
        >
          <MessageSquare className="h-5 w-5" strokeWidth={2.5} />
          Sign up on WhatsApp
        </a>

        <ul className="mt-6 space-y-2 text-sm text-white/70">
          <li>• No codes, no passwords</li>
          <li>• Chat-based onboarding with our AI</li>
          <li>• Admin approval, then you start receiving jobs</li>
        </ul>

        <p className="mt-6 text-xs text-white/40">
          By continuing you agree to our terms. Once approved you'll get a
          sign-in link by WhatsApp.
        </p>
      </div>
    </main>
  );
}
