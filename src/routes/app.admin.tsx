import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Shield, Plus, Trash2, Pencil, FileText } from "lucide-react";
import { toast } from "sonner";

type Manual = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  content: string | null;
  file_path: string | null;
};

export const Route = createFileRoute("/app/admin")({
  component: AdminPage,
});

const empty = { title: "", description: "", category: "", content: "" };

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Manual | null>(null);
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data, error } = await supabase.from("manuals").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setManuals((data ?? []) as Manual[]);
  }
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!isAdmin) return <Navigate to="/app/chat" />;

  function openNew() { setEditing(null); setForm(empty); setFile(null); setOpen(true); }
  function openEdit(m: Manual) {
    setEditing(m);
    setForm({ title: m.title, description: m.description ?? "", category: m.category ?? "", content: m.content ?? "" });
    setFile(null);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      let file_path = editing?.file_path ?? null;
      if (file) {
        const path = `${user.id}/${Date.now()}_${file.name}`;
        const { error: upErr } = await supabase.storage.from("manuals").upload(path, file);
        if (upErr) throw upErr;
        file_path = path;
      }
      if (editing) {
        const { error } = await supabase.from("manuals").update({
          title: form.title, description: form.description, category: form.category,
          content: form.content, file_path, updated_at: new Date().toISOString(),
        }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Manual updated");
      } else {
        const { error } = await supabase.from("manuals").insert({
          title: form.title, description: form.description, category: form.category,
          content: form.content, file_path, created_by: user.id,
        });
        if (error) throw error;
        toast.success("Manual added");
      }
      setOpen(false); load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setBusy(false); }
  }

  async function remove(m: Manual) {
    if (!confirm(`Delete "${m.title}"?`)) return;
    if (m.file_path) await supabase.storage.from("manuals").remove([m.file_path]);
    const { error } = await supabase.from("manuals").delete().eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  }

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Shield className="h-6 w-6 text-primary" /> Admin · Manuals</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload user manuals. The chatbot uses these to train teachers.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add manual</Button>
      </div>

      <div className="grid gap-3">
        {manuals.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No manuals yet. Add the first one.</CardContent></Card>
        ) : manuals.map((m) => (
          <Card key={m.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> {m.title}</CardTitle>
                  {m.description && <CardDescription className="mt-1">{m.description}</CardDescription>}
                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                    {m.category && <span>Category: {m.category}</span>}
                    {m.file_path && <span>📎 File attached</span>}
                    {m.content && <span>{m.content.length} chars of text</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(m)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit manual" : "New manual"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div><Label>Title *</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Smartboards" /></div>
              <div><Label>File (PDF, optional)</Label><Input type="file" accept=".pdf,.txt,.md,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
            </div>
            <div><Label>Short description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div>
              <Label>Manual text *</Label>
              <Textarea required rows={10} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Paste the manual text here. The chatbot uses this content to answer teachers' questions." />
              <p className="text-xs text-muted-foreground mt-1">Tip: paste the full text — even if you also attach a PDF — so the AI can read it.</p>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
