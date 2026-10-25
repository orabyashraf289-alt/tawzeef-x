import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { accountHome, checkCompanyStatus } from "@/lib/accountAccess";

export default function CompanyRegistration() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const client = useQueryClient();
  const request = useQuery({
    queryKey: ["company-registration", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_company_registration" as any);
      if (error) throw error;
      return data as { company_name: string; status: string; review_note?: string } | null;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
  const refresh = async () => {
    await request.refetch();
    await client.invalidateQueries({ queryKey: ["account-access", user?.id] });
    const access = await checkCompanyStatus(user);
    if (access.allowed && !access.registrationRequired) {
      await client.invalidateQueries({ queryKey: ["my-companies", user?.id] });
      navigate(accountHome(access), { replace: true });
    }
  };
  const rejected = request.data?.status === "rejected";
  return <main className="min-h-screen grid place-items-center bg-muted/30 p-5" dir="rtl">
    <Card className="w-full max-w-lg">
      <CardHeader className="space-y-4">
        <ShieldCheck className="h-10 w-10 text-primary" />
        <p className="text-sm text-muted-foreground">توظيف إكس · طلب إنشاء شركة</p>
        <CardTitle>{request.isError ? "تعذر تحميل حالة الطلب" : rejected ? "لم تتم الموافقة على طلب الشركة" : "طلب شركتك قيد المراجعة"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {request.data && <p className="font-bold">{request.data.company_name}</p>}
        <p role="status" className="text-sm leading-7 text-muted-foreground">
          {request.isError ? "حاول تحديث الحالة مرة أخرى." : rejected
            ? "راجعت إدارة توظيف إكس الطلب ورفضته. يمكنك التواصل مع الإدارة للاستفسار عن القرار."
            : "تم إرسال طلبك إلى مسؤول توظيف إكس. يمكنك استخدام شاشات الشركة بعد الموافقة على الطلب."}
        </p>
        {rejected && request.data?.review_note && <p className="rounded-lg bg-muted p-4 text-sm">سبب الرفض: {request.data.review_note}</p>}
        <div className="flex flex-wrap gap-3">
          <Button onClick={refresh} disabled={request.isFetching}><Clock className="h-4 w-4 ml-2" />تحديث حالة الطلب</Button>
          <Button variant="outline" onClick={signOut}>تسجيل الخروج</Button>
        </div>
      </CardContent>
    </Card>
  </main>;
}
