import BlogPost from "@/components/blog/BlogPost";

export default function CanAPunctureBeRepairedUk() {
  return (
    <BlogPost
      slug="can-a-puncture-be-repaired-uk"
      metaTitle="Can a Puncture Always Be Repaired? BS AU 159 Explained (2026)"
      metaDesc="Can any puncture be repaired? UK BS AU 159 standard explained: repairable vs replace-only zones, tread limits, run-flats, and how to tell before the tyre comes off."
      title="Can a Puncture Always Be Repaired? The BS AU 159 Rules Explained"
      category="How-To"
      readMinutes={9}
      datePublished="2026-07-15"
      heroImage="canPunctureBeRepairedUk"
      intro="No — about 1 in 5 punctures we see on mobile callouts turn out to be non-repairable once the tyre comes off the rim. Understanding why comes down to a single British Standard called BS AU 159, which every legitimate UK tyre technician follows. Here's what it says, in plain English, and how to tell in advance whether your puncture is a £45 fix or a new tyre."
      blocks={[
        { type: "h2", text: "The single rule: BS AU 159" },
        { type: "p", html: "BS AU 159 is the British Standard that defines when a car tyre can be safely repaired. Every reputable UK garage, mobile fitter, and fast-fit chain works to it. It exists because a badly-done puncture repair is a delayed failure — the tyre feels fine, then blows out at 70mph on the motorway six weeks later." },
        { type: "p", html: "The standard defines: <strong>where</strong> on the tyre a puncture is repairable, <strong>what size</strong> of wound is repairable, <strong>what method</strong> is required (spoiler: not an external rope plug), and <strong>what condition</strong> the tyre must be in to accept a repair." },

        { type: "h2", text: "The repairable zone: the tread centre" },
        { type: "p", html: "Only punctures in the <strong>central tread area</strong> — the middle three-quarters of the tread width — can be repaired. This is because:" },
        {
          type: "ul",
          items: [
            "The tread is thick and reinforced with steel or Kevlar belts",
            "It doesn't flex significantly under load",
            "A plug-patch bond has stable rubber to grip",
          ],
        },
        { type: "p", html: "The <strong>shoulder</strong> (the outer edges of the tread where it curves into the sidewall) and the <strong>sidewall</strong> are not repairable. Both flex constantly as the tyre rolls, and no adhesive can survive that flex indefinitely. A shoulder patch will fail within weeks or months." },

        { type: "h2", text: "The size limit: 6mm" },
        { type: "p", html: "Punctures up to <strong>6mm in diameter</strong> are repairable on passenger car tyres (up to 3mm on higher-speed rated tyres and 6mm on standard). Anything larger and the plug-patch cannot form a reliable seal against the tyre's internal pressure." },
        { type: "p", html: "Practical translation:" },
        {
          type: "ul",
          items: [
            "<strong>Nail, screw, small piece of metal:</strong> almost always under 6mm — repairable",
            "<strong>Larger bolt, glass shard, road debris:</strong> often over 6mm — replace",
            "<strong>Cut or slash from kerb impact:</strong> usually the wrong shape (long linear cut) — replace",
          ],
        },

        { type: "h2", text: "Multiple punctures" },
        { type: "p", html: "Two punctures on the same tyre are only repairable if they're <strong>at least 400mm apart</strong> (about the width of a laptop). Closer than that, the two repair patches would compromise the internal structure of the tyre and it must be replaced." },

        { type: "h2", text: "Tyre condition requirements" },
        { type: "p", html: "Even a perfect central puncture can't be repaired if:" },
        {
          type: "ul",
          items: [
            "<strong>Tread depth is under 1.6mm</strong> — the tyre is illegal anyway; replace",
            "<strong>The tyre is over ~7 years old</strong> (check the DOT date code) — rubber degradation means any repair is short-lived",
            "<strong>There's evidence of run-flat damage</strong> — you drove on it flat and the internal cord has failed",
            "<strong>The bead is damaged</strong> from repeated flat driving",
            "<strong>There's internal moisture/rust</strong> from the puncture being ignored for weeks",
            "<strong>The tyre has been previously repaired at the same location</strong>",
          ],
        },

        { type: "h2", text: "The correct repair method" },
        { type: "p", html: "BS AU 159 specifies a <strong>combined plug-patch fitted from the inside</strong> of the tyre. This means:" },
        {
          type: "ol",
          items: [
            "The wheel comes off the car",
            "The tyre is broken off the rim (\"demounted\")",
            "The inside of the tyre is inspected for hidden damage",
            "The puncture area is buffed and prepared with vulcanising fluid",
            "A combination plug-patch (mushroom-shaped) is bonded from inside — the stem fills the hole, the patch seals it",
            "The tyre is refitted to the rim, rebalanced, torqued back onto the car",
          ],
        },
        { type: "p", html: "Any repair that doesn't come off the rim — external rope plugs, sealant sprays, \"we can do it without taking the wheel off\" — is <strong>not compliant</strong> with BS AU 159 and is not road-legal for continued UK use." },

        { type: "h2", text: "Run-flat tyres: a different rulebook" },
        { type: "p", html: "Run-flats (marked RSC, ROF, SSR, ZP, EMT, RF, RFT) are officially <strong>not recommended for repair</strong> by every major tyre manufacturer, because:" },
        {
          type: "ul",
          items: [
            "It's impossible to see internal cord damage caused by driving flat",
            "The reinforced sidewall makes damage harder to detect",
            "Manufacturer warranty is void once repaired",
          ],
        },
        { type: "p", html: "In practice, many UK mobile fitters will repair a run-flat <strong>if the tyre has not been driven flat</strong> (i.e. the puncture was caught immediately). If it's been driven on flat any meaningful distance, replace." },

        { type: "h2", text: "How to guess before the tyre comes off" },
        { type: "p", html: "You can't be 100% certain until the tyre is off the rim, but you can make a good guess:" },
        {
          type: "ul",
          items: [
            "<strong>Nail visible in the middle of the tread, small head:</strong> ~90% repairable",
            "<strong>Nail in the outer inch of the tread (shoulder):</strong> ~30% repairable",
            "<strong>Any bulge on the sidewall:</strong> 0% repairable — replace immediately",
            "<strong>Long cut visible on the sidewall:</strong> 0% repairable",
            "<strong>You drove several miles on it flat:</strong> ~40% repairable at best",
            "<strong>You inflated it, it lost pressure in 30 minutes:</strong> hairline crack somewhere — needs inspection",
          ],
        },

        { type: "h2", text: "The best-case scenario" },
        { type: "p", html: "Nail in the middle of the tread, tyre still has 4mm+ tread and is under 5 years old, caught within an hour, hasn't been driven flat: <strong>£45–£65 repair, 30 minutes on your driveway, 12-month warranty</strong>. That's what the standard is designed to make possible." },

        { type: "h2", text: "The worst-case scenario" },
        { type: "p", html: "Kerb strike causing a sidewall bulge on a 6-year-old run-flat with 2.5mm of tread: <strong>replacement only, no negotiation</strong>. And if the wheel bearing was damaged by driving on it, that's another £150–£300." },
      ]}
      faqs={[
        { q: "Can every puncture be repaired?", a: "No. Only tread-centre punctures under 6mm on tyres with 1.6mm+ tread and no sidewall/run-flat damage are repairable to BS AU 159." },
        { q: "What is BS AU 159?", a: "The British Standard that defines when and how a car tyre puncture can be safely repaired. Every legitimate UK tyre fitter follows it." },
        { q: "Can run-flat tyres be repaired?", a: "Manufacturers say no. In practice, if the tyre hasn't been driven on flat, many UK fitters will repair it. If it's been driven flat, replace." },
        { q: "Is an external plug repair legal in the UK?", a: "No — a plug on its own without an internal patch does not meet BS AU 159 and is not road-legal for continued use." },
        { q: "How long does a puncture repair last?", a: "A properly done BS AU 159 plug-patch repair lasts the life of the tyre and carries a 12-month warranty from most operators." },
      ]}
      cta={{ headline: "Not sure if your puncture is repairable?", body: "Send us a photo of the tyre and where the puncture is — we'll tell you upfront whether it's a £45 repair or a new tyre before the van leaves.", label: "Get an honest opinion →" }}
      related={[
        { to: "/blog/puncture-repair-vs-new-tyre", label: "Puncture Repair vs New Tyre" },
        { to: "/blog/nail-in-tyre-what-to-do", label: "Nail in Tyre: What to Do" },
        { to: "/blog/tyre-sidewall-damage-guide", label: "Sidewall Damage: The Rules" },
      ]}
    />
  );
}
