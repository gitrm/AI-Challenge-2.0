import { Link } from "@tanstack/react-router";
import { Menu, CalendarDays } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { isSignedIn, hasHostMembership } = useAuth();
  const showBecomeHost = !isSignedIn || !hasHostMembership;

  return (
    <>
      <Link
        to="/explore"
        onClick={onNavigate}
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        activeProps={{ className: "text-foreground" }}
      >
        Explore
      </Link>
      {showBecomeHost && (
        <Link
          to="/become-host"
          onClick={onNavigate}
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          activeProps={{ className: "text-foreground" }}
        >
          Become a Host
        </Link>
      )}
      {isSignedIn && (
        <>
          {hasHostMembership && (
            <Link
              to="/host"
              onClick={onNavigate}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              Host
            </Link>
          )}
          <Link
            to="/tickets"
            onClick={onNavigate}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            My Tickets
          </Link>
          <Link
            to="/events"
            onClick={onNavigate}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            My Events
          </Link>
        </>
      )}
    </>
  );
}

export function TopNav() {
  const { isSignedIn, user, signOut } = useAuth();

  const initials = (user?.email ?? "?")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/40 backdrop-blur-xl supports-[backdrop-filter]:bg-background/30">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <CalendarDays className="h-5 w-5 text-primary" />
          <span>Gatherwave</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <NavLinks />
        </nav>

        <div className="flex items-center gap-2">
          {isSignedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="truncate">
                  {user?.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" variant="default" className="hidden md:inline-flex">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-4">
                <NavLinks />
                {!isSignedIn && (
                  <Link
                    to="/auth"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    Sign in
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
