import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Send, X, Copy, Check } from "lucide-react";
import {
  useCompanyInvitations,
  useCreateCompanyInvitation,
  useCancelInvitation,
} from "@/hooks/useCompanyInvitations";
import { toast } from "@/hooks/use-toast";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  accepted: "bg-success/10 text-success border-success/20",
  declined: "bg-destructive/10 text-destructive border-destructive/20",
  expired: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار القبول",
  accepted: "مقبولة",
  declined: "مرفوضة",
  expired: "منتهية",
};

export default function CompanyInvitationsPanel({ companyId }: { companyId: string }) {
  const { data: invitations = [], isLoading } = useCompanyInvitations(companyId);
  const create = useCreateCompanyInvitation();
  const cancel = useCancelInvitation();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"hr" | "viewer" | "owner">("hr");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleInvite = async () => {
    const e = email.trim();
    if (!e || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
      toast({ title: "بريد غير صالح", variant: "destructive" });
      return;
    }
    await create.mutateAsync({ companyId, email: e, role });
    setEmail("");
  };

  const copyLink = async (token: string, id: string) => {
    const url = `${window.location.origin}/invitation/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
    toast({ title: "تم نسخ رابط الدعوة 📋" });
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Mail className="w-5 h-5 text-primary" />
        <h3 className="font-bold">دعوات أعضاء الشركة</h3>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          type="email"
          placeholder="example@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
        />
        <Select value={role} onValueChange={(v) => setRole(v as any)}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="owner">مالك</SelectItem>
            <SelectItem value="hr">HR</SelectItem>
            <SelectItem value="viewer">مشاهد</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleInvite} disabled={create.isPending} className="gap-1.5">
          <Send className="w-4 h-4" />
          إرسال
        </Button>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">جارٍ التحميل...</p>
        ) : invitations.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">لا توجد دعوات بعد</p>
        ) : (
          invitations.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border/50 bg-muted/20"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium truncate">{inv.email}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {inv.member_role === "owner" ? "مالك" : inv.member_role === "hr" ? "HR" : "مشاهد"}
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[inv.status]}`}>
                    {STATUS_LABELS[inv.status]}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  تنتهي: {new Date(inv.expires_at).toLocaleDateString("ar-SA")}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {inv.status === "pending" && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => copyLink(inv.token, inv.id)}
                    >
                      {copiedId === inv.id ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-destructive"
                      onClick={() => cancel.mutate(inv.id)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
