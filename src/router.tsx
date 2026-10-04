import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Short default so customer/order data stays fresh; public catalogue
        // queries opt into a longer window individually.
        staleTime: 15_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    // Preloaded route data stays usable for a short window instead of being
    // refetched the instant the user actually navigates.
    defaultPreloadStaleTime: 30_000,
  });

  return router;
};
