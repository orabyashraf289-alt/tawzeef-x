import { useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Building2, Search, Trash2, ExternalLink, Power, Users as UsersIcon, X } from "lucide-react";
import {
  useAllCompanies,
  useCreateCompany,
  useDeleteCompany,
  useToggleCompanyStatus,
  useCompanyMembers,
  useAddCompanyMember,
  useRemoveCompanyMember,
} from "@/hooks/useCompanies";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";

export default function AdminCompanies() {
  const { data: companies = [], isLoading } = useAllCompanies();
  const createCompany = useCreateCompany();
  const deleteCompany = useDeleteCompany();
  const toggleStatus = useToggleCompanyStatus();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [industry, setIndustry] = useState("");
  const [membersFor, setMembersFor] = useState<{ id: string; name: string } | null>(null);

  const parentCompanies = companies.filter((c) => !c.parent_company_id);
  const branchesCount = companies.filter((c) => c.parent_company_id).length;

  const filtered = parentCompanies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.contact_email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black">إدارة الشركات</h1>
            <p className="text-sm text-muted-foreground mt-1">
              جميع الشركات العميلة في المنصة ({parentCompanies.length} شركات رئيسية، {branchesCount} فروع)
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" />شركة جديدة</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>إضافة شركة جديدة</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <Input placeholder="اسم الشركة *" value={name} onChange={(e) => setName(e.target.value)} />
                <Input placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input placeholder="رقم الهاتف" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <Input placeholder="القطاع" value={industry} onChange={(e) => setIndustry(e.target.value)} />
              </div>
              <DialogFooter>
                <Button
                  onClick={async () => {
                    if (!name.trim()) return;
                    await createCompany.mutateAsync({
                      name,
                      contact_email: email || null,
                      contact_phone: phone || null,
                      industry: industry || null,
                    });
                    setName(""); setEmail(""); setPhone(""); setIndustry("");
                    setOpen(false);
                  }}
                  disabled={!name || createCompany.isPending}
                >
                  إنشاء
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ابحث باسم أو بريد الشركة..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">جارٍ التحميل...</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c, i) => {
            const branches = companies.filter((b) => b.parent_company_id === c.id);
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="p-5 hover:shadow-md transition-shadow flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        {c.logo_url ? (
                          <img src={c.logo_url} alt={c.name} className="w-full h-full object-contain rounded-xl" />
                        ) : (
                          <Building2 className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <Badge variant={c.status === "active" ? "default" : "secondary"} className="text-[10px]">
                        {c.status === "active" ? "نشطة" : "معطلة"}
                      </Badge>
                    </div>
                    <h3 className="font-bold text-base mb-1 truncate">{c.name}</h3>
                    <p className="text-xs text-muted-foreground truncate mb-3">{c.contact_email || "—"}</p>
                    <p className="text-xs text-muted-foreground mb-4">{c.industry || "بدون قطاع"}</p>

                    {/* Nested Branches List */}
                    {branches.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/40 text-right mb-4">
                        <h4 className="text-[11px] font-bold text-foreground mb-1.5 flex items-center gap-1.5 justify-start">
                          <Building2 className="w-3.5 h-3.5 text-primary" />
                          <span>الفروع التابعة ({branches.length}):</span>
                        </h4>
                        <div className="space-y-1.5 max-h-28 overflow-y-auto pl-1">
                          {branches.map((br) => (
                            <div key={br.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-xl text-[11px] border border-border/20">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Badge variant={br.status === "active" ? "default" : "secondary"} className="text-[8px] py-0 px-1 shrink-0">
                                  {br.status === "active" ? "نشط" : "معطل"}
                                </Badge>
                                <span className="font-medium truncate max-w-[130px]">{br.name}</span>
                              </div>
                              <Link to={`/admin/companies/${br.id}`} title="فتح صفحة الفرع">
                                <Button variant="ghost" size="icon" className="w-6 h-6 rounded-lg hover:bg-background">
                                  <ExternalLink className="w-3 h-3 text-primary" />
                                </Button>
                              </Link>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-2">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <Link to={`/admin/companies/${c.id}`}>
                        <Button variant="outline" size="sm" className="w-full gap-1.5">
                          <ExternalLink className="w-3.5 h-3.5" />فتح
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setMembersFor({ id: c.id, name: c.name })}>
                        <UsersIcon className="w-3.5 h-3.5" />الأعضاء
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className={c.status === "active" ? "text-amber-600" : "text-emerald-600"}
                        onClick={() => toggleStatus.mutate({ id: c.id, status: c.status === "active" ? "inactive" : "active" })}
                      >
                        <Power className="w-3.5 h-3.5 ml-1.5" />
                        {c.status === "active" ? "تعطيل" : "تفعيل"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm(`حذف الشركة "${c.name}"؟ سيؤدي إلى حذف كل بياناتها وفروعها المرتبطة.`)) {
                            deleteCompany.mutate(c.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5 ml-1.5" />حذف
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {!isLoading && filtered.length === 0 && (
          <Card className="p-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">لا توجد شركات بعد</p>
          </Card>
        )}

        {membersFor && (
          <ManageMembersDialog
            companyId={membersFor.id}
            companyName={membersFor.name}
            onClose={() => setMembersFor(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

function ManageMembersDialog({ companyId, companyName, onClose }: { companyId: string; companyName: string; onClose: () => void }) {
  const { data: members = [] } = useCompanyMembers(companyId);
  const addMember = useAddCompanyMember();
  const removeMember = useRemoveCompanyMember();
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<"owner" | "hr" | "viewer">("hr");

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>أعضاء — {companyName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">إضافة عضو (User ID من Auth)</label>
            <div className="flex gap-2">
              <Input placeholder="UUID للمستخدم" value={userId} onChange={(e) => setUserId(e.target.value)} />
              <Select value={role} onValueChange={(v) => setRole(v as any)}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">مالك</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="viewer">مشاهد</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={async () => {
                  const trimmedId = userId.trim();
                  if (!trimmedId) return;
                  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedId);
                  if (!isUuid) {
                    toast({
                      title: "معرف غير صالح ⚠️",
                      description: "يرجى كتابة معرف مستخدم صحيح (UUID) مكون من أرقام وحروف بالصيغة القياسية (مثال: 123e4567-e89b-12d3-a456-426614174000)",
                      variant: "destructive"
                    });
                    return;
                  }
                  await addMember.mutateAsync({ companyId, userId: trimmedId, role });
                  setUserId("");
                }}
                disabled={!userId || addMember.isPending}
              >
                إضافة
              </Button>
            </div>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {members.length === 0 && <p className="text-xs text-muted-foreground py-3 text-center">لا يوجد أعضاء</p>}
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="text-[10px]">
                    {m.member_role === "owner" ? "مالك" : m.member_role === "hr" ? "HR" : "مشاهد"}
                  </Badge>
                  <span className="text-xs font-mono truncate">{m.user_id}</span>
                </div>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => removeMember.mutate(m.id)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
