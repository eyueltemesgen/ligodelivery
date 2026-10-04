import { translations } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { AuthPortal } from "@/components/auth/AuthPortal";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => {
    const out: { redirect?: string } = {};
    if (typeof s["redirect"] === "string") out.redirect = s["redirect"];
    return out;
  },
  head: () => ({
    meta: [
      { title: translations.en.login_meta_title },
      {
        name: "description",
        content: translations.en.login_meta_desc,
      },
      { property: "og:title", content: translations.en.login_meta_og_title },
      { property: "og:description", content: translations.en.login_meta_og_desc },
    ],
  }),
  component: () => <AuthPortal kind="customer" />,
});
