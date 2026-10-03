import { createFileRoute, Navigate } from "@tanstack/react-router";

// Backward-compatible shim: order tracking now lives inside the account
// center at /account/orders/$orderId.
export const Route = createFileRoute("/orders/$orderId")({
  head: () => ({
    meta: [
      { title: "Order tracking — የኔ Go" },
      {
        name: "description",
        content: "Live tracking, delivery timeline and payment status for your የኔ Go order.",
      },
    ],
  }),
  component: LegacyOrderRedirect,
});

function LegacyOrderRedirect() {
  const { orderId } = Route.useParams();
  return <Navigate to="/account/orders/$orderId" params={{ orderId }} replace />;
}
