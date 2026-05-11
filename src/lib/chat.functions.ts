import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const InputSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string().min(1).max(8000),
  })).min(1).max(40),
});

export const askHelpDesk = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    // Pull all manuals as knowledge base (admin client; manuals are visible to all auth users anyway)
    const { data: manuals } = await supabaseAdmin
      .from("manuals")
      .select("title, description, category, content")
      .order("created_at", { ascending: false })
      .limit(50);

    const kb = (manuals ?? [])
      .map((m) => `### ${m.title}${m.category ? ` (${m.category})` : ""}\n${m.description ?? ""}\n${m.content ?? ""}`)
      .join("\n\n---\n\n")
      .slice(0, 60000);

    const system = `You are the school's friendly Help Desk assistant. You train teachers on how to use their classroom technology.
Answer using the user manuals below when relevant. If the manuals don't cover a question, give general best-practice guidance and suggest the teacher contact their IT admin.
Be patient, plain-spoken, and step-by-step. Use short numbered steps when explaining how to do something. Use markdown.

=== USER MANUALS ===
${kb || "(No manuals uploaded yet — answer with general best practices and suggest the admin upload manuals.)"}
=== END MANUALS ===`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, ...data.messages],
      }),
    });

    if (!res.ok) {
      if (res.status === 429) return { reply: "", error: "Too many requests right now. Please try again in a minute." };
      if (res.status === 402) return { reply: "", error: "AI credits exhausted. Please contact your admin." };
      const t = await res.text();
      console.error("AI gateway error", res.status, t);
      return { reply: "", error: "The assistant is unavailable right now." };
    }

    const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const reply = json.choices?.[0]?.message?.content ?? "";
    return { reply, error: null };
  });
