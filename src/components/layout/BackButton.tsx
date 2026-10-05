import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useRouter } from "@tanstack/react-router";
import { useLanguage } from "@/hooks/useLanguage";

/**
 * Back affordance for pages reached by drilling into a list (shops, categories,
 * services…). Uses real browser history when there is a previous entry, so it
 * returns to the exact list the visitor came from, and falls back to `fallback`
 * for direct links/bookmarks where going back would leave the app.
 */
export function BackButton({
  fallback = "/",
  label,
  className,
}: {
  fallback?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const [canGoBack, setCanGoBack] = useState(false);
  const text = label ?? t("common_back");
  const classes = `inline-flex items-center gap-1.5 text-sm font-medium text-primary ${className ?? ""}`;

  // Resolved after mount so the server render and the first client render agree.
  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  if (canGoBack) {
    return (
      <button type="button" onClick={() => router.history.back()} className={classes}>
        <ArrowLeft className="h-4 w-4" />
        {text}
      </button>
    );
  }

  return (
    <Link to={fallback} className={classes}>
      <ArrowLeft className="h-4 w-4" />
      {text}
    </Link>
  );
}
