import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KeyRound, Plus, Eye, EyeOff, Copy, Trash2, Pencil, Users, Lock } from "lucide-react";
import { toast } from "sonner";

type Entry = {
  id: string;
  user_id: string;
  title: string;
  username: string | null;
  password: string | null;
  url: string | null;
  notes: string | null;
  is_shared: boolean;
};

export const Route = createFileRoute("/app/vault")({
  component: VaultPage,
});

const empty = { title: "", username: "", password: "", url: "", notes: "", is_shared: false };

function VaultPage() {
  const { user, isAdmin } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("vault_entries").select("*").order("title");
    if (error) toast.error(error.message);
    else setEntries((data ?? []) as Entry[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }
  function openEdit(e: Entry) {
    setEditing(e);
    setForm({
      title: e.title,
      username: e.username ?? "",
      password: e.password ?? "",
      url: e.url ?? "",
      notes: e.notes ?? "",
      is_shared: e.is_shared,
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (form.is_shared && !isAdmin) return toast.error("Only admins can manage shared logins");

    if (editing) {
      const { error } = await supabase.from("vault_entries").update({
        title: form.title, username: form.username, password: form.password,
        url: form.url, notes: form.notes, is_shared: form.is_shared, updated_at: new Date().toISOString(),
      }).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("vault_entries").insert({
        user_id: user.id, title: form.title, username: form.username, password: form.password,
        url: form.url, notes: form.notes, is_shared: form.is_shared,
      });
      if (error) return toast.error(error.message);
      toast.success("Saved");
    }
    setOpen(false);
    load();
  }

  async function remove(e: Entry) {
    if (!confirm(`Delete "${e.title}"?`)) return;
    const { error } = await supabase.from("vault_entries").delete().eq("id", e.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  }

  const personal = entries.filter((e) => !e.is_shared);
  const shared = entries.filter((e) => e.is_shared);

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><KeyRound className="h-6 w-6 text-primary" /> Password Vault</h1>
          <p className="text-sm text-muted-foreground mt-1">Securely save your logins. Personal entries are visible only to you.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New entry</Button>
      </div>

      <Tabs defaultValue="personal">
        <TabsList>
          <TabsTrigger value="personal"><Lock className="h-3.5 w-3.5 mr-1.5" /> My logins ({personal.length})</TabsTrigger>
          <TabsTrigger value="shared"><Users className="h-3.5 w-3.5 mr-1.5" /> Shared school logins ({shared.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="personal">
          <EntryList entries={personal} loading={loading} onEdit={openEdit} onDelete={remove} canEdit={() => true} />
        </TabsContent>
        <TabsContent value="shared">
          <EntryList entries={shared} loading={loading} onEdit={openEdit} onDelete={remove} canEdit={() => isAdmin}
            empty="No shared school logins yet." />
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit entry" : "New entry"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div><Label>Title *</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Google Classroom" /></div>
            <div><Label>Username / email</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
            <div><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div><Label>URL</Label><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
            {isAdmin && (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label>Shared school login</Label>
                  <p className="text-xs text-muted-foreground">Visible to all teachers</p>
                </div>
                <Switch checked={form.is_shared} onCheckedChange={(v) => setForm({ ...form, is_shared: v })} />
              </div>
            )}
            <DialogFooter><Button type="submit">{editing ? "Save" : "Create"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EntryList({
  entries, loading, onEdit, onDelete, canEdit, empty = "No entries yet.",
}: {
  entries: Entry[]; loading: boolean;
  onEdit: (e: Entry) => void; onDelete: (e: Entry) => void;
  canEdit: (e: Entry) => boolean; empty?: string;
}) {
  const [show, setShow] = useState<Record<string, boolean>>({});
  if (loading) return <p className="text-sm text-muted-foreground mt-4">Loading…</p>;
  if (entries.length === 0) return <Card className="mt-4"><CardContent className="py-12 text-center text-muted-foreground">{empty}</CardContent></Card>;

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  }

  return (
    <div className="grid gap-3 mt-4 md:grid-cols-2">
      {entries.map((e) => (
        <Card key={e.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{e.title}</CardTitle>
                {e.url && <a href={e.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline truncate block max-w-[220px]">{e.url}</a>}
              </div>
              {e.is_shared && <Badge variant="secondary"><Users className="h-3 w-3 mr-1" />Shared</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {e.username && (
              <div className="flex items-center justify-between gap-2">
                <div className="truncate"><span className="text-muted-foreground">User:</span> {e.username}</div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(e.username!, "Username")}><Copy className="h-3.5 w-3.5" /></Button>
              </div>
            )}
            {e.password && (
              <div className="flex items-center justify-between gap-2">
                <div className="truncate font-mono"><span className="text-muted-foreground font-sans">Pass:</span> {show[e.id] ? e.password : "••••••••"}</div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShow({ ...show, [e.id]: !show[e.id] })}>
                    {show[e.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(e.password!, "Password")}><Copy className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            )}
            {e.notes && <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">{e.notes}</p>}
            {canEdit(e) && (
              <div className="flex gap-1 pt-2 border-t">
                <Button size="sm" variant="ghost" onClick={() => onEdit(e)}><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDelete(e)}><Trash2 className="h-3.5 w-3.5 mr-1" />Delete</Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
