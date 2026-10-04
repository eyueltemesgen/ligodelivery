import { translations } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { AuthPortal } from "@/components/auth/AuthPortal";

export const Route = createFileRoute("/merchant/login")({
  head: () => ({
    meta: [
      { title: translations.en.ml_meta_title },
      { name: "description", content: translations.en.ml_meta_desc },
      { property: "og:title", content: translations.en.ml_meta_title },
      { property: "og:description", content: translations.en.ml_meta_og_desc },
    ],
  }),
  component: () => <AuthPortal kind="merchant" />,
});
