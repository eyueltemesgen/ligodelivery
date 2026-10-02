import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RequireAuth } from "@/components/auth/guards";
import { AccountShell } from "@/components/account/AccountShell";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My account — Ligo Delivery" },
      {
        name: "description",
        content:
          "Your Ligo account center: track orders, manage addresses, saved products, profile and support.",
      },
      { property: "og:title", content: "My account — Ligo Delivery" },
      { property: "og:description", content: "Manage your Ligo orders, addresses and profile." },
    ],
  }),
  component: AccountLayout,
});

function AccountLayout() {
  return (
    <RequireAuth>
      <AccountShell>
        <Outlet />
      </AccountShell>
    </RequireAuth>
  );
}
