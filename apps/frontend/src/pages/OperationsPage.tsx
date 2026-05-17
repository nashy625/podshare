import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import {
  fetchPurchasedPods,
  fetchReadyToPurchasePods,
  markPodPurchased,
  type PodOperationsItem,
} from "../lib/pods";

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function collectedTotal(pod: PodOperationsItem) {
  return (pod.payments ?? [])
    .filter((payment) => payment.status === "COMPLETED")
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
}

export function OperationsPage() {
  const [readyPods, setReadyPods] = useState<PodOperationsItem[]>([]);
  const [purchasedPods, setPurchasedPods] = useState<PodOperationsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [nextReadyPods, nextPurchasedPods] = await Promise.all([
        fetchReadyToPurchasePods(),
        fetchPurchasedPods(),
      ]);
      setReadyPods(nextReadyPods);
      setPurchasedPods(nextPurchasedPods);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  async function handleMarkPurchased(podId: string) {
    try {
      await markPodPurchased(podId);
      setMessage("Pod marked as purchased.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to mark pod as purchased.");
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Operations</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Review pods with collected funds, buy the external subscription, then release access.
        </p>
      </div>

      {message ? <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</div> : null}

      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-slate-950">Ready to purchase</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {readyPods.length}
          </span>
        </div>

        <div className="mt-4 grid gap-4">
          {loading ? (
            <div className="text-sm text-slate-500">Loading purchase queue...</div>
          ) : readyPods.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
              No pods are ready to purchase.
            </div>
          ) : (
            readyPods.map((pod) => (
              <div key={pod.id} className="rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-medium text-slate-950">{pod.name}</h3>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                        {pod.purchaseStage}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {pod.subscription.name} · {pod.subscriptionTier ?? "Standard"} · {pod.members.length} active members
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Link to={`/pods/${pod.id}`}>
                      <Button variant="secondary">View Pod</Button>
                    </Link>
                    <Button onClick={() => handleMarkPurchased(pod.id)}>Mark Purchased</Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs uppercase text-slate-400">Collected</div>
                    <div className="mt-1 font-medium text-slate-950">{currency(collectedTotal(pod))}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs uppercase text-slate-400">Monthly cost</div>
                    <div className="mt-1 font-medium text-slate-950">{currency(Number(pod.subscription.monthlyCost))}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs uppercase text-slate-400">Service email</div>
                    <div className="mt-1 break-all text-sm font-medium text-slate-950">{pod.serviceAccountEmail || "Not saved"}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs uppercase text-slate-400">Service login</div>
                    <div className="mt-1 break-all text-sm font-medium text-slate-950">{pod.serviceAccountLogin || "Not saved"}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </article>

      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-slate-950">Purchased pods</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {purchasedPods.length}
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {loading ? (
            <div className="text-sm text-slate-500">Loading purchased pods...</div>
          ) : purchasedPods.length === 0 ? (
            <div className="text-sm text-slate-500">No purchased pods yet.</div>
          ) : (
            purchasedPods.map((pod) => (
              <Link key={pod.id} to={`/pods/${pod.id}`} className="rounded-2xl border border-slate-200 p-4 hover:bg-slate-50">
                <div className="font-medium text-slate-950">{pod.name}</div>
                <div className="mt-1 text-sm text-slate-500">
                  {pod.subscription.name} · {pod.members.length} active members
                </div>
              </Link>
            ))
          )}
        </div>
      </article>
    </section>
  );
}
