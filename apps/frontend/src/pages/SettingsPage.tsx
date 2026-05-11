import { useEffect, useState } from "react";
import { StripePaymentMethodForm } from "../components/payments/StripePaymentMethodForm";
import { Button } from "../components/ui/Button";
import {
  deletePaymentMethod,
  fetchBillingAutomationPreview,
  fetchPaymentHistory,
  fetchPaymentMethods,
  fetchPaymentSummary,
  runBillingAutomation,
  savePaymentMethod,
  setDefaultPaymentMethod,
  type BillingAutomationPreview,
  type PaymentMethod,
  type PaymentRecord,
  type PaymentSummary,
} from "../lib/payments";

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function SettingsPage() {
  const stripeEnabled = Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [automationPreview, setAutomationPreview] = useState<BillingAutomationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningAutomation, setRunningAutomation] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    stripePaymentMethodId: "",
    stripeCustomerId: "",
    brand: "",
    last4: "",
    expMonth: "",
    expYear: "",
    isDefault: true,
  });

  async function load() {
    setLoading(true);
    try {
      const [nextSummary, nextMethods, nextPayments, nextAutomationPreview] = await Promise.all([
        fetchPaymentSummary(),
        fetchPaymentMethods(),
        fetchPaymentHistory(),
        fetchBillingAutomationPreview().catch(() => null),
      ]);
      setSummary(nextSummary);
      setMethods(nextMethods);
      setPayments(nextPayments);
      setAutomationPreview(nextAutomationPreview);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  async function handleSaveMethod(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      await savePaymentMethod({
        stripePaymentMethodId: form.stripePaymentMethodId,
        stripeCustomerId: form.stripeCustomerId || undefined,
        brand: form.brand || undefined,
        last4: form.last4 || undefined,
        expMonth: form.expMonth ? Number(form.expMonth) : undefined,
        expYear: form.expYear ? Number(form.expYear) : undefined,
        isDefault: form.isDefault,
      });
      setForm({
        stripePaymentMethodId: "",
        stripeCustomerId: "",
        brand: "",
        last4: "",
        expMonth: "",
        expYear: "",
        isDefault: true,
      });
      setMessage("Payment method saved.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save payment method.");
    }
  }

  async function handleSetDefault(id: string) {
    try {
      await setDefaultPaymentMethod(id);
      setMessage("Default payment method updated.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update default method.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deletePaymentMethod(id);
      setMessage("Payment method removed.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove payment method.");
    }
  }

  async function handleRunAutomation(dryRun: boolean) {
    try {
      setRunningAutomation(true);
      const result = await runBillingAutomation(dryRun);
      setMessage(
        dryRun
          ? `Dry run completed for ${result.results.length} pod(s).`
          : `Billing run completed for ${result.results.length} pod(s).`,
      );
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to run billing automation.");
    } finally {
      setRunningAutomation(false);
    }
  }

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Settings</h1>
      <p className="text-slate-600">
        Manage your saved payment methods and review the billing activity tied to shared subscriptions.
      </p>

      {message ? <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</div> : null}

      {summary ? (
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm text-slate-500">Total spent</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{currency(summary.totalSpent)}</div>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm text-slate-500">Saved methods</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{summary.paymentMethodCount}</div>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm text-slate-500">Upcoming payments</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{summary.upcomingPayments}</div>
          </article>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-950">Add payment method</h2>
          {stripeEnabled ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                Stripe publishable key detected. Save a payment method with a real SetupIntent flow below.
              </div>
              <StripePaymentMethodForm onSaved={load} onMessage={setMessage} />
              <div className="border-t border-slate-200 pt-4">
                <div className="mb-2 text-sm font-medium text-slate-900">Manual fallback</div>
                <p className="text-sm text-slate-500">
                  Use the manual form only if you are testing without a working Stripe client flow.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
              Stripe publishable key not configured. Manual fallback form is shown below.
            </div>
          )}
          <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleSaveMethod}>
            <label className="block space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Stripe payment method ID</span>
              <input
                className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-slate-950"
                value={form.stripePaymentMethodId}
                onChange={(event) => setForm((current) => ({ ...current, stripePaymentMethodId: event.target.value }))}
                placeholder="pm_..."
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Brand</span>
              <input
                className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-slate-950"
                value={form.brand}
                onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))}
                placeholder="Visa"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Last 4</span>
              <input
                className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-slate-950"
                value={form.last4}
                maxLength={4}
                onChange={(event) => setForm((current) => ({ ...current, last4: event.target.value }))}
                placeholder="4242"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Exp month</span>
              <input
                className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-slate-950"
                type="number"
                value={form.expMonth}
                onChange={(event) => setForm((current) => ({ ...current, expMonth: event.target.value }))}
                placeholder="12"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Exp year</span>
              <input
                className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-slate-950"
                type="number"
                value={form.expYear}
                onChange={(event) => setForm((current) => ({ ...current, expYear: event.target.value }))}
                placeholder="2028"
              />
            </label>
            <label className="block space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Stripe customer ID</span>
              <input
                className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-slate-950"
                value={form.stripeCustomerId}
                onChange={(event) => setForm((current) => ({ ...current, stripeCustomerId: event.target.value }))}
                placeholder="cus_..."
              />
            </label>
            <label className="flex items-center gap-3 md:col-span-2">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))}
              />
              <span className="text-sm text-slate-700">Make this the default payment method</span>
            </label>
            <div className="md:col-span-2">
              <Button type="submit">Save Payment Method</Button>
            </div>
          </form>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-950">Saved methods</h2>
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="text-sm text-slate-500">Loading methods...</div>
            ) : methods.length === 0 ? (
              <div className="text-sm text-slate-500">No payment methods saved yet.</div>
            ) : (
              methods.map((method) => (
                <div key={method.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-950">
                        {method.brand || "Card"} ending in {method.last4 || "----"}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {method.expMonth && method.expYear ? `Expires ${method.expMonth}/${method.expYear}` : "No expiry saved"}
                        {method.isDefault ? " · Default" : ""}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!method.isDefault ? (
                        <Button variant="secondary" onClick={() => handleSetDefault(method.id)}>
                          Set Default
                        </Button>
                      ) : null}
                      <Button variant="secondary" onClick={() => handleDelete(method.id)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </div>

      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-slate-950">Payment history</h2>
        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="text-sm text-slate-500">Loading payments...</div>
          ) : payments.length === 0 ? (
            <div className="text-sm text-slate-500">No payment history yet.</div>
          ) : (
            payments.map((payment) => (
              <div key={payment.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-950">{payment.pod.name}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {payment.month}/{payment.year} · {payment.status}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-slate-950">
                    {currency(Number(payment.amount))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </article>

      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-medium text-slate-950">Billing automation</h2>
            <p className="mt-1 text-sm text-slate-500">
              Preview or run current-cycle pod billing for the pods you host.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" disabled={runningAutomation} onClick={() => handleRunAutomation(true)}>
              {runningAutomation ? "Running..." : "Dry Run"}
            </Button>
            <Button disabled={runningAutomation} onClick={() => handleRunAutomation(false)}>
              {runningAutomation ? "Running..." : "Run Billing"}
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="text-sm text-slate-500">Loading billing preview...</div>
          ) : !automationPreview || automationPreview.preview.length === 0 ? (
            <div className="text-sm text-slate-500">No hosted pods available for billing automation.</div>
          ) : (
            automationPreview.preview.map((item) => (
              <div key={item.podId} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-950">{item.podName}</div>
                    <div className="mt-1 text-sm text-slate-500">{item.subscriptionName}</div>
                  </div>
                  <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                    <div>Active: {item.activeMembers}</div>
                    <div>Pending: {item.pendingPayments}</div>
                    <div>Paid: {item.completedPayments}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </article>
    </section>
  );
}
