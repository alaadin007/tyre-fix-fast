import { Link } from "react-router-dom";
import logo from "@/assets/tyrefly-logo.png";

const Terms = () => {
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

        <h1 className="text-4xl font-bold tracking-tight mb-2">Terms &amp; Conditions</h1>
        <p className="text-sm text-white/50 mb-8">Last updated: 4 May 2026</p>

        <div className="space-y-6 text-white/80 leading-relaxed text-[15px]">
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">1. About these terms</h2>
            <p>
              These terms govern your use of Tyre Fly's website and mobile tyre service. By texting us or
              booking a job you agree to them. If you do not agree, please do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">2. The service<span className="text-white/40">*</span></h2>
            <p>
              Tyre Fly operates an online marketplace that introduces customers to a nationwide network of
              independent, vetted mobile tyre technicians. We facilitate the booking, payment of the booking
              fee, and communication between you and the technician.
            </p>
            <p className="mt-2 text-white/70">
              <span className="text-white/40">*</span> The contract for the actual repair, replacement or
              fitting work is formed directly between you (the customer) and the independent technician who
              attends. Tyre Fly is not a party to that contract and does not itself supply tyres or carry out
              physical work. Any liabilities, warranties, claims or disputes arising from the work performed,
              parts supplied, vehicle damage, delays or technician conduct are matters between you and the
              technician. Each technician carries their own public liability insurance, which we verify on
              onboarding. Tyre Fly's role and responsibilities as the introducer are limited as set out in
              section 8.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">3. Quotes and bookings</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Quotes are based on the information you provide and may change if the actual job differs (e.g. wrong tyre size, additional damage, inaccessible location).</li>
              <li>A booking is confirmed only once you have paid the deposit via the secure payment link we send.</li>
              <li>The deposit is deducted from the final price of the job.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">4. Pricing and payment</h2>
            <p>
              All prices are in GBP and include VAT where applicable. The balance is payable on completion of
              the job by card or contactless. Failed payments may incur a reasonable administration fee.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">5. Cancellations and refunds</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>You may cancel free of charge before a technician has been dispatched.</li>
              <li>Once a technician is en route, the deposit may be retained to cover call-out costs.</li>
              <li>If we are unable to attend or complete the job, your deposit is fully refunded.</li>
              <li>Faulty workmanship is covered under section 7 below.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">6. Your responsibilities</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Make sure the vehicle is in a safe, legal location accessible to the technician.</li>
              <li>Provide accurate vehicle, tyre, and location details.</li>
              <li>Be present (or arrange an authorised adult to be present) when the technician arrives.</li>
              <li>You confirm you are the owner of the vehicle or authorised to commission work on it.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">7. Workmanship guarantee</h2>
            <p>
              Tyres supplied carry the manufacturer's warranty. Fitting workmanship is guaranteed for 30 days
              against defects. Contact us promptly if you have an issue and we will arrange inspection or
              remedy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">8. Liability</h2>
            <p>
              We and our technicians carry public liability insurance. To the extent permitted by law, our
              total liability for any single job is limited to the price paid for that job, except for death,
              personal injury caused by negligence, or any other liability that cannot be limited under UK law.
            </p>
            <p className="mt-2">
              We are not liable for pre-existing vehicle damage, consequential losses, or delays caused by
              traffic, weather, or other events outside our reasonable control.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">9. SMS communications</h2>
            <p>
              You agree to receive SMS/MMS messages from us about your enquiry and job. Your network's standard
              charges may apply. Reply STOP to opt out of non-essential messages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">10. Privacy</h2>
            <p>
              Our use of your personal data is described in our{" "}
              <Link to="/privacy" className="text-[#FF6B1A] underline">Privacy Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">11. Changes to these terms</h2>
            <p>
              We may update these terms from time to time. The version in force is the one published on this
              page at the time of your booking.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">12. Governing law</h2>
            <p>
              These terms are governed by the laws of England and Wales. Disputes are subject to the
              non-exclusive jurisdiction of the English courts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">13. Contact</h2>
            <p>
              Tyre Fly — <a href="mailto:hello@tyrefly.com" className="text-[#FF6B1A] underline">hello@tyrefly.com</a>
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex gap-4 text-sm">
          <Link to="/" className="text-white/60 hover:text-white">← Back to home</Link>
          <Link to="/privacy" className="text-white/60 hover:text-white">Privacy Policy</Link>
        </div>
      </div>
    </main>
  );
};

export default Terms;
