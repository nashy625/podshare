import { useEffect, useMemo, useState } from "react";
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

type StripePaymentMethodInnerProps = StripePaymentMethodFormProps & {
  customerId: string;
};

function StripePaymentMethodInner({ customerId, onSaved, onMessage }: StripePaymentMethodInnerProps) {
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
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
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
        stripeCustomerId: customerId,
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
  const [setupIntent, setSetupIntent] = useState<SetupIntentResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const options = useMemo(() => setupIntent?.clientSecret ? { clientSecret: setupIntent.clientSecret } : undefined, [setupIntent]);

  useEffect(() => {
    let active = true;

    api
      .post<SetupIntentResponse>("/api/payments/setup-intent")
      .then(({ data }) => {
        if (active) {
          setSetupIntent(data);
        }
      })
      .catch((error) => {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to initialize Stripe setup.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (!stripePromise) {
    return null;
  }

  if (errorMessage) {
    return <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">{errorMessage}</div>;
  }

  if (!options) {
    return <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Loading Stripe form...</div>;
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <StripePaymentMethodInner {...props} customerId={setupIntent!.customerId} />
    </Elements>
  );
}
