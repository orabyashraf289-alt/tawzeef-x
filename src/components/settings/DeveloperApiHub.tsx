import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Code2,
  Key,
  Copy,
  Check,
  Plus,
  Trash2,
  Play,
  Terminal,
  ShieldCheck,
  AlertTriangle,
  Database,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import {
  generateTypeScriptSnippet,
  generateCurlSnippet,
  generatePythonSnippet,
  getLivePublicApiBaseUrl,
  API_SCOPE_DESCRIPTIONS,
  type ApiKeyRecord,
  type ApiKeyScope,
} from "@/lib/developerApiEngine";
import {
  createCompanyApiKey,
  fetchCompanyApiKeys,
  revokeCompanyApiKey,
  type SyncSource,
} from "@/lib/enterpriseConfigSync";

export default function DeveloperApiHub() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const liveEndpoint = useMemo(() => getLivePublicApiBaseUrl(), []);

  const [activeTab, setActiveTab] = useState("keys");
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [syncSource, setSyncSource] = useState<SyncSource>("local");
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [creatingKey, setCreatingKey] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<ApiKeyScope[]>([
    "jobs:read",
    "candidates:read",
  ]);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Explorer playground state
  const [explorerMethod, setExplorerMethod] = useState<"GET" | "POST">("GET");
  const [explorerEndpoint, setExplorerEndpoint] = useState("/jobs");
  const [explorerApiKey, setExplorerApiKey] = useState("");
  const [explorerLoading, setExplorerLoading] = useState(false);
  const [explorerStatus, setExplorerStatus] = useState<number | null>(null);
  const [explorerResponse, setExplorerResponse] = useState<unknown>(null);

  useEffect(() => {
    let active = true;
    setLoadingKeys(true);
    void fetchCompanyApiKeys(activeCompanyId).then(({ keys: loaded, source }) => {
      if (!active) return;
      setKeys(loaded);
      setSyncSource(source);
      setLoadingKeys(false);
    });
    return () => {
      active = false;
    };
  }, [activeCompanyId]);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast({ title: "يرجى كتابة اسم تعريفي للمفتاح", variant: "destructive" });
      return;
    }
    if (selectedScopes.length === 0) {
      toast({ title: "يرجى اختيار صلاحية واحدة على الأقل", variant: "destructive" });
      return;
    }

    setCreatingKey(true);
    try {
      const { rawKey, keyRecord, source } = await createCompanyApiKey({
        companyId: activeCompanyId,
        userId: user?.id,
        name: newKeyName.trim(),
        scopes: selectedScopes,
      });

      setKeys((prev) => [keyRecord, ...prev.filter((k) => k.id !== keyRecord.id)]);
      setSyncSource(source);
      setRevealedKey(rawKey);
      setExplorerApiKey(rawKey);
      setCreateDialogOpen(false);
      setNewKeyName("");
      toast({
        title: "تم إنشاء مفتاح API بنجاح ✅",
        description:
          source === "supabase"
            ? "تم حفظ بصمة المفتاح (SHA-256) في قاعدة بيانات الشركة بأمان."
            : "تم حفظ المفتاح محلياً لحين تطبيق ترحيل قاعدة البيانات.",
      });
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من تعطيل هذا المفتاح؟ ستتوقف أي خدمات خارجية تستخدمه فوراً.")) return;
    const { source } = await revokeCompanyApiKey(activeCompanyId, id);
    setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, status: "revoked" as const } : k)));
    setSyncSource(source);
    toast({ title: "تم إلغاء تفعيل المفتاح" });
  };

  const handleCopyRevealedKey = () => {
    if (!revealedKey) return;
    navigator.clipboard.writeText(revealedKey);
    setCopiedKey(true);
    toast({ title: "تم نسخ المفتاح إلى الحافظة ✅" });
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopySnippet = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    toast({ title: "تم نسخ كود الـ SDK ✅" });
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleRunExplorer = async () => {
    setExplorerLoading(true);
    setExplorerStatus(null);
    try {
      const token = explorerApiKey.trim();
      if (token.startsWith("tx_live_")) {
        const resp = await fetch(`${liveEndpoint}${explorerEndpoint}`, {
          method: explorerMethod,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            ...(explorerMethod === "POST" ? { "Content-Type": "application/json" } : {}),
          },
          ...(explorerMethod === "POST"
            ? {
                body: JSON.stringify({
                  name: "مرشح تجريبي API",
                  email: `api-test-${Date.now()}@example.com`,
                  phone: "+966500000000",
                }),
              }
            : {}),
        });
        setExplorerStatus(resp.status);
        const body = await resp.json().catch(() => ({ status: resp.statusText }));
        setExplorerResponse(body);
        return;
      }

      // Live authenticated tenant preview (read-only) when no Bearer key is pasted
      if (explorerEndpoint === "/jobs" && activeCompanyId) {
        const { data, error } = await supabase
          .from("jobs")
          .select("id, title, department, location, status, created_at")
          .eq("company_id", activeCompanyId)
          .order("created_at", { ascending: false })
          .limit(5);
        setExplorerStatus(error ? 400 : 200);
        setExplorerResponse(
          error
            ? { error: error.message }
            : {
                status: "success",
                mode: "live_tenant_preview",
                endpoint: `${liveEndpoint}/jobs`,
                total: data?.length ?? 0,
                data: data ?? [],
              },
        );
      } else if (explorerEndpoint === "/candidates" && explorerMethod === "GET" && activeCompanyId) {
        const { data, error } = await supabase
          .from("candidates")
          .select("id, name, role, stage, status, tracking_code, created_at")
          .eq("company_id", activeCompanyId)
          .order("created_at", { ascending: false })
          .limit(5);
        setExplorerStatus(error ? 400 : 200);
        setExplorerResponse(
          error
            ? { error: error.message }
            : {
                status: "success",
                mode: "live_tenant_preview",
                endpoint: `${liveEndpoint}/candidates`,
                total: data?.length ?? 0,
                data: data ?? [],
              },
        );
      } else {
        setExplorerStatus(401);
        setExplorerResponse({
          error: "api_key_required",
          message:
            "لإرسال طلبات الكتابة (POST) عبر نقطة public-api-v1 الحية، الصق مفتاح tx_live_... في حقل الترويسة أعلاه.",
          endpoint: `${liveEndpoint}${explorerEndpoint}`,
        });
      }
    } catch (err: unknown) {
      setExplorerStatus(500);
      setExplorerResponse({
        error: "network_error",
        message: err instanceof Error ? err.message : "Failed to reach public-api-v1",
      });
    } finally {
      setExplorerLoading(false);
    }
  };

  const toggleScope = (scope: ApiKeyScope) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-muted/40 rounded-2xl border border-border/70">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 text-xs font-bold">
              <Code2 className="w-3.5 h-3.5" />
              <span>بوابة المطورين والـ API العامة (p5-api & p5-sdk)</span>
            </div>
            <Badge
              variant="outline"
              className={
                syncSource === "supabase"
                  ? "text-[10px] gap-1 bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                  : "text-[10px] gap-1 text-muted-foreground"
              }
            >
              <Database className="w-3 h-3" />
              {syncSource === "supabase" ? "مزامنة Supabase مفعّلة" : "تخزين محلي مؤقت"}
            </Badge>
          </div>
          <h2 className="text-lg font-black text-foreground">
            واجهة برمجة التطبيقات العامة ومكتبات الـ SDK
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            نقطة الوصول الحية: <code className="font-mono text-[11px] text-primary" dir="ltr">{liveEndpoint}</code>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            className="gap-1.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 h-9"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء مفتاح API جديد</span>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-xl">
          <TabsTrigger value="keys" className="text-xs font-bold">
            مفاتيح الـ API ({keys.filter((k) => k.status === "active").length})
          </TabsTrigger>
          <TabsTrigger value="explorer" className="text-xs font-bold">
            مستكشف الـ API التفاعلي
          </TabsTrigger>
          <TabsTrigger value="sdk" className="text-xs font-bold">
            أمثلة الكود والـ SDK
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: API Keys List */}
        <TabsContent value="keys" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">مفاتيح الوصول المصرحة (Active API Keys)</CardTitle>
              <CardDescription className="text-xs">
                استخدم هذه المفاتيح في ترويسة الطلب Authorization: Bearer tx_live_... للوصول الآمن للواجهات البرمجية.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingKeys ? (
                <div className="p-8 text-center text-xs text-muted-foreground">جاري تحميل مفاتيح الشركة...</div>
              ) : keys.length === 0 ? (
                <div className="p-8 text-center bg-muted/30 rounded-xl border border-dashed border-border/80">
                  <Key className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <div className="text-xs font-bold text-foreground">لم يتم إنشاء مفاتيح API حتى الآن</div>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {keys.map((k) => (
                    <div key={k.id} className="py-3.5 flex items-center justify-between gap-4 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{k.name}</span>
                          <Badge
                            variant="outline"
                            className={
                              k.status === "active"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                : "bg-muted text-muted-foreground"
                            }
                          >
                            {k.status === "active" ? "مفعل" : "معطل"}
                          </Badge>
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-3">
                          <span>المعرف: {k.prefix}</span>
                          <span>أنشئ في: {new Date(k.createdAt).toLocaleDateString("ar-SA")}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {k.scopes.map((s) => (
                            <Badge key={s} variant="secondary" className="text-[10px]">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        {k.status === "active" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRevokeKey(k.id)}
                            className="text-xs text-destructive hover:bg-destructive/10 h-8"
                          >
                            <Trash2 className="w-3.5 h-3.5 ml-1" />
                            تعطيل المفتاح
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Interactive API Explorer */}
        <TabsContent value="explorer" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Terminal className="w-5 h-5 text-purple-600" />
                <span>مستكشف واجهة البرمجة التفاعلي (REST API Playground)</span>
              </CardTitle>
              <CardDescription className="text-xs">
                اختبر استدعاء مسارات TawzeefX Public API مباشرة واطلع على بنية الاستجابة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">
                  مفتاح Bearer اختياري (لتنفيذ الطلب عبر Edge Function الحي)
                </label>
                <Input
                  value={explorerApiKey}
                  onChange={(e) => setExplorerApiKey(e.target.value)}
                  placeholder="tx_live_... (اتركه فارغاً لمعاينة بيانات شركتك الحية للقراءة فقط)"
                  className="text-xs font-mono h-9"
                  dir="ltr"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 bg-muted/40 p-2.5 rounded-xl border border-border/70">
                <select
                  value={explorerMethod}
                  onChange={(e) => setExplorerMethod(e.target.value as "GET" | "POST")}
                  className="bg-purple-600 text-white rounded-md font-mono text-xs px-2.5 py-1.5 font-bold"
                  dir="ltr"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
                <select
                  value={explorerEndpoint}
                  onChange={(e) => setExplorerEndpoint(e.target.value)}
                  className="bg-transparent text-xs font-mono font-bold text-foreground focus:outline-none flex-1 min-w-[200px]"
                  dir="ltr"
                >
                  <option value="/jobs">{liveEndpoint}/jobs</option>
                  <option value="/candidates">{liveEndpoint}/candidates</option>
                  <option value="/health">{liveEndpoint}/health</option>
                </select>
                <Button
                  size="sm"
                  onClick={() => void handleRunExplorer()}
                  disabled={explorerLoading}
                  className="gap-1.5 text-xs h-8 font-bold"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{explorerLoading ? "جاري الإرسال..." : "إرسال الطلب (Send)"}</span>
                </Button>
              </div>

              {explorerResponse !== null && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" /> HTTP {explorerStatus ?? 200} — استجابة حية:
                    </span>
                    <span className="text-muted-foreground font-mono">Content-Type: application/json</span>
                  </div>
                  <pre
                    className="bg-muted/70 p-3.5 rounded-xl text-[11px] font-mono overflow-x-auto max-h-60 text-foreground border border-border/60"
                    dir="ltr"
                  >
                    {JSON.stringify(explorerResponse, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: SDK Code Snippets */}
        <TabsContent value="sdk" className="space-y-4">
          <Tabs defaultValue="ts" className="space-y-3">
            <div className="flex items-center justify-between">
              <TabsList className="grid grid-cols-3 w-72">
                <TabsTrigger value="ts" className="text-xs font-bold">TypeScript SDK</TabsTrigger>
                <TabsTrigger value="curl" className="text-xs font-bold">cURL</TabsTrigger>
                <TabsTrigger value="python" className="text-xs font-bold">Python</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="ts">
              <Card>
                <CardHeader className="py-3 px-4 flex flex-row items-center justify-between bg-muted/40 border-b">
                  <span className="text-xs font-bold">مثال تثبيت واستدعاء `@tawzeefx/sdk`</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopySnippet(generateTypeScriptSnippet("YOUR_API_KEY", liveEndpoint))}
                    className="text-xs h-7 gap-1"
                  >
                    {copiedSnippet ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>نسخ الكود</span>
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <pre className="p-4 text-[11px] font-mono overflow-x-auto text-foreground" dir="ltr">
                    {generateTypeScriptSnippet("YOUR_API_KEY", liveEndpoint)}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="curl">
              <Card>
                <CardHeader className="py-3 px-4 flex flex-row items-center justify-between bg-muted/40 border-b">
                  <span className="text-xs font-bold">أوامر cURL للتشغيل عبر الطرفية</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopySnippet(generateCurlSnippet("YOUR_API_KEY", liveEndpoint))}
                    className="text-xs h-7 gap-1"
                  >
                    {copiedSnippet ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>نسخ الكود</span>
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <pre className="p-4 text-[11px] font-mono overflow-x-auto text-foreground" dir="ltr">
                    {generateCurlSnippet("YOUR_API_KEY", liveEndpoint)}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="python">
              <Card>
                <CardHeader className="py-3 px-4 flex flex-row items-center justify-between bg-muted/40 border-b">
                  <span className="text-xs font-bold">سكريبت Python باستخدام مكتبة requests</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopySnippet(generatePythonSnippet("YOUR_API_KEY", liveEndpoint))}
                    className="text-xs h-7 gap-1"
                  >
                    {copiedSnippet ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>نسخ الكود</span>
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <pre className="p-4 text-[11px] font-mono overflow-x-auto text-foreground" dir="ltr">
                    {generatePythonSnippet("YOUR_API_KEY", liveEndpoint)}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Create Key Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">إنشاء مفتاح API جديد</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              حدد اسماً تعريفياً والصلاحيات المسموحة لهذا المفتاح
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">اسم المفتاح</label>
              <Input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="مثال: موقع التوظيف الخارجي أو تطبيق الجوال"
                className="text-xs h-9"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-2">الصلاحيات المصرحة (Scopes)</label>
              <div className="space-y-2">
                {(Object.keys(API_SCOPE_DESCRIPTIONS) as ApiKeyScope[]).map((scope) => (
                  <label
                    key={scope}
                    className="flex items-center gap-2 p-2 rounded-lg border border-border/60 hover:bg-muted/40 cursor-pointer text-xs"
                  >
                    <Checkbox
                      checked={selectedScopes.includes(scope)}
                      onCheckedChange={() => toggleScope(scope)}
                    />
                    <div>
                      <div className="font-bold text-foreground font-mono">{scope}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {API_SCOPE_DESCRIPTIONS[scope].ar}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <Button onClick={() => void handleCreateKey()} disabled={creatingKey} className="w-full text-xs font-bold h-9">
              {creatingKey ? "جاري التوليد والحفظ..." : "توليد المفتاح الآن"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* One-time Key Reveal Modal */}
      <Dialog open={!!revealedKey} onOpenChange={() => setRevealedKey(null)}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              <DialogTitle className="text-lg font-black">احفظ مفتاح الـ API الآن!</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              لن نتمكن من إظهار هذا المفتاح السري مرة أخرى لدواعي الأمان. انسخه وخزنه في مكان آمن.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 p-2.5 bg-muted rounded-xl border border-border/80">
              <input
                type="text"
                readOnly
                value={revealedKey || ""}
                className="flex-1 bg-transparent text-xs font-mono font-bold text-foreground focus:outline-none"
                dir="ltr"
              />
              <Button size="sm" onClick={handleCopyRevealedKey} className="gap-1.5 text-xs h-8">
                {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey ? "تم النسخ" : "نسخ المفتاح"}</span>
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => setRevealedKey(null)}
              className="w-full text-xs font-bold h-9 mt-2"
            >
              تم حفظ المفتاح بأمان وإغلاق النافذة
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}