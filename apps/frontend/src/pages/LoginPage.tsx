import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const { session, user, sendMagicLink, signOut } = useAuth();

  if (session) {
    return (
      <section className="mx-auto max-w-xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">You are already signed in</h1>
          <p className="mt-2 text-slate-600">
            {user?.email
              ? `Current session: ${user.email}`
              : "A saved browser session is active for this device."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <Link to="/dashboard">
            <Button>Open Dashboard</Button>
          </Link>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              signOut().catch(() => undefined);
            }}
          >
            Sign Out
          </Button>
        </div>
      </section>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      await sendMagicLink(email.trim().toLowerCase());
      setStatus("sent");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unable to send magic link");
    }
  }

  return (
    <section className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Sign in with your Stanford email</h1>
        <p className="mt-2 text-slate-600">Magic links keep authentication simple and avoid password storage.</p>
      </div>
      <form className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
        <Input
          label="Stanford email"
          type="email"
          placeholder="you@stanford.edu"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Sending..." : "Send Magic Link"}
        </Button>
        {status === "sent" ? (
          <p className="text-sm text-emerald-600">Check your inbox for the sign-in link.</p>
        ) : null}
        {status === "error" ? (
          <p className="text-sm text-rose-600">{errorMessage || "Something went wrong."}</p>
        ) : null}
      </form>
    </section>
  );
}
