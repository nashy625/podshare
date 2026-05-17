import { Link } from "react-router-dom";

export function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="text-xl font-semibold tracking-tight text-slate-950">
          PodShare
        </Link>
        <nav className="flex items-center gap-6 text-sm text-slate-600">
          <Link to="/pods">Explore Pods</Link>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/subscriptions">Subscriptions</Link>
          <Link to="/friends">Friends</Link>
          <Link to="/invites">Invites</Link>
          <Link to="/notifications">Notifications</Link>
          <Link to="/operations">Operations</Link>
          <Link to="/profile">Profile</Link>
        </nav>
      </div>
    </header>
  );
}
