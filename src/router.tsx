import { QueryClient } from "@tanstack/react-query";
import { createRouter, isRedirect, redirect } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

/**
 * Trailing slash is the single canonical URL form for tyrefly.com.
 *
 * `trailingSlash: "always"` makes every generated <Link> href end in "/" and
 * makes the server normalise "/blog" -> "/blog/". That normalisation is emitted
 * as a temporary 307 by the router, so we upgrade it to a permanent 301 for
 * search engines. Only redirects that purely append a trailing slash to the
 * requested path are upgraded, so no chains or loops can be introduced.
 */
function upgradeTrailingSlashRedirectToPermanent(router: {
  beforeLoad: () => void;
  latestLocation: { pathname: string };
}) {
  const original = router.beforeLoad.bind(router);

  router.beforeLoad = () => {
    try {
      original();
      return;
    } catch (error) {
      if (!isRedirect(error) || error.status !== 307) throw error;

      const options = (error as Response & { options: Record<string, unknown> }).options;
      const href = typeof options["href"] === "string" ? options["href"] : "";
      const from = router.latestLocation.pathname;
      const [toPath] = href.split(/(?=[?#])/);

      if (toPath !== `${from}/`) throw error;

      throw redirect({ ...options, statusCode: 301 } as never);
    }
  };
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    trailingSlash: "always",
    defaultPreloadStaleTime: 0,
  });

  upgradeTrailingSlashRedirectToPermanent(router);

  return router;
};
