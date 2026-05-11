import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { fetchMyPods, type DashboardPod, type MemberPodRecord } from "../lib/pod-dashboard";
import {
  fetchTrackedSubscriptions,
  fetchTrackedSubscriptionSummary,
  type TrackedSubscription,
  type TrackedSubscriptionSummary,
} from "../lib/tracked-subscriptions";

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function DashboardPage() {
  const [summary, setSummary] = useState<TrackedSubscriptionSummary | null>(null);
  const [subscriptions, setSubscriptions] = useState<TrackedSubscription[]>([]);
  const [ownedPods, setOwnedPods] = useState<DashboardPod[]>([]);
  const [memberPods, setMemberPods] = useState<MemberPodRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [nextSummary, nextSubscriptions, nextPods] = await Promise.all([
          fetchTrackedSubscriptionSummary(),
          fetchTrackedSubscriptions(),
          fetchMyPods(),
        ]);
        setSummary(nextSummary);
        setSubscriptions(nextSubscriptions.slice(0, 3));
        setOwnedPods(nextPods.ownedPods.slice(0, 3));
        setMemberPods(nextPods.memberPods.slice(0, 3));
      } finally {
        setLoading(false);
      }
    }

    load().catch(() => setLoading(false));
  }, []);

  const overviewCards = summary
    ? [
        { title: "Monthly Spend", value: currency(summary.monthlySpend), accent: "text-slate-950" },
        { title: "Monthly Savings", value: currency(summary.monthlySavings), accent: "text-emerald-700" },
        { title: "Shared Subscriptions", value: `${summary.sharedCount}`, accent: "text-slate-950" },
      ]
    : [];

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Dashboard</h1>
      <p className="text-slate-600">
        See the money you are spending on subscriptions, how much sharing is saving you, and what to manage next.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        {loading
          ? ["Loading", "Loading", "Loading"].map((title) => (
              <article key={title} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-lg font-medium text-slate-900">{title}</h2>
                <p className="mt-2 text-sm text-slate-600">Fetching your latest summary...</p>
              </article>
            ))
          : overviewCards.map((card) => (
              <article key={card.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-sm text-slate-500">{card.title}</div>
                <div className={`mt-2 text-3xl font-semibold ${card.accent}`}>{card.value}</div>
              </article>
            ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-slate-950">Recent subscriptions</h2>
            <Link to="/subscriptions">
              <Button variant="secondary">View All</Button>
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {subscriptions.length === 0 ? (
              <div className="text-sm text-slate-500">No subscriptions tracked yet.</div>
            ) : (
              subscriptions.map((subscription) => (
                <div key={subscription.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-950">{subscription.name}</div>
                      <div className="text-sm text-slate-500">
                        {subscription.category} · {subscription.isShared ? "Shared" : "Personal"}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-slate-900">
                      {currency(Number(subscription.monthlyCost))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
          <h2 className="text-lg font-medium">Next actions</h2>
          <div className="mt-4 space-y-4 text-sm text-slate-300">
            <p>Add the subscriptions you already pay for to build your baseline monthly spend.</p>
            <p>Create or join public pods to turn solo spend into shared savings.</p>
            <p>Use the feed to discover open shares from friends and the wider community.</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/subscriptions/new">
              <Button>Add Subscription</Button>
            </Link>
            <Link to="/pods">
              <Button variant="secondary">Browse Pods</Button>
            </Link>
          </div>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-slate-950">Your pods</h2>
            <Link to="/pods/new">
              <Button variant="secondary">Create Pod</Button>
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {ownedPods.length === 0 ? (
              <div className="text-sm text-slate-500">You are not hosting any pods yet.</div>
            ) : (
              ownedPods.map((pod) => (
                <div key={pod.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-950">{pod.name}</div>
                      <div className="text-sm text-slate-500">
                        {pod.subscription.name} · {pod.visibility} · {pod.members.length}/{pod.maxMembers} active
                      </div>
                    </div>
                    <Link to={`/pods/${pod.id}`}>
                      <Button variant="secondary">Open</Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-950">Pods you joined</h2>
          <div className="mt-4 space-y-3">
            {memberPods.length === 0 ? (
              <div className="text-sm text-slate-500">You have not joined any pods yet.</div>
            ) : (
              memberPods.map((membership) => (
                <div key={membership.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-950">{membership.pod.name}</div>
                      <div className="text-sm text-slate-500">
                        Hosted by {membership.pod.owner.name} · {membership.status}
                      </div>
                    </div>
                    <Link to={`/pods/${membership.pod.id}`}>
                      <Button variant="secondary">Open</Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
