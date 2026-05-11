import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import {
  fetchIncomingPodInvites,
  respondToPodInvite,
  type PodInviteRecord,
} from "../lib/pods";

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function InvitesPage() {
  const [invites, setInvites] = useState<PodInviteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await fetchIncomingPodInvites();
      setInvites(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  const pending = useMemo(() => invites.filter((invite) => invite.status === "PENDING"), [invites]);
  const history = useMemo(() => invites.filter((invite) => invite.status !== "PENDING"), [invites]);

  async function handleRespond(id: string, action: "accept" | "decline") {
    try {
      await respondToPodInvite(id, action);
      setMessage(`Invite ${action}ed.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update invite.");
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Invites</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Review private pod invitations from friends, accept the ones you want, and keep the rest archived in one place.
        </p>
      </div>

      {message ? <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</div> : null}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-slate-950">Pending pod invites</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {pending.length}
            </span>
          </div>
          <div className="mt-4 space-y-4">
            {loading ? (
              <div className="text-sm text-slate-500">Loading invites...</div>
            ) : pending.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                No pending invites right now.
              </div>
            ) : (
              pending.map((invite) => (
                <div key={invite.id} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-slate-950">{invite.pod.name}</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      {invite.pod.subscription.category}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      {invite.pod.visibility}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {invite.sender.name} invited you to share {invite.pod.subscription.name}.
                  </p>
                  <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400">Split cost</div>
                      <div className="mt-1 text-sm font-medium text-slate-950">
                        {currency(Number(invite.pod.costPerMember))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400">Host</div>
                      <div className="mt-1 text-sm font-medium text-slate-950">{invite.pod.owner.name}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button onClick={() => handleRespond(invite.id, "accept")}>Accept Invite</Button>
                    <Button variant="secondary" onClick={() => handleRespond(invite.id, "decline")}>
                      Decline
                    </Button>
                    <Link to={`/pods/${invite.pod.id}`}>
                      <Button variant="secondary">Preview Pod</Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-950">Invite history</h2>
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="text-sm text-slate-500">Loading history...</div>
            ) : history.length === 0 ? (
              <div className="text-sm text-slate-500">No invite history yet.</div>
            ) : (
              history.map((invite) => (
                <div key={invite.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="font-medium text-slate-950">{invite.pod.name}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {invite.pod.subscription.name} · {invite.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
