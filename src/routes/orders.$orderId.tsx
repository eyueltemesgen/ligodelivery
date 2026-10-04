import { translations } from "@/lib/i18n";
import { createFileRoute, Navigate } from "@tanstack/react-router";

// Backward-compatible shim: order tracking now lives inside the account
// center at /account/orders/$orderId.
export const Route = createFileRoute("/orders/$orderId")({
  head: () => ({
    meta: [
      { title: translations.en.ot_meta_title },
      {
        name: "description",
        content: translations.en.ot_meta_desc,
      },
    ],
  }),
  component: LegacyOrderRedirect,
});

function LegacyOrderRedirect() {
  const { orderId } = Route.useParams();
  return <Navigate to="/account/orders/$orderId" params={{ orderId }} replace />;
}
