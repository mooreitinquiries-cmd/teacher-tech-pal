import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { GraduationCap, MessageSquareText, BookOpen, KeyRound } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/app/chat" />;

  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-semibold">
          <GraduationCap className="h-6 w-6 text-primary" />
          School Help Desk
        </div>
        <Link to="/login"><Button variant="outline">Sign in</Button></Link>
      </header>

      <section className="container mx-auto px-6 pt-12 pb-20 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
          Tech help for teachers, <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-hero)" }}>made simple.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
          An AI assistant trained on your school's user manuals, plus a secure vault for the logins and passwords teachers always forget.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/login"><Button size="lg">Get started</Button></Link>
        </div>
      </section>

      <section className="container mx-auto grid gap-6 px-6 pb-24 md:grid-cols-3">
        {[
          { icon: MessageSquareText, title: "AI Help Desk", desc: "Ask anything about your classroom tech. Answers come from your real manuals." },
          { icon: BookOpen, title: "Manual library", desc: "Browse step-by-step guides for every tool teachers use." },
          { icon: KeyRound, title: "Password vault", desc: "Save personal logins privately. Shared school logins for everyone." },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border bg-card p-6 shadow-[var(--shadow-soft)]">
            <f.icon className="h-6 w-6 text-primary" />
            <h3 className="mt-4 font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
