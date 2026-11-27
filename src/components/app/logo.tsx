export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`shrink-0 ${className}`} aria-hidden="true">
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path d="M9 10.5 16 22l7-11.5" fill="none" className="stroke-primary-foreground" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="10.5" r="2.4" className="fill-primary-foreground" />
      <circle cx="23" cy="10.5" r="2.4" className="fill-primary-foreground" />
      <circle cx="16" cy="22" r="2.8" className="fill-primary-foreground" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="truncate text-[1.05rem] font-semibold tracking-tight">
        Vision<span className="text-primary">Net</span>
      </span>
    </div>
  );
}
