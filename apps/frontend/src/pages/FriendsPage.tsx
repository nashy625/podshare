import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import {
  fetchFriendships,
  respondToFriendRequest,
  sendFriendRequest,
  type Friendship,
} from "../lib/friends";

function personMeta(friendship: Friendship, currentEmail: string) {
  return friendship.requester.email === currentEmail ? friendship.addressee : friendship.requester;
}

export function FriendsPage() {
  const { user } = useAuth();
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await fetchFriendships();
      setFriendships(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  const accepted = useMemo(
    () => friendships.filter((friendship) => friendship.status === "ACCEPTED"),
    [friendships],
  );
  const incoming = useMemo(
    () =>
      friendships.filter(
        (friendship) => friendship.status === "PENDING" && friendship.addressee.email === user?.email,
      ),
    [friendships, user?.email],
  );
  const outgoing = useMemo(
    () =>
      friendships.filter(
        (friendship) => friendship.status === "PENDING" && friendship.requester.email === user?.email,
      ),
    [friendships, user?.email],
  );

  async function handleSendRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inviteEmail) {
      return;
    }

    setSending(true);
    setMessage("");
    try {
      await sendFriendRequest(inviteEmail);
      setInviteEmail("");
      setMessage("Friend request sent.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send request.");
    } finally {
      setSending(false);
    }
  }

  async function handleRespond(id: string, action: "accept" | "decline" | "block") {
    try {
      await respondToFriendRequest(id, action);
      setMessage(`Request ${action}ed.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update request.");
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Friends</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Add people you trust, manage incoming requests, and build the network you can invite into private subscription shares.
          </p>
        </div>
      </div>

      <form
        className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row"
        onSubmit={handleSendRequest}
      >
        <input
          className="flex-1 rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-slate-950"
          type="email"
          placeholder="friend@stanford.edu"
          value={inviteEmail}
          onChange={(event) => setInviteEmail(event.target.value)}
        />
        <Button type="submit" disabled={sending}>
          {sending ? "Sending..." : "Send Friend Request"}
        </Button>
      </form>

      {message ? <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</div> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-950">Incoming requests</h2>
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="text-sm text-slate-500">Loading requests...</div>
            ) : incoming.length === 0 ? (
              <div className="text-sm text-slate-500">No pending incoming requests.</div>
            ) : (
              incoming.map((friendship) => {
                const person = personMeta(friendship, user?.email ?? "");
                return (
                  <div key={friendship.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="font-medium text-slate-950">{person.name}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {person.email}
                      {person.major ? ` · ${person.major}` : ""}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button onClick={() => handleRespond(friendship.id, "accept")}>Accept</Button>
                      <Button variant="secondary" onClick={() => handleRespond(friendship.id, "decline")}>
                        Decline
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-950">Pending outgoing</h2>
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="text-sm text-slate-500">Loading requests...</div>
            ) : outgoing.length === 0 ? (
              <div className="text-sm text-slate-500">No pending outgoing requests.</div>
            ) : (
              outgoing.map((friendship) => {
                const person = personMeta(friendship, user?.email ?? "");
                return (
                  <div key={friendship.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="font-medium text-slate-950">{person.name}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {person.email}
                      {person.year ? ` · ${person.year}` : ""}
                    </div>
                    <div className="mt-3 text-xs uppercase tracking-wide text-amber-600">Awaiting response</div>
                  </div>
                );
              })
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-950">Your network</h2>
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="text-sm text-slate-500">Loading friends...</div>
            ) : accepted.length === 0 ? (
              <div className="text-sm text-slate-500">No accepted friends yet.</div>
            ) : (
              accepted.map((friendship) => {
                const person = personMeta(friendship, user?.email ?? "");
                return (
                  <div key={friendship.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="font-medium text-slate-950">{person.name}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {person.email}
                      {person.major ? ` · ${person.major}` : ""}
                      {person.year ? ` · ${person.year}` : ""}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
