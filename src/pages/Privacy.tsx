import { Link } from "react-router-dom";
import logo from "@/assets/tyrefly-logo.png";

const Privacy = () => {
  return (
    <main
      className="min-h-[100dvh] w-full text-white px-6 py-8"
      style={{ backgroundColor: "#0D0D0D", fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}
    >
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="flex items-center gap-2.5 mb-8" aria-label="Tyre Fly home">
          <img src={logo} alt="Tyre Fly logo" width={36} height={36} className="h-9 w-9 object-contain" />
          <span className="text-[20px] font-bold tracking-tight leading-none">
            Tyre <span style={{ color: "#FF6B1A" }}>Fly</span>
          </span>
        </Link>

        <h1 className="text-4xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm text-white/50 mb-8">Last updated: 4 May 2026</p>

        <div className="space-y-6 text-white/80 leading-relaxed text-[15px]">
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">1. Who we are</h2>
            <p>
              Tyre Fly ("we", "us", "our") provides a 24/7 mobile tyre repair and replacement service across the
              United Kingdom. We are the data controller for the personal information described in this policy.
              You can contact us at <a href="mailto:hello@tyrefly.com" className="text-[#FF6B1A] underline">hello@tyrefly.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">2. What we collect</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Your mobile number and the contents of SMS/MMS you send us (including any photos of your tyre or location).</li>
              <li>Your name, vehicle details, location, and any other information you share to get a quote.</li>
              <li>Payment information processed by our payment provider (Stripe). We do not store full card details.</li>
              <li>Technical data such as device type, IP address, and basic analytics from this website.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">3. How we use it</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>To respond to your enquiry, send you a quote, and dispatch a technician.</li>
              <li>To take payment for the deposit and the completed job.</li>
              <li>To share your contact details and location with the assigned technician so they can reach you.</li>
              <li>To keep records for accounting, insurance, and dispute resolution.</li>
              <li>To improve our service and (if you consent) send you occasional updates.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">4. Legal bases (UK GDPR)</h2>
            <p>
              We rely on <strong>contract</strong> (to deliver the service you requested), <strong>legitimate
              interests</strong> (to run and improve our business safely), <strong>legal obligation</strong>
              (tax, accounting), and <strong>consent</strong> (for marketing messages, which you can withdraw
              at any time).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">5. Who we share data with</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>The technician assigned to your job.</li>
              <li>Twilio (SMS/MMS delivery), Stripe (payments), and our cloud hosting providers.</li>
              <li>Authorities where required by law.</li>
            </ul>
            <p className="mt-2">We never sell your personal data.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">6. How long we keep it</h2>
            <p>
              Job records are typically kept for 6 years to meet UK accounting and insurance requirements.
              Marketing preferences are kept until you opt out.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">7. Your rights</h2>
            <p>
              You can request access, correction, deletion, restriction, or portability of your data, and object
              to certain processing. Email <a href="mailto:hello@tyrefly.com" className="text-[#FF6B1A] underline">hello@tyrefly.com</a>.
              You also have the right to complain to the <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-[#FF6B1A] underline">ICO</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">8. SMS messaging</h2>
            <p>
              By texting us you agree to receive SMS replies relating to your enquiry. Standard message rates
              from your network may apply. Reply STOP at any time to opt out of non-essential messages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">9. Cookies</h2>
            <p>
              We use a small number of essential cookies to operate this site and basic analytics to understand
              usage. No advertising cookies are set without your consent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">10. Changes</h2>
            <p>
              We may update this policy from time to time. The "Last updated" date at the top will reflect any
              changes.
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex gap-4 text-sm">
          <Link to="/" className="text-white/60 hover:text-white">← Back to home</Link>
          <Link to="/terms" className="text-white/60 hover:text-white">Terms &amp; Conditions</Link>
        </div>
      </div>
    </main>
  );
};

export default Privacy;
