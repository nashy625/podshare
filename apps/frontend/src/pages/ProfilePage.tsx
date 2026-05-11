import { useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { updateProfile } from "../lib/profile";

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    name: "",
    major: "",
    year: "",
    avatarUrl: "",
  });
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }

    setForm({
      name: user.name ?? "",
      major: user.major ?? "",
      year: user.year ? String(user.year) : "",
      avatarUrl: user.avatarUrl ?? "",
    });
  }, [user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      await updateProfile({
        name: form.name,
        major: form.major || undefined,
        year: form.year ? Number(form.year) : undefined,
        avatarUrl: form.avatarUrl || undefined,
      });
      await refreshUser();
      setStatus("success");
      setMessage("Profile saved.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to save profile.");
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Profile</h1>
        <p className="mt-2 text-slate-600">Stanford profile details determine trust and discoverability.</p>
      </div>
      {message ? (
        <div className={`rounded-2xl px-4 py-3 text-sm ${status === "error" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-700"}`}>
          {message}
        </div>
      ) : null}
      <form className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2" onSubmit={handleSubmit}>
        <Input
          label="Full name"
          placeholder="Joy Example"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        />
        <Input
          label="Major"
          placeholder="Computer Science"
          value={form.major}
          onChange={(event) => setForm((current) => ({ ...current, major: event.target.value }))}
        />
        <Input
          label="Graduation year"
          type="number"
          placeholder="2027"
          value={form.year}
          onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))}
        />
        <Input
          label="Avatar URL"
          type="url"
          placeholder="https://..."
          value={form.avatarUrl}
          onChange={(event) => setForm((current) => ({ ...current, avatarUrl: event.target.value }))}
        />
        <div className="md:col-span-2">
          <Button type="submit" disabled={status === "saving"}>
            {status === "saving" ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </form>
    </section>
  );
}
