import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { fetchFriendships, type Friendship } from "../lib/friends";
import { fetchPodBillingSummary, payForPod, type PodBillingSummary } from "../lib/payments";
import {
  approvePodMember,
  fetchPodDetails,
  inviteToPod,
  joinPod,
  removePodMember,
  type PodDetails,
} from "../lib/pods";
import { useAuth } from "../context/AuthContext";

export function PodDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [pod, setPod] = useState<PodDetails | null>(null);
  const [billing, setBilling] = useState<PodBillingSummary | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    if (!id) {
      return;
    }

    setLoading(true);
    try {
      const [nextPod, nextFriends, nextBilling] = await Promise.all([
        fetchPodDetails(id),
        fetchFriendships().catch(() => []),
        fetchPodBillingSummary(id).catch(() => null),
      ]);
      setPod(nextPod);
      setFriends(nextFriends);
      setBilling(nextBilling);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load this pod.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [id]);

  async function handleJoin() {
    if (!id) {
      return;
    }

    try {
      await joinPod(id);
      setMessage("Join request processed.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to join this pod.");
    }
  }

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id || !inviteEmail) {
      return;
    }

    try {
      await inviteToPod(id, inviteEmail);
      setInviteEmail("");
      setMessage("Invite sent.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send invite.");
    }
  }

  async function handleApprove(userId: string) {
    if (!id) {
      return;
    }

    try {
      await approvePodMember(id, userId);
      setMessage("Member approved.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to approve member.");
    }
  }

  async function handleRemove(userId: string) {
    if (!id) {
      return;
    }

    try {
      await removePodMember(id, userId);
      setMessage("Member removed.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove member.");
    }
  }

  async function handlePay() {
    if (!id) {
      return;
    }

    try {
      await payForPod(id);
      setMessage("Payment recorded for this pod.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to record payment.");
    }
  }

  const acceptedFriends = friends
    .filter((friendship) => friendship.status === "ACCEPTED")
    .map((friendship) => (friendship.requester.email === user?.email ? friendship.addressee : friendship.requester));
  const isOwner = pod?.owner.email === user?.email;
  const pendingMembers = pod?.members.filter((member) => member.status === "PENDING") ?? [];
  const activeMembers = pod?.members.filter((member) => member.status === "ACTIVE") ?? [];
  const currentUserBilling = billing?.currentUserPayment ?? null;

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Pod Details</h1>
      {message ? <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</div> : null}
      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading pod...
        </div>
      ) : pod ? (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold text-slate-950">{pod.name}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                  {pod.visibility}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                  {pod.subscription.category}
                </span>
              </div>
              <p className="mt-2 text-slate-600">
                Sharing {pod.subscription.name} with {pod.members.length} active member(s).
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Split cost</div>
                  <div className="mt-1 text-lg font-semibold text-slate-950">${Number(pod.costPerMember).toFixed(2)}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Max members</div>
                  <div className="mt-1 text-lg font-semibold text-slate-950">{pod.maxMembers}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Host</div>
                  <div className="mt-1 text-lg font-semibold text-slate-950">{pod.owner.name}</div>
                </div>
              </div>

              {pod.credentials ? (
                <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-sm font-medium text-emerald-900">Shared credentials</div>
                  <div className="mt-2 break-all text-sm text-emerald-800">{pod.credentials}</div>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  Credentials are only shown to active members.
                </div>
              )}

              {billing ? (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-900">Current billing cycle</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {billing.month}/{billing.year} · Collected ${billing.totalCollected.toFixed(2)} so far
                      </div>
                    </div>
                    <div className="text-sm font-medium text-slate-900">
                      Split ${billing.splitAmount.toFixed(2)}
                    </div>
                  </div>
                </div>
              ) : null}
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-medium text-slate-950">Actions</h3>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button onClick={handleJoin}>Join Pod</Button>
                {currentUserBilling && currentUserBilling.paymentStatus !== "COMPLETED" ? (
                  <Button variant="secondary" onClick={handlePay}>
                    Pay My Share
                  </Button>
                ) : null}
              </div>
              {currentUserBilling ? (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  Your status this month: <span className="font-medium text-slate-950">{currentUserBilling.paymentStatus}</span>
                </div>
              ) : null}

              <form className="mt-6 space-y-3" onSubmit={handleInvite}>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">Invite by email</span>
                  <input
                    className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-slate-950"
                    type="email"
                    placeholder="friend@stanford.edu"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                  />
                </label>
                {acceptedFriends.length > 0 ? (
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">Or pick an accepted friend</span>
                    <select
                      className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-slate-950"
                      value=""
                      onChange={(event) => {
                        if (event.target.value) {
                          setInviteEmail(event.target.value);
                        }
                      }}
                    >
                      <option value="">Choose a friend</option>
                      {acceptedFriends.map((friend) => (
                        <option key={friend.id} value={friend.email}>
                          {friend.name} ({friend.email})
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <Button type="submit" variant="secondary" disabled={!isOwner}>Send Invite</Button>
              </form>
              {!isOwner ? (
                <p className="mt-3 text-xs text-slate-500">Only the host can send pod invites and manage members.</p>
              ) : null}
            </article>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-slate-950">Active members</h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {activeMembers.length}
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                {activeMembers.length === 0 ? (
                  <div className="text-sm text-slate-500">No active members yet.</div>
                ) : (
                  activeMembers.map((member) => (
                    <div key={member.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-slate-950">{member.user.name}</div>
                          <div className="mt-1 text-sm text-slate-500">
                            {member.status}
                            {member.user.major ? ` · ${member.user.major}` : ""}
                            {member.user.year ? ` · ${member.user.year}` : ""}
                          </div>
                        </div>
                        {isOwner && member.user.email !== pod.owner.email ? (
                          <Button variant="secondary" onClick={() => handleRemove(member.user.id)}>
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-slate-950">Pending members</h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {pendingMembers.length}
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                {pendingMembers.length === 0 ? (
                  <div className="text-sm text-slate-500">No pending approvals right now.</div>
                ) : (
                  pendingMembers.map((member) => (
                    <div key={member.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="font-medium text-slate-950">{member.user.name}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {member.user.email}
                        {member.user.major ? ` · ${member.user.major}` : ""}
                        {member.user.year ? ` · ${member.user.year}` : ""}
                      </div>
                      {isOwner ? (
                        <div className="mt-3 flex gap-2">
                          <Button onClick={() => handleApprove(member.user.id)}>Approve</Button>
                          <Button variant="secondary" onClick={() => handleRemove(member.user.id)}>
                            Remove
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </article>
          </div>

          {billing ? (
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-slate-950">Billing status</h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {billing.month}/{billing.year}
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {billing.memberBilling.map((entry) => (
                  <div key={entry.memberId} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-950">{entry.name}</div>
                        <div className="mt-1 text-sm text-slate-500">{entry.email}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-950">${entry.amountDue.toFixed(2)}</div>
                        <div className={`mt-1 text-xs font-medium ${entry.paymentStatus === "COMPLETED" ? "text-emerald-700" : "text-amber-700"}`}>
                          {entry.paymentStatus}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ) : null}
        </>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Unable to show pod ID: {id}
        </div>
      )}
    </section>
  );
}
