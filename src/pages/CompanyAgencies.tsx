import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Building2, Plus, Users, Mail, Phone, MapPin, ShieldCheck, Key, Copy, Check, Eye, Trash2, Edit3, Loader2, Sparkles, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function CompanyAgencies() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; pass: string; name: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: "",
    contactPerson: "",
    email: "",
    password: "",
    phone: "",
    country: "المملكة العربية السعودية",
    city: "الرياض",
    licenseNumber: "",
    notes: ""
  });

  // Query company ID of current logged in user
  const companyQuery = useQuery({
    queryKey: ["my-company-id", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data?.company_id || null;
    },
    enabled: !!user,
  });

  const companyId = companyQuery.data;

  // Query assigned agencies for current company & direct agencies
  const agenciesQuery = useQuery({
    queryKey: ["company-agencies", companyId, user?.id],
    queryFn: async () => {
      // 1) Fetch from agencies table directly
      const { data: directAgencies, error: directErr } = await supabase
        .from("agencies" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (!directErr && directAgencies && directAgencies.length > 0) {
        return directAgencies as any[];
      }

      // 2) Fallback via agency_assignments
      if (companyId) {
        const { data: assignments } = await supabase
          .from("agency_assignments" as any)
          .select("*, agency:agency_id(*)")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false });
        if (assignments) {
          return assignments.map((row: any) => ({
            assignment_id: row.id,
            status: row.status,
            ...row.agency
          }));
        }
      }

      return [];
    },
    enabled: !!user,
  });

  const agencies = agenciesQuery.data || [];

  // Submit Handler: Add New Agency & Create Login Credentials
  const handleAddAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast({ title: "يرجى تعبئة كافة الحقول الأساسية", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Get or Ensure Company ID
      let targetCompanyId = companyId;
      if (!targetCompanyId && user) {
        const { data: myComp } = await supabase.from("companies").select("id").limit(1).maybeSingle();
        if (myComp) {
          targetCompanyId = myComp.id;
        } else {
          const { data: newComp } = await supabase.from("companies").insert({
            name: "مؤسسة التوظيف الرئيسية",
            contact_email: user.email,
            owner_user_id: user.id
          }).select("id").single();
          targetCompanyId = newComp?.id || null;
        }
      }

      // 2. Insert Agency Record
      const { data: newAgency, error: agencyErr } = await supabase
        .from("agencies" as any)
        .insert({
          name: form.name,
          contact_email: form.email,
          contact_phone: form.phone,
          country: form.country,
          city: form.city,
          license_number: form.licenseNumber,
          notes: form.notes,
          owner_user_id: user?.id || null,
          status: "active"
        } as any)
        .select()
        .single();

      if (agencyErr) throw agencyErr;
      const agencyId = (newAgency as any).id;

      // 3. Link Agency to Company in agency_assignments
      if (targetCompanyId) {
        await supabase
          .from("agency_assignments" as any)
          .insert({
            agency_id: agencyId,
            company_id: targetCompanyId,
            scope: "company",
            status: "active"
          } as any);
      }

      // 4. Create Auth Account using RPC create_agency_account with EXACT typed password
      let rpcSuccess = false;
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc("create_agency_account" as any, {
          p_email: form.email.trim().toLowerCase(),
          p_password: form.password,
          p_name: form.contactPerson || form.name,
          p_phone: form.phone,
          p_agency_id: agencyId,
          p_company_id: targetCompanyId
        });

        if (!rpcErr && rpcRes) {
          rpcSuccess = true;
        }
      } catch (e) {
        console.warn("RPC create_agency_account warning:", e);
      }

      // Fallback via Edge Function with explicit password
      if (!rpcSuccess) {
        try {
          await supabase.functions.invoke("auto-create-candidate-account", {
            body: {
              email: form.email.trim().toLowerCase(),
              password: form.password,
              phone: form.phone || form.password,
              name: form.contactPerson || form.name,
              user_type: "agency"
            }
          });
        } catch (authCatch) {
          console.warn("Fallback auth catch:", authCatch);
        }
      }

      // Set credentials box for popup
      setCreatedCredentials({
        email: form.email.trim().toLowerCase(),
        pass: form.password,
        name: form.name
      });

      qc.invalidateQueries({ queryKey: ["company-agencies"] });
      toast({ title: "تم إضافة مكتب التوظيف وإنشاء حساب الدخول بنجاح! 🎉" });
      setOpenAddDialog(false);
      setForm({
        name: "",
        contactPerson: "",
        email: "",
        password: "",
        phone: "",
        country: "المملكة العربية السعودية",
        city: "الرياض",
        licenseNumber: "",
        notes: ""
      });
    } catch (err: any) {
      toast({ title: "خطأ في إضافة المكتب", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `بيانات دخول مكتب التوظيف (${createdCredentials.name}):\nالبريد الإلكتروني: ${createdCredentials.email}\nكلمة المرور: ${createdCredentials.pass}\nالرابط: ${window.location.origin}/auth?role=agency`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "تم نسخ بيانات الدخول للأن حافظة ✅" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-indigo-500/5 to-purple-500/10 p-6 rounded-3xl border border-primary/20 shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
              <Building2 className="w-3.5 h-3.5" />
              <span>إدارة مكاتب التوظيف والعمل الخارجي والداخلي</span>
            </div>
            <h1 className="text-2xl font-black text-foreground">مكاتب العمل المزودة للشركة</h1>
            <p className="text-sm text-muted-foreground">إدارة وتسجيل مكاتب التوظيف الخارجية وتوفير حسابات دخول مخصصة لها بالنظام لرفع وتزويد المرشحين.</p>
          </div>

          <Button 
            onClick={() => setOpenAddDialog(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl h-11 px-5 font-bold text-sm gap-2 shadow-md shrink-0"
          >
            <Plus className="w-4 h-4" />
            إضافة مكتب عمل / توظيف جديد ➕
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="rounded-2xl border border-border/60">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">إجمالي المكاتب المعينة</p>
                <h3 className="text-2xl font-black text-foreground mt-0.5">{agencies.length}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border/60">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">المكاتب النشطة بالنظام</p>
                <h3 className="text-2xl font-black text-foreground mt-0.5">{agencies.filter(a => a.status === "active").length}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border/60">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">حسابات الدخول المجهزة</p>
                <h3 className="text-2xl font-black text-foreground mt-0.5">{agencies.length}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Offices List */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            قائمة مكاتب التوظيف المعتمدة
          </h2>

          {agencies.length === 0 ? (
            <Card className="p-12 text-center rounded-3xl border border-dashed border-border/60 bg-muted/20">
              <Building2 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-base font-bold text-foreground mb-1">لا يوجد مكاتب توظيف مضافة لشركتك بعد</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">
                قم بإضافة مكاتب التوظيف والعمل الخارجي المزودة لشركتك، وسيتم إنشاء اسم مستخدم وكلمة مرور للمكتب فوراً لدخول النظام ورفع المرشحين.
              </p>
              <Button onClick={() => setOpenAddDialog(true)} className="rounded-xl h-10 px-4 text-xs font-bold gap-2">
                <Plus className="w-4 h-4" />
                إضافة أول مكتب توظيف الآن
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agencies.map((agency, idx) => (
                <motion.div key={agency.id || idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                  <Card className="rounded-2xl border border-border/60 hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/10 to-indigo-500/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                            {agency.name ? agency.name.charAt(0) : "م"}
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-foreground leading-snug">{agency.name}</h3>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-muted-foreground" />
                              {agency.country || "السعودية"} {agency.city ? `- ${agency.city}` : ""}
                            </p>
                          </div>
                        </div>
                        <Badge variant={agency.status === "active" ? "default" : "secondary"} className="text-[10px] rounded-full">
                          {agency.status === "active" ? "نشط" : "معطل"}
                        </Badge>
                      </div>

                      <div className="space-y-1.5 p-3 rounded-xl bg-muted/30 border border-border/40 text-xs font-mono" dir="ltr">
                        <p className="flex items-center gap-2 truncate">
                          <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="font-sans text-[11px] font-bold text-muted-foreground">Email:</span>
                          <span className="truncate">{agency.contact_email || "غير محدد"}</span>
                        </p>
                        {agency.contact_phone && (
                          <p className="flex items-center gap-2 truncate">
                            <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span className="font-sans text-[11px] font-bold text-muted-foreground">Phone:</span>
                            <span>{agency.contact_phone}</span>
                          </p>
                        )}
                      </div>

                      {agency.license_number && (
                        <p className="text-[11px] text-muted-foreground">
                          <strong>رقم الترخيص:</strong> {agency.license_number}
                        </p>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Agency Dialog */}
        <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <DialogHeader className="text-right space-y-1">
              <DialogTitle className="text-lg font-black flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                إضافة مكتب توظيف / عمل جديد
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                أدخل تفاصيل مكتب العمل وسيتم إنشاء حساب دخول مخصص (Email + Password) للمكتب فوراً.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddAgency} className="space-y-4 text-right pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="agencyName" className="text-xs font-bold">اسم مكتب العمل / التوظيف *</Label>
                <Input 
                  id="agencyName" 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                  placeholder="مثال: مكتب الأمانة للتوظيف الدولي" 
                  required 
                  className="rounded-xl h-10 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="contactPerson" className="text-xs font-bold">اسم المسؤول / جهة الاتصال</Label>
                  <Input 
                    id="contactPerson" 
                    value={form.contactPerson} 
                    onChange={e => setForm({...form, contactPerson: e.target.value})} 
                    placeholder="أ/ محمود السيد" 
                    className="rounded-xl h-10 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-bold">رقم الجوال / الواتساب</Label>
                  <Input 
                    id="phone" 
                    value={form.phone} 
                    onChange={e => setForm({...form, phone: e.target.value})} 
                    placeholder="966XXXXXXXXX+" 
                    className="rounded-xl h-10 text-xs"
                  />
                </div>
              </div>

              {/* Login Credentials Setup */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-primary/5 via-indigo-500/5 to-purple-500/5 border border-primary/20 space-y-3">
                <div className="flex items-center gap-1.5 text-primary font-black text-xs">
                  <Key className="w-4 h-4" />
                  <span>تجهيز حساب دخول المكتب بالنظام (Login Credentials)</span>
                </div>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label htmlFor="agencyEmail" className="text-xs font-bold">البريد الإلكتروني للدخول (Email) *</Label>
                    <Input 
                      id="agencyEmail" 
                      type="email"
                      value={form.email} 
                      onChange={e => setForm({...form, email: e.target.value})} 
                      placeholder="office@agency.com" 
                      required 
                      className="rounded-xl h-9 text-xs dir-ltr font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="agencyPassword" className="text-xs font-bold">كلمة المرور (Password) *</Label>
                    <Input 
                      id="agencyPassword" 
                      type="text"
                      value={form.password} 
                      onChange={e => setForm({...form, password: e.target.value})} 
                      placeholder="أدخل كلمة مرور قوية للمكتب" 
                      required 
                      className="rounded-xl h-9 text-xs dir-ltr font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="country" className="text-xs font-bold">الدولة</Label>
                  <Input 
                    id="country" 
                    value={form.country} 
                    onChange={e => setForm({...form, country: e.target.value})} 
                    placeholder="مصر / السعودية / الهند..." 
                    className="rounded-xl h-10 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="license" className="text-xs font-bold">رقم الترخيص / السجل</Label>
                  <Input 
                    id="license" 
                    value={form.licenseNumber} 
                    onChange={e => setForm({...form, licenseNumber: e.target.value})} 
                    placeholder="مثال: LIC-99821" 
                    className="rounded-xl h-10 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-xs font-bold">ملاحظات وشروط التعامل</Label>
                <Textarea 
                  id="notes" 
                  value={form.notes} 
                  onChange={e => setForm({...form, notes: e.target.value})} 
                  placeholder="ملاحظات حول التخصصات أو الضمانات المزودة..." 
                  className="rounded-xl h-20 text-xs"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpenAddDialog(false)} className="rounded-xl h-10 text-xs font-bold">
                  إلغاء
                </Button>
                <Button type="submit" disabled={isSubmitting} className="rounded-xl h-10 text-xs font-bold gap-2 bg-primary">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  {isSubmitting ? "جاري الإنشاء..." : "حفظ وإنشاء الحساب للمكتب 🚀"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Success Credentials Popup Modal */}
        {createdCredentials && (
          <Dialog open={!!createdCredentials} onOpenChange={() => setCreatedCredentials(null)}>
            <DialogContent className="sm:max-w-md rounded-3xl p-6 text-right space-y-4">
              <DialogHeader className="text-right space-y-1">
                <DialogTitle className="text-lg font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                  تم تجهيز حساب دخول مكتب العمل بنجاح! 🎉
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  يمكن لمسؤول مكتب <strong>{createdCredentials.name}</strong> تسجيل الدخول فوراً باستخدام البيانات التالية:
                </DialogDescription>
              </DialogHeader>

              <div className="p-4 rounded-2xl bg-card border-2 border-emerald-500/30 space-y-2 font-mono text-xs shadow-sm" dir="ltr">
                <p><strong className="font-sans text-foreground">Email:</strong> {createdCredentials.email}</p>
                <p><strong className="font-sans text-foreground">Password:</strong> {createdCredentials.pass}</p>
                <p className="text-[11px] text-muted-foreground font-sans pt-1">
                  <strong>Login Link:</strong> {window.location.origin}/auth?role=agency
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleCopyCredentials} className="w-full rounded-xl h-10 text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "تم النسخ بنجاح!" : "نسخ بيانات الدخول للمكتب 📋"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

      </div>
    </DashboardLayout>
  );
}
