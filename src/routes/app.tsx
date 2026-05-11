import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { GraduationCap, MessageSquareText, BookOpen, KeyRound, Shield, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [user, loading, nav]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  const links = [
    { to: "/app/chat", label: "Help Desk", icon: MessageSquareText },
    { to: "/app/manuals", label: "Manuals", icon: BookOpen },
    { to: "/app/vault", label: "Vault", icon: KeyRound },
    ...(isAdmin ? [{ to: "/app/admin", label: "Admin", icon: Shield }] : []),
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex w-60 flex-col border-r bg-sidebar">
        <div className="flex items-center gap-2 px-5 py-5 font-semibold text-sidebar-foreground">
          <GraduationCap className="h-5 w-5 text-primary" />
          Help Desk
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {links.map((l) => {
            const active = loc.pathname.startsWith(l.to);
            return (
              <Link key={l.to} to={l.to}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                         : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                )}>
                <l.icon className="h-4 w-4" /> {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3 text-xs text-muted-foreground">
          <div className="px-2 pb-2 truncate">{user.email}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2 font-semibold"><GraduationCap className="h-5 w-5 text-primary" /> Help Desk</div>
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
        </div>
        <div className="md:hidden flex gap-1 overflow-x-auto border-b px-2 py-2">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted whitespace-nowrap">
              <l.icon className="h-3.5 w-3.5" /> {l.label}
            </Link>
          ))}
        </div>
        <Outlet />
      </main>
    </div>
  );
}
