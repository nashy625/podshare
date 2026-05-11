import { Link } from "react-router-dom";
import { Button } from "../ui/Button";

export function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-ocean">
            Stanford subscription sharing
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-slate-950">
            Split the subscriptions you already pay for. Keep pods organized and billing clear.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            PodShare helps students share costs for tools like ChatGPT Pro, Adobe CC, and Spotify without losing track of who pays what.
          </p>
          <div className="mt-8 flex gap-4">
            <Link to="/login">
              <Button>Get Started</Button>
            </Link>
            <Link to="/pods">
              <Button variant="secondary">Browse Pods</Button>
            </Link>
          </div>
        </div>
        <div className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl">
          <div className="grid gap-4">
            <div className="rounded-3xl bg-white/10 p-4">
              <div className="text-sm text-slate-300">Monthly total</div>
              <div className="mt-2 text-3xl font-semibold">$74.97</div>
            </div>
            <div className="rounded-3xl bg-white/5 p-4">
              <div className="text-sm text-slate-300">Potential savings with a pod</div>
              <div className="mt-2 text-3xl font-semibold text-mint">$46.50</div>
            </div>
            <div className="rounded-3xl border border-white/10 p-4 text-sm text-slate-300">
              Public pods, private invite-only groups, and payment tracking live in one place.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
