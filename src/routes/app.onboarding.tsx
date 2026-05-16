import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { completeOnboarding } from "@/lib/onboarding.functions";
import {
  GraduationCap,
  MessageSquareText,
  BookOpen,
  KeyRound,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Bot,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/app/onboarding")({
  component: OnboardingPage,
});

const STEPS = [
  {
    title: "Welcome to School Help Desk",
    subtitle: "Your one-stop hub for classroom technology support.",
    icon: GraduationCap,
    content:
      "This app is designed to help you get the most out of your school's technology. Whether you need quick answers, step-by-step guides, or a secure place to store passwords, we've got you covered.",
    color: "text-primary",
    bg: "bg-primary-soft",
  },
  {
    title: "AI Help Desk",
    subtitle: "Ask anything about your classroom tech.",
    icon: MessageSquareText,
    content:
      "Our AI assistant is trained on your school's user manuals. Ask questions like \"How do I set up my Smartboard?\" or \"Why won't my projector connect?\" and get instant, accurate answers based on real documentation.",
    color: "text-primary",
    bg: "bg-primary-soft",
  },
  {
    title: "Manuals Library",
    subtitle: "Browse guides written for your school.",
    icon: BookOpen,
    content:
      "Access a curated collection of step-by-step manuals for every tool teachers use — from Smartboards and projectors to learning management systems and classroom software.",
    color: "text-primary",
    bg: "bg-primary-soft",
  },
  {
    title: "Password Vault",
    subtitle: "Never forget a login again.",
    icon: KeyRound,
    content:
      "Store your personal passwords privately. Plus, access shared school logins (like copier codes or software licenses) that your admin has made available to all teachers.",
    color: "text-primary",
    bg: "bg-primary-soft",
  },
  {
    title: "You're All Set!",
    subtitle: "Let's get you up and running.",
    icon: CheckCircle2,
    content:
      "You're ready to explore. If you ever need a refresher, you can revisit this onboarding from your profile settings.",
    color: "text-success",
    bg: "bg-success/10",
  },
];

function OnboardingPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const markComplete = useServerFn(completeOnboarding);
  const [step, setStep] = useState(0);
  const [checkedProfile, setCheckedProfile] = useState(false);

  // Redirect if onboarding already completed
  useEffect(() => {
    if (loading || !user || checkedProfile) return;
    supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setCheckedProfile(true);
        if (data?.onboarding_completed) {
          nav({ to: "/app/chat" });
        }
      });
  }, [user, loading, checkedProfile, nav]);

  // Skip while loading
  if (loading || !user || !checkedProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  const current = STEPS[step];
  const Icon = current.icon;
  const progress = ((step + 1) / STEPS.length) * 100;

  async function finish() {
    await markComplete({ data: undefined });
    nav({ to: "/app/chat" });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <GraduationCap className="h-5 w-5 text-primary" />
            School Help Desk
          </div>
          <div className="text-xs text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </div>
        </div>

        <Progress value={progress} className="mb-8 h-2" />

        <Card className="p-6 md:p-8 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col items-center text-center">
            <div
              className={`mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${current.bg}`}
            >
              <Icon className={`h-8 w-8 ${current.color}`} />
            </div>

            <h2 className="text-2xl font-bold tracking-tight">
              {current.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {current.subtitle}
            </p>

            <p className="mt-5 text-sm leading-relaxed text-foreground/80">
              {current.content}
            </p>

            {/* Feature pills for non-welcome steps */}
            {step === 1 && (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {[
                  { icon: Bot, label: "Instant answers" },
                  { icon: Sparkles, label: "Manual-trained AI" },
                  { icon: ShieldCheck, label: "School-specific" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary"
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    {item.label}
                  </div>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {["Private passwords", "Shared school logins", "Secure storage"].map(
                  (label) => (
                    <div
                      key={label}
                      className="rounded-full bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary"
                    >
                      {label}
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className={step === 0 ? "invisible" : ""}
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button size="sm" onClick={() => setStep((s) => s + 1)}>
                Next <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={finish}>
                Get Started <Sparkles className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>

        {/* Skip link */}
        {step < STEPS.length - 1 && (
          <div className="mt-4 text-center">
            <button
              onClick={finish}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Skip onboarding
            </button>
          </div>
        )}

        {/* Step dots */}
        <div className="mt-6 flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-2 rounded-full transition-all ${
                i === step
                  ? "w-6 bg-primary"
                  : i < step
                    ? "w-2 bg-primary/50"
                    : "w-2 bg-muted-foreground/25"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
