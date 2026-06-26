import { useEffect, useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useAcceptInvitation, useDeclineInvitation } from "@/hooks/useCompanyInvitations";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const accept = useAcceptInvitation();
  const decline = useDeclineInvitation();
  const [invitation, setInvitation] = useState<any | null>(null);
  const [fetching, setFetching] = useState(true);
  const [done, setDone] = useState<"accepted" | "declined" | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) return;
      const { data } = await supabase
        .from("company_invitations" as any)
        .select("*, company:company_id(name, logo_url)")
        .eq("token", token)
        .maybeSingle();
      if (!cancelled) {
        setInvitation(data);
        setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/auth?redirect=/invitation/${token}`} replace />;
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6" dir="rtl">
        <Card className="p-8 max-w-md w-full text-center">
          <XCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
          <h1 className="font-bold text-lg mb-2">الدعوة غير موجودة</h1>
          <p className="text-sm text-muted-foreground mb-4">قد يكون الرابط غير صحيح أو تمت إزالة الدعوة.</p>
          <Button onClick={() => navigate("/")}>العودة للرئيسية</Button>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6" dir="rtl">
        <Card className="p-8 max-w-md w-full text-center">
          {done === "accepted" ? (
            <>
              <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
              <h1 className="font-bold text-lg mb-2">تم قبول الدعوة ✅</h1>
              <p className="text-sm text-muted-foreground mb-4">أصبحت عضواً في {invitation.company?.name}.</p>
              <Button onClick={() => navigate("/company")}>الذهاب لبوابة الشركة</Button>
            </>
          ) : (
            <>
              <XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h1 className="font-bold text-lg mb-2">تم رفض الدعوة</h1>
              <Button onClick={() => navigate("/")} variant="outline">العودة للرئيسية</Button>
            </>
          )}
        </Card>
      </div>
    );
  }

  const emailMatches = user.email?.toLowerCase() === (invitation.email as string).toLowerCase();
  const expired = new Date(invitation.expires_at) < new Date();
  const notPending = invitation.status !== "pending";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6" dir="rtl">
      <Card className="p-8 max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          {invitation.company?.logo_url ? (
            <img src={invitation.company.logo_url} alt="" className="w-12 h-12 object-contain rounded-xl" />
          ) : (
            <Building2 className="w-8 h-8 text-primary" />
          )}
        </div>
        <div>
          <h1 className="font-bold text-xl">{invitation.company?.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            دعتك للانضمام بدور{" "}
            <span className="font-semibold text-foreground">
              {invitation.member_role === "owner" ? "مالك" : invitation.member_role === "hr" ? "HR" : "مشاهد"}
            </span>
          </p>
        </div>

        {!emailMatches && (
          <div className="text-xs bg-destructive/10 text-destructive p-3 rounded-lg">
            هذه الدعوة مرسلة إلى <strong>{invitation.email}</strong> ولكنك مسجل بـ <strong>{user.email}</strong>.
            سجل دخول بالبريد الصحيح للقبول.
          </div>
        )}
        {expired && (
          <div className="text-xs bg-destructive/10 text-destructive p-3 rounded-lg">انتهت صلاحية هذه الدعوة.</div>
        )}
        {notPending && !expired && (
          <div className="text-xs bg-muted text-muted-foreground p-3 rounded-lg">
            تمت معالجة هذه الدعوة بالفعل ({invitation.status}).
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1"
            disabled={!emailMatches || expired || notPending || accept.isPending}
            onClick={async () => {
              const res = await accept.mutateAsync(token!);
              if (res?.success) setDone("accepted");
            }}
          >
            {accept.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "قبول"}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            disabled={!emailMatches || expired || notPending || decline.isPending}
            onClick={async () => {
              await decline.mutateAsync(token!);
              setDone("declined");
            }}
          >
            رفض
          </Button>
        </div>
      </Card>
    </div>
  );
}
