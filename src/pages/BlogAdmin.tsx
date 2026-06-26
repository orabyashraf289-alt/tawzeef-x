import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type BlogPost = {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string;
  excerpt_ar: string | null;
  excerpt_en: string | null;
  content_ar: string;
  content_en: string;
  cover_image: string | null;
  category: string | null;
  author_name: string;
  read_time_minutes: number | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
};

type FormState = Omit<BlogPost, "id" | "created_at" | "published_at">;

const empty: FormState = {
  slug: "",
  title_ar: "",
  title_en: "",
  excerpt_ar: "",
  excerpt_en: "",
  content_ar: "",
  content_en: "",
  cover_image: "",
  category: "general",
  author_name: "فريق Tawzeef-X",
  read_time_minutes: 5,
  published: false,
};

const slugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/[^\w\u0600-\u06FF\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);

export default function BlogAdmin() {
  const { t, locale } = useI18n();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<FormState>(empty);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else setPosts((data ?? []) as BlogPost[]);
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, []);

  const startNew = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const startEdit = (p: BlogPost) => {
    setEditing(p);
    setForm({
      slug: p.slug, title_ar: p.title_ar, title_en: p.title_en,
      excerpt_ar: p.excerpt_ar ?? "", excerpt_en: p.excerpt_en ?? "",
      content_ar: p.content_ar, content_en: p.content_en,
      cover_image: p.cover_image ?? "", category: p.category ?? "general",
      author_name: p.author_name, read_time_minutes: p.read_time_minutes ?? 5,
      published: p.published,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.slug || !form.title_ar || !form.title_en || !form.content_ar || !form.content_en) {
      toast({ title: "حقول ناقصة", description: "املأ slug والعنوان والمحتوى بالعربي والإنجليزي", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      ...form,
      created_by: user?.id ?? null,
      published_at: form.published ? new Date().toISOString() : null,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from("blog_posts").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("blog_posts").insert(payload));
    }
    setSaving(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "تم التحديث" : "تم النشر" });
    setOpen(false);
    fetchPosts();
  };

  const togglePublish = async (p: BlogPost) => {
    const { error } = await supabase.from("blog_posts")
      .update({ published: !p.published, published_at: !p.published ? new Date().toISOString() : null })
      .eq("id", p.id);
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else fetchPosts();
  };

  const remove = async (p: BlogPost) => {
    if (!confirm(`حذف "${p.title_ar}"؟`)) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", p.id);
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else fetchPosts();
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">إدارة المدونة</h1>
            <p className="text-muted-foreground mt-1">أنشئ وحرّر مقالات المدونة بلغتين</p>
          </div>
          <Button onClick={startNew} className="gap-2">
            <Plus className="w-4 h-4" /> مقال جديد
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : posts.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">لا توجد مقالات بعد</Card>
        ) : (
          <div className="grid gap-4">
            {posts.map(p => (
              <Card key={p.id} className="p-5 flex items-start gap-4">
                {p.cover_image && (
                  <img src={p.cover_image} alt="" className="w-24 h-24 rounded-lg object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={p.published ? "default" : "secondary"}>
                      {p.published ? "منشور" : "مسودة"}
                    </Badge>
                    {p.category && <Badge variant="outline">{p.category}</Badge>}
                    <span className="text-xs text-muted-foreground">/{p.slug}</span>
                  </div>
                  <h3 className="font-bold text-lg truncate">{locale === "ar" ? p.title_ar : p.title_en}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {locale === "ar" ? p.excerpt_ar : p.excerpt_en}
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => togglePublish(p)} className="gap-1">
                    {p.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {p.published ? "إخفاء" : "نشر"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => startEdit(p)} className="gap-1">
                    <Edit className="w-4 h-4" /> تحرير
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(p)} className="gap-1 text-destructive">
                    <Trash2 className="w-4 h-4" /> حذف
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "تحرير مقال" : "مقال جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Slug (الرابط)</Label>
                  <Input
                    value={form.slug}
                    onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))}
                    placeholder="my-post-title"
                  />
                </div>
                <div>
                  <Label>التصنيف</Label>
                  <Input value={form.category ?? ""} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
                </div>
              </div>

              <div>
                <Label>صورة الغلاف (URL)</Label>
                <Input value={form.cover_image ?? ""} onChange={e => setForm(f => ({ ...f, cover_image: e.target.value }))} placeholder="https://..." />
              </div>

              <Tabs defaultValue="ar">
                <TabsList>
                  <TabsTrigger value="ar">العربية</TabsTrigger>
                  <TabsTrigger value="en">English</TabsTrigger>
                </TabsList>
                <TabsContent value="ar" className="space-y-3 pt-3">
                  <div>
                    <Label>العنوان</Label>
                    <Input value={form.title_ar} onChange={e => setForm(f => ({ ...f, title_ar: e.target.value, slug: f.slug || slugify(e.target.value) }))} />
                  </div>
                  <div>
                    <Label>المقتطف</Label>
                    <Textarea rows={2} value={form.excerpt_ar ?? ""} onChange={e => setForm(f => ({ ...f, excerpt_ar: e.target.value }))} />
                  </div>
                  <div>
                    <Label>المحتوى (Markdown مدعوم)</Label>
                    <Textarea rows={10} value={form.content_ar} onChange={e => setForm(f => ({ ...f, content_ar: e.target.value }))} />
                  </div>
                </TabsContent>
                <TabsContent value="en" className="space-y-3 pt-3" dir="ltr">
                  <div>
                    <Label>Title</Label>
                    <Input value={form.title_en} onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Excerpt</Label>
                    <Textarea rows={2} value={form.excerpt_en ?? ""} onChange={e => setForm(f => ({ ...f, excerpt_en: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Content (Markdown)</Label>
                    <Textarea rows={10} value={form.content_en} onChange={e => setForm(f => ({ ...f, content_en: e.target.value }))} />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>اسم الكاتب</Label>
                  <Input value={form.author_name} onChange={e => setForm(f => ({ ...f, author_name: e.target.value }))} />
                </div>
                <div>
                  <Label>وقت القراءة (دقيقة)</Label>
                  <Input type="number" value={form.read_time_minutes ?? 5} onChange={e => setForm(f => ({ ...f, read_time_minutes: parseInt(e.target.value) || 5 }))} />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Switch checked={form.published} onCheckedChange={v => setForm(f => ({ ...f, published: v }))} />
                <Label>نشر فوري</Label>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                <Button onClick={save} disabled={saving} className="gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? "حفظ التغييرات" : "إنشاء"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
