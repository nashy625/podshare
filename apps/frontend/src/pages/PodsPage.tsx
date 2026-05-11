import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { fetchPublicPods, joinPod, type PodFeedItem } from "../lib/pods";

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function PodsPage() {
  const [pods, setPods] = useState<PodFeedItem[]>([]);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const nextPods = await fetchPublicPods(category || undefined);
      setPods(nextPods);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [category]);

  async function handleJoin(podId: string) {
    try {
      await joinPod(podId);
      setMessage("Join request processed.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to join this pod.");
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Explore Pods</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Browse public shares, see who is hosting them, compare your split cost, and request to join.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            className="rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-slate-950"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">All categories</option>
            {["AI", "Music", "Software", "Streaming", "Productivity", "Education"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <Link to="/pods/new">
            <Button>Create Pod</Button>
          </Link>
        </div>
      </div>

      {message ? <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</div> : null}

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading public pods...
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pods.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500">
              No public pods match that filter yet.
            </div>
          ) : (
            pods.map((pod) => {
              const activeMembers = pod.members.length;
              const slotsRemaining = Math.max(pod.maxMembers - activeMembers, 0);

              return (
                <article key={pod.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-medium text-slate-950">{pod.name}</h2>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                          {pod.subscription.category}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {pod.subscription.name} hosted by {pod.owner.name}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                      {pod.visibility}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400">Your split</div>
                      <div className="mt-1 text-sm font-medium text-slate-950">
                        {currency(Number(pod.costPerMember))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400">Members</div>
                      <div className="mt-1 text-sm font-medium text-slate-950">
                        {activeMembers}/{pod.maxMembers}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400">Open slots</div>
                      <div className="mt-1 text-sm font-medium text-slate-950">{slotsRemaining}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link to={`/pods/${pod.id}`}>
                      <Button variant="secondary">View Details</Button>
                    </Link>
                    <Button onClick={() => handleJoin(pod.id)} disabled={slotsRemaining <= 0}>
                      {slotsRemaining <= 0 ? "Full" : "Join Pod"}
                    </Button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
