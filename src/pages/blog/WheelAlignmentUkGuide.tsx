import BlogPost from "@/components/blog/BlogPost";

export default function WheelAlignmentUkGuide() {
  return (
    <BlogPost
      slug="wheel-alignment-uk-guide"
      metaTitle="Wheel Alignment UK Guide: Cost, Signs & 4-Wheel (2026)"
      metaDesc="UK wheel alignment guide — what tracking, camber and toe actually mean, the signs your car needs it, and what 4-wheel alignment costs in 2026."
      title="Wheel Alignment UK: The Signs, the Difference Between Tracking and Full Alignment, and What It Costs"
      category="Maintenance"
      readMinutes={10}
      datePublished="2026-07-13"
      heroImage="tpms"
      intro="Wheel alignment is the invisible tax on ignored punctures, potholes and kerbs. A £45 alignment can save a £280 pair of front tyres — but only if you catch it early. This is the plain-English UK guide: the signs, the terminology, the difference between 2-wheel and 4-wheel alignment, and what it should cost in 2026."
      blocks={[
        { type: "h2", text: "What alignment actually is" },
        { type: "p", html: "Wheel alignment is the geometric relationship of each wheel to the road and to the other wheels. Three angles matter." },
        {
          type: "ul",
          items: [
            "<strong>Toe.</strong> Whether the wheels point inward (toe-in) or outward (toe-out) when viewed from above. The most commonly adjusted angle. Wrong toe wears the tread in a saw-tooth pattern very quickly.",
            "<strong>Camber.</strong> The vertical tilt of the wheel when viewed from the front. Negative camber (top of wheel leaning inward) is normal on modern cars for cornering stability. Excessive camber wears one edge of the tread only.",
            "<strong>Caster.</strong> The angle of the steering axis when viewed from the side. Wrong caster gives a car that wanders or pulls under braking, and can't self-centre after a corner.",
          ],
        },
        { type: "p", html: "Manufacturers publish an ideal figure for each angle, and each has a tolerance (usually ±0.15°). A car within tolerance drives straight, wears tyres evenly, and returns the steering wheel to centre on its own. A car out of tolerance does the opposite — badly enough to feel, or subtly enough that you only notice when the tyres are cooked at 15,000 miles." },

        { type: "h2", text: "The signs your car needs an alignment" },
        {
          type: "ul",
          items: [
            "<strong>The car pulls to one side</strong> on a straight, level road with hands loose on the wheel.",
            "<strong>The steering wheel isn't centred</strong> when driving straight.",
            "<strong>Uneven tyre wear</strong> — inner or outer edge, or a feathered saw-tooth pattern.",
            "<strong>Squealing from the tyres</strong> at low-speed manoeuvres like roundabouts.",
            "<strong>Steering doesn't self-centre</strong> after a turn — you have to \"unwind\" it manually.",
            "<strong>Recent pothole hit or kerb strike</strong>. If either was significant, book alignment even without other symptoms.",
          ],
        },
        { type: "p", html: "Any one of these is a reason to check. All of them and the car is destroying tyres at 3× normal rate." },

        { type: "h2", text: "Tracking vs alignment: the terminology trap" },
        { type: "p", html: "The words \"tracking\" and \"wheel alignment\" are often used interchangeably in the UK, but they don't mean the same thing." },
        {
          type: "ul",
          items: [
            "<strong>Tracking</strong> usually means front-toe adjustment only — a quick 15-minute job with a simple gauge on the front wheels. £25–£45. Fixes the most common symptom (pulling and toe wear) on most cars.",
            "<strong>4-wheel alignment</strong> uses a laser or camera rig that measures toe, camber and caster on all four wheels, referenced to each other. £45–£95. Necessary for modern cars with independent rear suspension, EVs, performance cars, and anything after a significant pothole strike or crash.",
            "<strong>Full geometry setup</strong> is a further step used on race and high-performance cars — corner-weighted, adjusted iteratively. Not necessary for a road car.",
          ],
        },
        { type: "p", html: "If a garage advertises \"wheel alignment from £25\" they almost always mean front-toe tracking. That's fine on a straightforward hatchback with no rear-suspension adjustment. On a BMW, Audi, Mercedes, Tesla, most Nissans and pretty much any modern SUV, insist on the 4-wheel version — the front-toe fix on a car with a rear-toe problem is throwing money away." },

        { type: "h2", text: "What it costs in 2026" },
        {
          type: "ul",
          items: [
            "<strong>Front-toe tracking (2-wheel):</strong> £25–£45",
            "<strong>4-wheel laser alignment:</strong> £45–£95",
            "<strong>4-wheel alignment on premium/performance cars:</strong> £70–£140",
            "<strong>Alignment with camber/caster adjustment (requires adjustable arms or shims):</strong> £120–£220 for the alignment, plus any parts",
            "<strong>Post-suspension-repair alignment:</strong> add to the labour of the repair — never skip it after replacing a lower arm or shock",
          ],
        },
        { type: "p", html: "A single premium front tyre costs £180+. A pair of misaligned tyres can be scrap in 3,000 miles. An £80 4-wheel alignment that saves you one front-tyre pair pays for itself twice over — that's the maths every good technician talks customers through." },

        { type: "h2", text: "How often to check" },
        {
          type: "ul",
          items: [
            "<strong>Every 12,000–15,000 miles</strong> as a standard check.",
            "<strong>Every time you replace tyres in pairs</strong> — no point putting £360 of new rubber on a car that's going to wear them unevenly.",
            "<strong>After any hard pothole hit</strong>, kerb strike, or minor collision.",
            "<strong>After replacing suspension components</strong> — lower arms, ball joints, track rod ends, shock absorbers.",
            "<strong>If you notice any of the symptoms above</strong>. Don't wait for the next service.",
          ],
        },

        { type: "h2", text: "Can a mobile fitter do alignment?" },
        { type: "p", html: "Almost never. 4-wheel alignment requires a hydraulic ramp or level pit, a camera or laser rig with target boards attached to each wheel, and reference software. It's a fixed-garage job. A few operators run mobile toe-only rigs for van and fleet work, but for a proper car alignment you're going to a garage." },
        { type: "p", html: "The practical workflow after a pothole or a set of new tyres: mobile fitter comes to the driveway or office, gets the new tyres on same-day. You book the alignment at a fixed garage within the following week. Two separate appointments, minimal disruption, correct result." },

        { type: "h2", text: "How to choose an alignment specialist" },
        {
          type: "ol",
          items: [
            "Ask which rig they use. Hunter, Beissbarth and John Bean are the industry-standard 4-wheel systems.",
            "Ask for a before-and-after printout. Any decent rig prints one. Refuse to pay without it.",
            "Confirm they can adjust camber and caster if needed, not just toe. Many chain garages can only adjust toe — that's a partial fix on a car that needs more.",
            "Check whether they'll compensate for a full tank of fuel, spare wheel, or roof-box (if that's your normal state).",
            "Avoid anywhere that says \"we don't have that data for your car\" — every mainstream car in the UK is in the standard rig database.",
          ],
        },

        { type: "h2", text: "The specific case: EVs and alignment" },
        { type: "p", html: "EVs are hard on tyres in general — 300–500kg of extra battery mass, high instant torque, and typically low-rolling-resistance tyres that wear faster than sport compounds. Alignment on an EV matters more than on an equivalent ICE car:" },
        {
          type: "ul",
          items: [
            "The recommended alignment interval is shorter — around every 8,000–12,000 miles.",
            "Full 4-wheel alignment is essentially mandatory; front-toe only won't cut it on independent-rear suspension EVs.",
            "Small misalignments show up as much bigger wear because of the torque profile.",
          ],
        },
        { type: "p", html: "See our <a href=\"/blog/ev-tyres-vs-standard-uk\" class=\"text-primary hover:underline\">EV tyres guide</a> for more on this." },
      ]}
      faqs={[
        { q: "How much does wheel alignment cost in the UK in 2026?", a: "£25–£45 for front-toe tracking, £45–£95 for 4-wheel laser alignment. Premium and performance cars £70–£140." },
        { q: "What's the difference between tracking and 4-wheel alignment?", a: "Tracking adjusts front toe only using a simple gauge. 4-wheel alignment uses a laser or camera rig to measure toe, camber and caster on all four wheels — necessary for modern cars, EVs and after any pothole hit." },
        { q: "How often should I get wheel alignment?", a: "Every 12,000–15,000 miles as standard, or after any hard pothole hit, kerb strike, suspension repair or new tyre pair." },
        { q: "Can a mobile fitter do wheel alignment?", a: "Almost never. 4-wheel alignment requires fixed-garage equipment. Mobile fitters replace the tyres; a fixed garage does the alignment afterwards." },
      ]}
      related={[
        { to: "/blog/cracked-alloy-from-pothole", label: "Cracked Alloy From Pothole" },
        { to: "/blog/tyre-pressure-guide-uk", label: "UK Tyre Pressure Guide" },
        { to: "/blog/ev-tyres-vs-standard-uk", label: "EV Tyres Guide" },
      ]}
    />
  );
}
