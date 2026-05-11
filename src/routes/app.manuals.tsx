import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BookOpen, FileDown, Search } from "lucide-react";
import { toast } from "sonner";

type Manual = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  content: string | null;
  file_path: string | null;
  created_at: string;
};

export const Route = createFileRoute("/app/manuals")({
  component: ManualsPage,
});

function ManualsPage() {
  const { isAdmin } = useAuth();
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Manual | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("manuals").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setManuals((data ?? []) as Manual[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function download(m: Manual) {
    if (!m.file_path) return;
    const { data, error } = await supabase.storage.from("manuals").createSignedUrl(m.file_path, 60);
    if (error || !data) return toast.error("Could not get file");
    window.open(data.signedUrl, "_blank");
  }

  const filtered = manuals.filter((m) =>
    !q || m.title.toLowerCase().includes(q.toLowerCase()) || (m.description ?? "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><BookOpen className="h-6 w-6 text-primary" /> Manuals</h1>
          <p className="text-sm text-muted-foreground mt-1">Step-by-step guides for your classroom technology.</p>
        </div>
        {isAdmin && <Link to="/app/admin"><Button>Manage manuals</Button></Link>}
      </div>

      <div className="relative mb-5 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search manuals…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          {manuals.length === 0 ? "No manuals yet. " : "No matches. "}
          {isAdmin && manuals.length === 0 && <Link to="/app/admin" className="text-primary underline">Add the first one →</Link>}
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <Card key={m.id} className="hover:shadow-[var(--shadow-soft)] transition cursor-pointer" onClick={() => setOpen(m)}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{m.title}</CardTitle>
                  {m.category && <Badge variant="secondary">{m.category}</Badge>}
                </div>
                {m.description && <CardDescription className="line-clamp-2">{m.description}</CardDescription>}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{open.title}</DialogTitle>
                {open.description && <p className="text-sm text-muted-foreground">{open.description}</p>}
              </DialogHeader>
              {open.content && <div className="text-sm whitespace-pre-wrap mt-3">{open.content}</div>}
              {open.file_path && (
                <Button variant="outline" onClick={() => download(open)} className="mt-3 w-fit">
                  <FileDown className="h-4 w-4 mr-2" /> Download attached file
                </Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
