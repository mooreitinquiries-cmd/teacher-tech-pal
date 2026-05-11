import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { askHelpDesk } from "@/lib/chat.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Send, Bot, User as UserIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/chat")({
  component: ChatPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "How do I set up my Smartboard?",
  "How do I share a Google Classroom assignment?",
  "My projector won't connect, what should I try?",
  "How do I reset my school email password?",
];

function ChatPage() {
  const ask = useServerFn(askHelpDesk);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await ask({ data: { messages: next } });
      if (res.error) toast.error(res.error);
      if (res.reply) setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to get a reply");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-0px)] md:h-screen">
      <div className="border-b bg-card px-6 py-4">
        <h1 className="text-lg font-semibold flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Help Desk</h1>
        <p className="text-sm text-muted-foreground">Ask anything about your classroom technology.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Bot className="h-10 w-10 mx-auto text-primary mb-3" />
              <h2 className="font-semibold text-lg">Hi! How can I help you today?</h2>
              <p className="text-sm text-muted-foreground mt-1">I'm trained on your school's user manuals.</p>
              <div className="mt-6 grid sm:grid-cols-2 gap-2 max-w-xl mx-auto">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)}
                    className="text-left text-sm rounded-lg border bg-card hover:bg-primary-soft px-4 py-3 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && <div className="h-8 w-8 rounded-full bg-primary-soft flex items-center justify-center flex-shrink-0"><Bot className="h-4 w-4 text-primary" /></div>}
              <Card className={`px-4 py-3 max-w-[85%] ${m.role === "user" ? "bg-primary text-primary-foreground" : ""}`}>
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</div>
              </Card>
              {m.role === "user" && <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0"><UserIcon className="h-4 w-4" /></div>}
            </div>
          ))}
          {busy && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary-soft flex items-center justify-center"><Bot className="h-4 w-4 text-primary animate-pulse" /></div>
              <Card className="px-4 py-3 text-sm text-muted-foreground">Thinking…</Card>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t bg-card px-4 md:px-8 py-4">
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="mx-auto max-w-3xl flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask a question…"
            rows={1}
            className="resize-none min-h-[44px] max-h-40"
            disabled={busy}
          />
          <Button type="submit" disabled={busy || !input.trim()} size="icon" className="h-11 w-11 flex-shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
