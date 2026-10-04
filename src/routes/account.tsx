import { translations } from "@/lib/i18n";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RequireAuth } from "@/components/auth/guards";
import { AccountShell } from "@/components/account/AccountShell";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: translations.en.acct_meta_title },
      {
        name: "description",
        content: translations.en.acct_meta_desc,
      },
      { property: "og:title", content: translations.en.acct_meta_title },
      { property: "og:description", content: translations.en.acct_meta_og_desc },
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
