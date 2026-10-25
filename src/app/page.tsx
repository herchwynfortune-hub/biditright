import Link from "next/link";

const FEATURES = [
  {
    title: "Teams bid, not buzz in",
    body: "Every team secretly bids how confident they are. Reveal together, and judgement — not reflexes — decides who wins.",
  },
  {
    title: "Wrong answers are a comeback",
    body: "The fix-it bonus lets a team win back half of what they lost by correcting the statement out loud.",
  },
  {
    title: "Works on any screen",
    body: "Students join with a 6-digit code on their own devices, or play one-screen with a projector and no devices at all.",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    tagline: "Good enough for a real class every week.",
    items: ["Unlimited live games", "Both play modes", "3 saved custom sets", "Up to 4 teams", "Starter premade sets"],
  },
  {
    name: "Pro",
    price: "TBD",
    tagline: "Saved time and insight for regular teachers.",
    items: [
      "Unlimited saved sets",
      "Up to 10 teams",
      "Full premade set library",
      "AI set generator",
      "Per-student error reports",
    ],
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-full bg-gold border-2 border-ink" />
          <span className="text-lg font-bold">bid it right</span>
        </div>
        <nav className="flex items-center gap-4 text-sm font-semibold">
          <a href="#plans" className="text-ink-muted hover:text-ink">
            Pricing
          </a>
          <Link href="/login" className="btn btn-secondary px-4 py-2">
            Sign in
          </Link>
          <Link href="/login" className="btn btn-primary px-4 py-2">
            Sign up free
          </Link>
        </nav>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 pt-16 pb-20 text-center">
        <span className="rounded-full bg-card px-3 py-1 text-xs font-semibold text-ink-muted border border-border">
          by Approachly Labs
        </span>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
          The team auction game for your classroom
        </h1>
        <p className="max-w-xl text-lg text-ink-muted">
          Kahoot and Baamboozle reward speed or luck. Bid It Right rewards judgement and
          risk — and every wrong answer becomes a speaking moment. Free to play, on any
          browser, no app to install.
        </p>
        <div className="flex gap-3">
          <Link href="/login" className="btn btn-primary px-6 py-3 text-base">
            Sign up free
          </Link>
          <a href="#how" className="btn btn-secondary px-6 py-3 text-base">
            See how it works
          </a>
        </div>
      </section>

      <section id="how" className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-5 px-6 pb-20 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="card p-6">
            <h3 className="mb-2 text-lg font-bold">{f.title}</h3>
            <p className="text-sm text-ink-muted">{f.body}</p>
          </div>
        ))}
      </section>

      <section id="plans" className="mx-auto w-full max-w-5xl px-6 pb-24">
        <h2 className="mb-8 text-center text-2xl font-bold">Free to play. Pro when you&apos;re ready.</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {PLANS.map((plan) => (
            <div key={plan.name} className="card p-8">
              <div className="mb-1 flex items-baseline gap-2">
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <span className="text-ink-muted">{plan.price}</span>
              </div>
              <p className="mb-5 text-sm text-ink-muted">{plan.tagline}</p>
              <ul className="flex flex-col gap-2 text-sm">
                {plan.items.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-deep" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-ink-muted">
          Pricing is still being worked out — Free already covers a full class every week.
        </p>
      </section>

      <footer className="mt-auto border-t border-border px-6 py-6 text-center text-xs text-ink-muted">
        Bid It Right · an Approachly Labs product
      </footer>
    </div>
  );
}
