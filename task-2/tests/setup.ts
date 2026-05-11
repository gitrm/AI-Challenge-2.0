import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Stub Supabase env so client.ts doesn't throw during tests.
if (!import.meta.env.VITE_SUPABASE_URL) {
  (import.meta.env as any).VITE_SUPABASE_URL = "http://localhost:54321";
  (import.meta.env as any).VITE_SUPABASE_PUBLISHABLE_KEY = "test-anon-key";
}

// Avoid hitting Supabase in route smoke tests.
vi.mock("@/integrations/supabase/client", () => {
  const noopBuilder: any = {
    select: () => noopBuilder,
    eq: () => noopBuilder,
    in: () => noopBuilder,
    order: () => noopBuilder,
    maybeSingle: async () => ({ data: null, error: null }),
    then: (resolve: any) => Promise.resolve({ data: [], error: null, count: 0 }).then(resolve),
  };
  return {
    supabase: {
      auth: {
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        getSession: async () => ({ data: { session: null } }),
        signOut: async () => ({}),
      },
      from: () => noopBuilder,
    },
  };
});