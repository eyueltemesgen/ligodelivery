import { useMediaUrl } from "@/lib/media";

/** Avatar that resolves a storage path (or remote URL) with an initial fallback. */
export function IdentityAvatar({
  path,
  name,
  className = "h-10 w-10 text-sm",
}: {
  path: string | null | undefined;
  name: string | null | undefined;
  className?: string;
}) {
  const url = useMediaUrl(path);
  if (url)
    return (
      <img
        src={url}
        alt={name || "Avatar"}
        className={`${className} shrink-0 rounded-full border border-border object-cover`}
      />
    );
  return (
    <div
      className={`flex ${className} shrink-0 items-center justify-center rounded-full bg-primary-soft font-display font-extrabold text-accent-foreground`}
    >
      {(name ?? "?").slice(0, 1).toUpperCase()}
    </div>
  );
}
