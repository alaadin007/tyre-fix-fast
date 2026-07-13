import BlogPost from "@/components/blog/BlogPost";

export default function MobileTyreFittingLondon() {
  return (
    <BlogPost
      slug="mobile-tyre-fitting-london"
      metaTitle="Mobile Tyre Fitting London: Honest Field Notes (2026)"
      metaDesc="Mobile tyre fitting in London — what it actually costs, how fast anyone really gets to you, and what the brochures leave out. From a fitter's diary."
      title="Mobile Tyre Fitting in London: Field Notes From the Van"
      category="London"
      readMinutes={11}
      datePublished="2026-07-13"
      heroImage="flat"
      intro="I've been fitting tyres in London for a long time. Long enough to know that everything you read online about mobile tyre fitting is written by people who've never had to double-park a van in Peckham at 2am. This is what it actually looks like."
      blocks={[
        { type: "h2", text: "The pitch, and the reality" },
        { type: "p", html: "The pitch is beautiful. You break down, you tap something into your phone, a nice person appears with a jack and a new tyre and life resumes. In London specifically, this is largely true. It's also the most oversold sentence in the trade, so let me walk you through the gap between the brochure and the pavement." },
        { type: "p", html: "London is the best market in the country for mobile tyre fitting because it's the worst market in the country to own a car. Between the potholes on the North Circular, the roofing screws that fall off vans in Wembley every Tuesday, and the drivers who park by ear against a Victorian granite kerb, we — the mobile guys — have a full calendar. Yours might be tonight." },

        { type: "h2", text: "What \"mobile\" means when you get down to it" },
        { type: "p", html: "A mobile tyre fitter is a van with a compressor, a small stock of common tyre sizes, a tyre machine bolted to the floor, a wheel balancer, torque wrenches, an assortment of jacks, and someone inside it who knows how to use them without ruining your day. That's the whole business. There's no showroom. There's no waiting room with a Nespresso machine and a copy of last week's Auto Trader. There's a man or a woman in overalls, a Bluetooth earpiece, and the low background hum of a Sprinter's diesel." },
        { type: "p", html: "The upside: you don't wait in a room. The downside: we run to schedule the way London buses do — often, and sometimes with a strange gap. If someone quotes you \"20 minutes\" in Zone 1 on a Friday at half five, they're either lying or new." },

        { type: "h2", text: "How long we really take to get to you" },
        { type: "p", html: "Honest London averages, measured against arrival time at the vehicle, in 2026:" },
        {
          type: "ul",
          items: [
            "<strong>Zone 1–3, daytime:</strong> 35–70 minutes on a normal day, 90+ on a Friday between 4pm and 7pm.",
            "<strong>Zone 4–6, daytime:</strong> 45–90 minutes.",
            "<strong>Overnight (10pm–5am), anywhere inside the M25:</strong> 40–75 minutes, because the roads are empty.",
            "<strong>Anywhere outside the North Circular in the wet, on a Sunday, when the Arsenal are at home:</strong> put the kettle on.",
          ],
        },
        { type: "p", html: "Anyone who promises less is welcome to try. The van doesn't teleport. The good news is that even our worst-case wait is faster than a recovery truck plus a Monday-morning garage appointment, which is the alternative most people are actually choosing between." },

        { type: "h2", text: "The prices, without the choreography" },
        { type: "p", html: "Here's what a mobile tyre callout in London costs in 2026, in real money, all-in — the callout, the tyre, the fitting, the balance, the disposal of your old tyre. Nothing extra hiding in the small print unless somebody's lying to you." },
        {
          type: "ul",
          items: [
            "<strong>Budget tyre, daytime, common car:</strong> £95–£135.",
            "<strong>Mid-range premium (Michelin, Continental, Bridgestone):</strong> £140–£200.",
            "<strong>Performance, SUV or run-flat:</strong> £220–£420.",
            "<strong>Puncture repair, no new tyre needed:</strong> £35–£55.",
            "<strong>Overnight surcharge (10pm–6am):</strong> add £20–£40.",
            "<strong>Weekend or bank holiday:</strong> add £10–£25.",
          ],
        },
        { type: "p", html: "If someone quotes you £280 for a Ford Focus tyre at 3pm on a Wednesday, hang up. If someone quotes you £70 for a Range Rover run-flat, hang up harder — they either haven't got the tyre or they're planning to sell you something else once they arrive." },

        { type: "h2", text: "Where in London it happens most" },
        { type: "p", html: "I could tell you the borough with the most punctures I've dealt with, but the honest answer is all of them, so let me be more useful and tell you where the hardest jobs are:" },
        {
          type: "ul",
          items: [
            "<strong>The North Circular between Hangar Lane and Brent Cross</strong> — the potholes here have their own postcodes.",
            "<strong>The A2 east of Blackheath</strong> — construction lorries, uneven surfacing, night-time deliveries.",
            "<strong>Anywhere in Hackney and inner Camden after a wet winter</strong> — narrow streets, side-street parking, screws-everywhere magnetism.",
            "<strong>Underground car parks in the City</strong> — height restrictions turn a straightforward callout into a puzzle involving a low-loader.",
            "<strong>Congestion Charge zone during charging hours</strong> — the van pays £15 to come and see you. Some operators pass that on, some don't; ask.",
          ],
        },

        { type: "h2", text: "The kind of customer we love (and the kind that ruins the afternoon)" },
        { type: "p", html: "Send us the postcode. Send us a what3words if you're roadside. Send us a photo of the tyre size on the sidewall (looks like <em>225/45 R17 91W</em>) and, if you can, a photo of the damage. Tell us if the car has a locking wheel nut key and where it is. Tell us if it's a run-flat. Tell us honestly if the wheel looks buckled." },
        { type: "p", html: "The bad customer isn't rude, it's the one who says \"just come out, mate, I'll sort it when you're here.\" You'll come out to a Bentley on a run-flat in Battersea and there's no matching tyre inside the M25 for eight hours. Nobody wins. A five-message WhatsApp thread before dispatch saves the whole evening." },

        { type: "h2", text: "The scams and how to spot them" },
        { type: "p", html: "London attracts the good and the ugly. Signs you've called the ugly:" },
        {
          type: "ul",
          items: [
            "Cash only, no invoice, no card reader.",
            "Van is unmarked, or the branding is a printed A4 sticker.",
            "The price triples when they \"see the car in person.\"",
            "They can't tell you the brand and model of tyre they're bringing.",
            "No public phone number that rings during the day.",
          ],
        },
        { type: "p", html: "Every honest operator in this city will send you a written quote before dispatch and take a card at the roadside. Insist on both. If they won't, call someone else — even at 1am in Vauxhall, someone else exists." },

        { type: "h2", text: "The best thing about doing this job in London" },
        { type: "p", html: "You meet everyone. In one shift you can fit a tyre for a delivery rider in Bethnal Green, a diplomatic Mercedes off Kensington Palace Gardens, a Vauxhall Corsa outside a school in Streatham and a tour-bus operator on the South Bank. All the same problem — nail in the tread — solved with the same 20 minutes and the same £45 repair. It's the closest thing this city has to democracy." },
        { type: "p", html: "If you're reading this because you're currently sitting on a wall in Hammersmith with your hazard lights on, send us the postcode. We'll be there before the takeaway you're thinking about." },
      ]}
      faqs={[
        { q: "How much is mobile tyre fitting in London in 2026?", a: "£95–£135 for a budget tyre, £140–£200 for mid-range premium, £220–£420 for performance, SUV or run-flat. Puncture repairs £35–£55. Overnight and weekend surcharges apply." },
        { q: "How fast can a mobile tyre fitter reach me in London?", a: "Zone 1–3 typically 35–70 minutes, outer London 45–90 minutes. Overnight jobs are often the fastest because the roads are empty." },
        { q: "Can a mobile fitter come to a London underground car park?", a: "Usually yes, but check height clearance when you book — most vans need at least 2 metres. Some City car parks are below that and the wheel has to be brought out for fitting." },
        { q: "Do mobile fitters work in the Congestion Charge zone?", a: "Yes, 24/7. Some operators add the £15 charge to your bill during charging hours; a good one will tell you up front." },
        { q: "Do I have to be with the car for a mobile fitting?", a: "Not always. If the car is on a driveway or private car park and you can leave the key or the locking wheel-nut key accessible, most fitters will do the job unattended and take payment by card link afterwards." },
      ]}
      related={[
        { to: "/blog/flat-tyre-london", label: "Flat Tyre London Guide" },
        { to: "/blog/24-hour-tyre-change-london", label: "24 Hour Tyre Change London" },
        { to: "/blog/mobile-tyre-fitter-m25", label: "M25 Mobile Fitter" },
      ]}
    />
  );
}
