import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("opens / on the admin redirect and keeps the public marketing pages", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    expect(router.matchRoutes("/").at(-1)?.routeId).toBe("/");
    expect(router.matchRoutes("/admin").at(-1)?.routeId).toBe("/admin");
    expect(router.matchRoutes("/home").at(-1)?.routeId).toBe("/home");
    expect(router.matchRoutes("/services").at(-1)?.routeId).not.toBe(rootRouteId);
    expect(router.matchRoutes("/contact").at(-1)?.routeId).not.toBe(rootRouteId);
  });
});
