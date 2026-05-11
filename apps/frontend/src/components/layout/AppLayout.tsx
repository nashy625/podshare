import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Sidebar />
        <main className="min-h-[70vh] flex-1 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
