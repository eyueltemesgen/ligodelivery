import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RequireAuth } from "@/components/auth/guards";
import { AccountShell } from "@/components/account/AccountShell";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My account — የኔ Go" },
      {
        name: "description",
        content:
          "Your የኔ Go account center: track orders, manage addresses, saved products, profile and support.",
      },
      { property: "og:title", content: "My account — የኔ Go" },
      { property: "og:description", content: "Manage your የኔ Go orders, addresses and profile." },
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
