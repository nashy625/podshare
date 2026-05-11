import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { supabase } from "../lib/supabase";

export function VerifyEmailPage() {
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    async function completeMagicLink() {
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);

      if (!active) {
        return;
      }

      if (error) {
        setStatus("error");
        return;
      }

      setStatus("success");
      window.setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 1000);
    }

    completeMagicLink().catch(() => {
      if (active) {
        setStatus("error");
      }
    });

    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <section className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Verify Email</h1>
        <p className="mt-2 text-slate-600">
          {status === "verifying" && "Completing your sign-in..."}
          {status === "success" && "Your session is ready. Redirecting to the dashboard..."}
          {status === "error" && "The magic link could not be verified. Try requesting a new one."}
        </p>
      </div>
      {status === "error" ? (
        <Link to="/login">
          <Button>Back to Login</Button>
        </Link>
      ) : null}
    </section>
  );
}
