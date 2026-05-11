import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { createPod } from "../lib/pods";
import { fetchSubscriptions, type SubscriptionRecord } from "../lib/subscriptions";

export function NewPodPage() {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    subscriptionId: "",
    maxMembers: "4",
    costPerMember: "",
    visibility: "PRIVATE",
    credentials: "",
  });

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
        maxMembers: Number(form.maxMembers),
        costPerMember: Number(form.costPerMember),
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
        <p className="mt-2 text-slate-600">Private pods are invite-only. Public pods can accept auto-join requests if space remains.</p>
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
        <Input
          label="Max members"
          type="number"
          min="2"
          max="6"
          placeholder="4"
          value={form.maxMembers}
          onChange={(event) => updateField("maxMembers", event.target.value)}
        />
        <Input
          label="Cost per member"
          type="number"
          step="0.01"
          placeholder="5.00"
          value={form.costPerMember}
          onChange={(event) => updateField("costPerMember", event.target.value)}
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
          label="Credentials"
          placeholder="Encrypted before storage"
          className="md:col-span-2"
          value={form.credentials}
          onChange={(event) => updateField("credentials", event.target.value)}
        />
        {status === "error" ? <div className="md:col-span-2 text-sm text-rose-600">{errorMessage}</div> : null}
        <div className="md:col-span-2">
          <Button type="submit" disabled={status === "saving" || !form.subscriptionId}>
            {status === "saving" ? "Creating..." : "Create Pod"}
          </Button>
        </div>
      </form>
    </section>
  );
}
