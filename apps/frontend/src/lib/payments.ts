import { api } from "./api";

export type PaymentMethod = {
  id: string;
  stripeCustomerId?: string | null;
  stripePaymentMethodId: string;
  brand?: string | null;
  last4?: string | null;
  expMonth?: number | null;
  expYear?: number | null;
  isDefault: boolean;
  createdAt: string;
};

export type PaymentRecord = {
  id: string;
  podId: string;
  userId: string;
  amount: number | string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REFUNDED";
  stripePaymentId?: string | null;
  month: number;
  year: number;
  paidAt?: string | null;
  createdAt: string;
  pod: {
    id: string;
    name: string;
  };
};

export type PaymentSummary = {
  totalSpent: number;
  totalSaved: number;
  upcomingPayments: number;
  paymentMethodCount: number;
  defaultPaymentMethod: PaymentMethod | null;
};

export type PodBillingSummary = {
  podId: string;
  month: number;
  year: number;
  splitAmount: number;
  totalCollected: number;
  activeMemberCount: number;
  pendingMemberCount: number;
  memberBilling: Array<{
    memberId: string;
    userId: string;
    name: string;
    email: string;
    amountDue: number;
    paymentStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REFUNDED";
    paymentId: string | null;
    paidAt: string | null;
  }>;
  currentUserPayment: {
    memberId: string;
    userId: string;
    name: string;
    email: string;
    amountDue: number;
    paymentStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REFUNDED";
    paymentId: string | null;
    paidAt: string | null;
  } | null;
  failedPayments: Array<{
    memberId: string;
    userId: string;
    name: string;
    email: string;
    amountDue: number;
    paymentStatus: "FAILED";
    paymentId: string | null;
    paidAt: string | null;
  }>;
  readyToPurchase: boolean;
  owner: {
    id: string;
    name: string;
    email: string;
  };
};

export type BillingAutomationPreview = {
  cycle: {
    month: number;
    year: number;
  };
  preview: Array<{
    podId: string;
    podName: string;
    subscriptionName: string;
    activeMembers: number;
    existingPayments: number;
    pendingPayments: number;
    completedPayments: number;
  }>;
};

export type BillingAutomationRunResult = {
  cycle: {
    month: number;
    year: number;
  };
  dryRun: boolean;
  results: Array<{
    podId: string;
    cycle: {
      month: number;
      year: number;
    };
    results: Array<{
      userId: string;
      email: string;
      status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REFUNDED" | "SKIPPED";
      paymentId: string | null;
      reason?: string;
    }>;
  }>;
};

export type SavePaymentMethodInput = {
  stripePaymentMethodId: string;
  stripeCustomerId?: string;
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
};

export async function fetchPaymentMethods() {
  const { data } = await api.get<{ methods: PaymentMethod[] }>("/api/payments/methods");
  return data.methods;
}

export async function savePaymentMethod(input: SavePaymentMethodInput) {
  const { data } = await api.post<{ method: PaymentMethod }>("/api/payments/setup", input);
  return data.method;
}

export async function setDefaultPaymentMethod(id: string) {
  const { data } = await api.post<{ method: PaymentMethod }>(`/api/payments/methods/${id}/default`);
  return data.method;
}

export async function deletePaymentMethod(id: string) {
  await api.delete(`/api/payments/methods/${id}`);
}

export async function fetchPaymentHistory() {
  const { data } = await api.get<{ payments: PaymentRecord[] }>("/api/payments");
  return data.payments;
}

export async function fetchPaymentSummary() {
  const { data } = await api.get<PaymentSummary>("/api/payments/summary");
  return data;
}

export async function fetchPodBillingSummary(podId: string) {
  const { data } = await api.get<PodBillingSummary>(`/api/payments/pods/${podId}/summary`);
  return data;
}

export async function payForPod(podId: string) {
  const { data } = await api.post(`/api/payments/${podId}/pay`);
  return data;
}

export async function fetchBillingAutomationPreview() {
  const { data } = await api.get<BillingAutomationPreview>("/api/payments/automation/preview");
  return data;
}

export async function runBillingAutomation(dryRun: boolean) {
  const { data } = await api.post<BillingAutomationRunResult>("/api/payments/automation/run", {
    dryRun,
  });
  return data;
}
