import type { ReactNode } from "react";

export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight">{title}</h1>
      {actions ? <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
