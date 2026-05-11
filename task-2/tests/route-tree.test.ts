import { describe, it, expect } from "vitest";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";

/**
 * Smoke test to guarantee that critical host-dashboard routes
 * are registered in the generated route tree. This catches the
 * "layout file without <Outlet />" bug we just fixed: if someone
 * removes host.index.tsx or the host.tsx layout wrapper, these
 * paths drop out of FileRoutesById and the test fails.
 */
describe("route tree", () => {
  const router = createRouter({ routeTree });
  const ids = Object.keys(router.routesById);

  it.each([
    "/",
    "/auth",
    "/explore",
    "/events",
    "/tickets",
    "/become-host",
    "/host",
    "/host/",
    "/host/members",
    "/host/events/new",
    "/host/events/$eventId",
    "/host/events/$eventId/",
    "/host/events/$eventId/edit",
    "/host/events/$eventId/check-in",
    "/event/$eventId",
    "/hosts/$slug",
    "/invite/$token",
  ])("registers route %s", (id) => {
    expect(ids).toContain(id);
  });

  it("layout routes have a component (so children render via <Outlet />)", () => {
    for (const layoutId of ["/host", "/host/events/$eventId"]) {
      const route = (router.routesById as any)[layoutId];
      expect(route, `route ${layoutId} should exist`).toBeTruthy();
      expect(route.options?.component, `route ${layoutId} must define a component`).toBeTruthy();
    }
  });
});