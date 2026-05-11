import { useMemo, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "../ui/Button";
import { api } from "../../lib/api";
import { savePaymentMethod } from "../../lib/payments";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

type SetupIntentResponse = {
  clientSecret: string | null;
  customerId: string;
};

type StripePaymentMethodFormProps = {
  onSaved: () => Promise<void>;
  onMessage: (message: string) => void;
};

function StripePaymentMethodInner({ onSaved, onMessage }: StripePaymentMethodFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setSubmitting(true);
    onMessage("");

    try {
      const { data } = await api.post<SetupIntentResponse>("/api/payments/setup-intent");
      if (!data.clientSecret) {
        throw new Error("Stripe did not return a client secret.");
      }

      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        clientSecret: data.clientSecret,
        redirect: "if_required",
      });

      if (error) {
        throw error;
      }

      const paymentMethodId = setupIntent.payment_method;
      if (typeof paymentMethodId !== "string") {
        throw new Error("Stripe did not return a payment method ID.");
      }

      await savePaymentMethod({
        stripePaymentMethodId: paymentMethodId,
        stripeCustomerId: data.customerId,
        isDefault: true,
      });

      onMessage("Payment method saved through Stripe.");
      await onSaved();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Unable to save payment method with Stripe.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="rounded-2xl border border-slate-200 p-4">
        <PaymentElement />
      </div>
      <Button type="submit" disabled={!stripe || !elements || submitting}>
        {submitting ? "Saving..." : "Save Card with Stripe"}
      </Button>
    </form>
  );
}

export function StripePaymentMethodForm(props: StripePaymentMethodFormProps) {
  const options = useMemo(
    () => ({
      mode: "setup" as const,
      currency: "usd",
      paymentMethodCreation: "manual" as const,
    }),
    [],
  );

  if (!stripePromise) {
    return null;
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <StripePaymentMethodInner {...props} />
    </Elements>
  );
}
