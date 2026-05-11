import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import {
  deleteTrackedSubscription,
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

function toNumber(value: number | string | null | undefined) {
  return value === null || value === undefined ? 0 : Number(value);
}

export function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<TrackedSubscription[]>([]);
  const [summary, setSummary] = useState<TrackedSubscriptionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");
      const [nextSubscriptions, nextSummary] = await Promise.all([
        fetchTrackedSubscriptions(),
        fetchTrackedSubscriptionSummary(),
      ]);
      setSubscriptions(nextSubscriptions);
      setSummary(nextSummary);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load subscriptions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  async function handleDelete(id: string) {
    try {
      await deleteTrackedSubscription(id);
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to delete subscription.");
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Subscriptions</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Track what you already pay for, compare shared versus solo spend, and see how much PodShare is saving you.
          </p>
        </div>
        <Link to="/subscriptions/new">
          <Button>Add Subscription</Button>
        </Link>
      </div>

      {summary ? (
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm text-slate-500">Monthly spend</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{currency(summary.monthlySpend)}</div>
          </article>
          <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="text-sm text-emerald-700">Monthly savings</div>
            <div className="mt-2 text-3xl font-semibold text-emerald-900">{currency(summary.monthlySavings)}</div>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm text-slate-500">Shared subscriptions</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">
              {summary.sharedCount} / {summary.activeCount}
            </div>
          </article>
        </div>
      ) : null}

      {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-medium text-slate-950">Tracked subscriptions</h2>
        </div>
        {loading ? (
          <div className="px-6 py-10 text-sm text-slate-500">Loading subscriptions...</div>
        ) : subscriptions.length === 0 ? (
          <div className="space-y-3 px-6 py-10 text-sm text-slate-500">
            <p>No subscriptions tracked yet.</p>
            <Link to="/subscriptions/new" className="inline-flex">
              <Button>Add your first subscription</Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {subscriptions.map((subscription) => (
              <article key={subscription.id} className="grid gap-4 px-6 py-5 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_auto] md:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-slate-950">{subscription.name}</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      {subscription.category}
                    </span>
                    {subscription.isShared ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                        Shared
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {subscription.provider || "Custom provider"} · {subscription.source}
                    {subscription.billingDate ? ` · Bills on day ${subscription.billingDate}` : ""}
                  </p>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">You pay</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">
                    {currency(toNumber(subscription.monthlyCost))}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">Retail</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">
                    {currency(
                      toNumber(subscription.estimatedRetailCost ?? subscription.monthlyCost),
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">Saved</div>
                  <div className="mt-1 text-sm font-medium text-emerald-700">
                    {currency(
                      Math.max(
                        toNumber(subscription.estimatedRetailCost ?? subscription.monthlyCost) -
                          toNumber(subscription.monthlyCost),
                        0,
                      ),
                    )}
                  </div>
                </div>
                <div className="flex justify-start md:justify-end">
                  <Button variant="secondary" onClick={() => handleDelete(subscription.id)}>
                    Remove
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
