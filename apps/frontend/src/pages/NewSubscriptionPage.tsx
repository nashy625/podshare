import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { createSubscription } from "../lib/subscriptions";
import { createTrackedSubscription } from "../lib/tracked-subscriptions";

export function NewSubscriptionPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    category: "AI",
    provider: "",
    monthlyCost: "",
    billingDate: "",
    source: "MANUAL",
    isShared: false,
    estimatedRetailCost: "",
    notes: "",
  });
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function updateField(name: string, value: string | boolean) {
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
      const subscription = await createSubscription({
        name: form.name,
        category: form.category,
        monthlyCost: Number(form.monthlyCost),
        billingDate: form.billingDate ? Number(form.billingDate) : 1,
      });

      await createTrackedSubscription({
        name: form.name,
        category: form.category,
        provider: form.provider || undefined,
        monthlyCost: Number(form.monthlyCost),
        billingDate: form.billingDate ? Number(form.billingDate) : undefined,
        source: form.source as "MANUAL" | "LINKED" | "PODSHARE",
        isShared: form.isShared,
        estimatedRetailCost: form.estimatedRetailCost ? Number(form.estimatedRetailCost) : undefined,
        linkedSubscriptionId: subscription.id,
        notes: form.notes || undefined,
      });
      navigate("/subscriptions");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unable to save subscription.");
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Add Subscription</h1>
        <p className="mt-2 text-slate-600">
          Track what you spend today, whether it is already shared, and how much PodShare is helping you save.
        </p>
      </div>
      <form className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2" onSubmit={handleSubmit}>
        <Input
          label="Subscription name"
          placeholder="ChatGPT Pro"
          value={form.name}
          onChange={(event) => updateField("name", event.target.value)}
        />
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Category</span>
          <select
            className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-slate-950"
            value={form.category}
            onChange={(event) => updateField("category", event.target.value)}
          >
            {["AI", "Music", "Software", "Streaming", "Productivity", "Education"].map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Provider"
          placeholder="OpenAI"
          value={form.provider}
          onChange={(event) => updateField("provider", event.target.value)}
        />
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Tracking source</span>
          <select
            className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-slate-950"
            value={form.source}
            onChange={(event) => updateField("source", event.target.value)}
          >
            <option value="MANUAL">Manual</option>
            <option value="LINKED">Linked</option>
            <option value="PODSHARE">PodShare</option>
          </select>
        </label>
        <Input
          label="Monthly cost"
          type="number"
          step="0.01"
          placeholder="20.00"
          value={form.monthlyCost}
          onChange={(event) => updateField("monthlyCost", event.target.value)}
        />
        <Input
          label="Full retail cost"
          type="number"
          step="0.01"
          placeholder="20.00"
          value={form.estimatedRetailCost}
          onChange={(event) => updateField("estimatedRetailCost", event.target.value)}
        />
        <Input
          label="Billing date"
          type="number"
          min="1"
          max="31"
          placeholder="14"
          value={form.billingDate}
          onChange={(event) => updateField("billingDate", event.target.value)}
        />
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Already shared?</span>
          <select
            className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-slate-950"
            value={form.isShared ? "yes" : "no"}
            onChange={(event) => updateField("isShared", event.target.value === "yes")}
          >
            <option value="no">No, this is personal</option>
            <option value="yes">Yes, I split this</option>
          </select>
        </label>
        <label className="block space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Notes</span>
          <textarea
            className="min-h-28 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-950"
            placeholder="Optional notes about this subscription or savings target"
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
          />
        </label>
        {status === "error" ? <div className="md:col-span-2 text-sm text-rose-600">{errorMessage}</div> : null}
        <div className="md:col-span-2">
          <Button type="submit" disabled={status === "saving"}>
            {status === "saving" ? "Saving..." : "Save Subscription"}
          </Button>
        </div>
      </form>
    </section>
  );
}
