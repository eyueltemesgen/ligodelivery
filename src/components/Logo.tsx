import { Link } from "@tanstack/react-router";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary font-display text-lg font-extrabold text-primary-foreground">
        L
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-xl font-extrabold tracking-tight">Ligo</span>
          <span className="block text-[11px] font-medium text-muted-foreground">Fast. Local. Delivered.</span>
        </span>
      )}
    </Link>
  );
}