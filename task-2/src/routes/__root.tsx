import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { TopNav } from "@/components/top-nav";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatedBackground } from "@/components/animated-background";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Gatherwave — Discover and host events" },
      {
        name: "description",
        content:
          "Discover community events, RSVP in one tap, and host your own gatherings with QR check-in.",
      },
      { property: "og:title", content: "Gatherwave — Discover and host events" },
      {
        property: "og:description",
        content: "Discover events, RSVP in one tap, and host your own gatherings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Gatherwave — Discover and host events" },
      { name: "description", content: "An event hosting and attendance platform for organizers to publish events and manage attendees." },
      { property: "og:description", content: "An event hosting and attendance platform for organizers to publish events and manage attendees." },
      { name: "twitter:description", content: "An event hosting and attendance platform for organizers to publish events and manage attendees." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b1ad70bb-909c-4bc6-bcf3-abc26469bed2/id-preview-ed21c404--c0875a19-0a39-4055-9c98-a856e9cf863b.lovable.app-1778502024328.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b1ad70bb-909c-4bc6-bcf3-abc26469bed2/id-preview-ed21c404--c0875a19-0a39-4055-9c98-a856e9cf863b.lovable.app-1778502024328.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
        <Helmet>
          <title>Gatherwave — Discover and host events</title>
          <meta
            name="description"
            content="Discover events, RSVP with one tap, and host your own community gatherings."
          />
          <meta property="og:title" content="Gatherwave" />
          <meta
            property="og:description"
            content="Discover events, RSVP with one tap, and host your own community gatherings."
          />
          <meta property="og:type" content="website" />
          <meta name="twitter:card" content="summary_large_image" />
        </Helmet>
        <AnimatedBackground />
        <div className="relative flex min-h-screen flex-col">
          <TopNav />
          <div className="flex-1">
            <Outlet />
          </div>
          <SiteFooter />
        </div>
        <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border/60 bg-background/40 backdrop-blur-xl supports-[backdrop-filter]:bg-background/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {year} Gatherwave. Built for community gatherings.</p>
        <nav className="flex flex-wrap gap-4">
          <Link to="/explore" className="hover:text-foreground">
            Explore
          </Link>
          <Link to="/become-host" className="hover:text-foreground">
            Become a host
          </Link>
          <Link to="/tickets" className="hover:text-foreground">
            My tickets
          </Link>
        </nav>
      </div>
    </footer>
  );
}
