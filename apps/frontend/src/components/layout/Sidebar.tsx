import { NavLink } from "react-router-dom";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/subscriptions", label: "Subscriptions" },
  { to: "/subscriptions/new", label: "Add Subscription" },
  { to: "/friends", label: "Friends" },
  { to: "/invites", label: "Invites" },
  { to: "/pods", label: "Browse Pods" },
  { to: "/pods/new", label: "Create Pod" },
  { to: "/settings", label: "Settings" },
];

export function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 rounded-3xl bg-slate-900 p-4 text-slate-100 lg:block">
      <div className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
        Workspace
      </div>
      <nav className="space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `block rounded-2xl px-3 py-2 text-sm ${isActive ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"}`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
