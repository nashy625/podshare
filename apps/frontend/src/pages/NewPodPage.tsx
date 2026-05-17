import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { findServiceCatalogEntry } from "@podshare/shared";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { createPod } from "../lib/pods";
import { fetchSubscriptions, type SubscriptionRecord } from "../lib/subscriptions";

const tierOptions = [
  { value: "INDIVIDUAL", label: "Individual", seats: 2 },
  { value: "STANDARD", label: "Standard", seats: 4 },
  { value: "FAMILY", label: "Family", seats: 6 },
  { value: "TEAM", label: "Team", seats: 6 },
] as const;

export function NewPodPage() {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    subscriptionId: "",
    subscriptionTier: "STANDARD",
    platformFeePercent: "5",
    serviceAccountEmail: "",
    serviceAccountLogin: "",
    visibility: "PRIVATE",
    credentials: "",
  });
  const selectedSubscription = subscriptions.find((subscription) => subscription.id === form.subscriptionId);
  const selectedService = selectedSubscription ? findServiceCatalogEntry(selectedSubscription.name) : undefined;
  const selectedTier = tierOptions.find((tier) => tier.value === form.subscriptionTier) ?? tierOptions[1];
  const allowedSeats = Math.min(selectedTier.seats, selectedService?.maxSeats ?? selectedTier.seats);
  const estimatedShare = selectedSubscription
    ? (Number(selectedSubscription.monthlyCost) * (1 + Number(form.platformFeePercent || 0) / 100)) / Math.max(allowedSeats, 1)
    : 0;

  useEffect(() => {
    fetchSubscriptions()
      .then((items) => {
        setSubscriptions(items);
        const defaultSubscriptionId = items[0]?.id ?? "";
        if (defaultSubscriptionId) {
          setForm((current) => ({
            ...current,
            subscriptionId: defaultSubscriptionId,
          }));
        }
      })
      .finally(() => setLoadingSubscriptions(false));
  }, []);

  function updateField(name: string, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setErrorMessage("");

    try {
      const pod = await createPod({
        name: form.name,
        subscriptionId: form.subscriptionId,
        subscriptionTier: form.subscriptionTier as "INDIVIDUAL" | "STANDARD" | "FAMILY" | "TEAM",
        platformFeePercent: Number(form.platformFeePercent || 0),
        serviceAccountEmail: form.serviceAccountEmail || undefined,
        serviceAccountLogin: form.serviceAccountLogin || undefined,
        visibility: form.visibility as "PUBLIC" | "PRIVATE",
        credentials: form.credentials || undefined,
      });
      navigate(`/pods/${pod.id}`);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unable to create pod.");
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Create Pod</h1>
        <p className="mt-2 text-slate-600">Set up the subscription account, invite members, then start payment collection before purchase.</p>
      </div>
      <form className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2" onSubmit={handleSubmit}>
        <Input
          label="Pod name"
          placeholder="CS Friends ChatGPT Pod"
          value={form.name}
          onChange={(event) => updateField("name", event.target.value)}
        />
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Subscription</span>
          <select
            className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-slate-950"
            value={form.subscriptionId}
            onChange={(event) => updateField("subscriptionId", event.target.value)}
            disabled={loadingSubscriptions}
          >
            <option value="">{loadingSubscriptions ? "Loading subscriptions..." : "Select a linked subscription"}</option>
            {subscriptions.map((subscription) => (
                <option key={subscription.id} value={subscription.id}>
                  {subscription.name} ({subscription.category})
                </option>
              ))}
          </select>
        </label>
        {selectedService ? (
          <div className={`md:col-span-2 rounded-2xl p-4 text-sm ${
            selectedService.eligibleForPaidPods
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-amber-200 bg-amber-50 text-amber-800"
          }`}>
            <div className="font-medium">{selectedService.sharingModel}</div>
            <div className="mt-1">{selectedService.notes}</div>
          </div>
        ) : (
          <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            This service is not in the PodShare catalog yet. It can be drafted, but should be reviewed before paid launch.
          </div>
        )}
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Subscription tier</span>
          <select
            className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-slate-950"
            value={form.subscriptionTier}
            onChange={(event) => updateField("subscriptionTier", event.target.value)}
          >
            {tierOptions.map((tier) => (
              <option key={tier.value} value={tier.value}>
                {tier.label} ({tier.seats} seats)
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Platform fee %"
          type="number"
          step="0.01"
          min="0"
          max="25"
          value={form.platformFeePercent}
          onChange={(event) => updateField("platformFeePercent", event.target.value)}
        />
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Visibility</span>
          <select
            className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-slate-950"
            value={form.visibility}
            onChange={(event) => updateField("visibility", event.target.value)}
          >
            <option value="PRIVATE">Private</option>
            <option value="PUBLIC">Public</option>
          </select>
        </label>
        <Input
          label="Service account email"
          type="email"
          placeholder="podshare-service@example.com"
          value={form.serviceAccountEmail}
          onChange={(event) => updateField("serviceAccountEmail", event.target.value)}
        />
        <Input
          label="Service login username"
          placeholder="Optional username for the subscription"
          value={form.serviceAccountLogin}
          onChange={(event) => updateField("serviceAccountLogin", event.target.value)}
        />
        <Input
          label="Credentials or setup notes"
          placeholder="Encrypted before storage"
          className="md:col-span-2"
          value={form.credentials}
          onChange={(event) => updateField("credentials", event.target.value)}
        />
        <div className="md:col-span-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          Estimated full-pod share: <span className="font-medium text-slate-950">${estimatedShare.toFixed(2)}</span>
          {selectedSubscription ? ` per member when ${allowedSeats} seats are filled. Actual billing adjusts with active members.` : ""}
        </div>
        {status === "error" ? <div className="md:col-span-2 text-sm text-rose-600">{errorMessage}</div> : null}
        <div className="md:col-span-2">
          <Button type="submit" disabled={status === "saving" || !form.subscriptionId || selectedService?.eligibleForPaidPods === false}>
            {status === "saving" ? "Creating..." : "Create Pod"}
          </Button>
        </div>
      </form>
    </section>
  );
}
