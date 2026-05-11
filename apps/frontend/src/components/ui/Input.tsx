import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Input({ label, className = "", ...props }: InputProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        {...props}
        className={`w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-slate-950 ${className}`}
      />
    </label>
  );
}
