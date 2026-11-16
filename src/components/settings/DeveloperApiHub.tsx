import { useState, useEffect } from "react";
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
  BookOpen,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  generateApiKey,
  generateTypeScriptSnippet,
  generateCurlSnippet,
  generatePythonSnippet,
  API_SCOPE_DESCRIPTIONS,
  type ApiKeyRecord,
  type ApiKeyScope,
} from "@/lib/developerApiEngine";

const STORAGE_KEYS_KEY = "tx_dev_api_keys_v1";

export default function DeveloperApiHub() {
  const [activeTab, setActiveTab] = useState("keys");
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
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
  const [explorerLoading, setExplorerLoading] = useState(false);
  const [explorerResponse, setExplorerResponse] = useState<any>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS_KEY);
      if (raw) {
        setKeys(JSON.parse(raw));
      } else {
        // Initial sample key
        const initial = generateApiKey("مفتاح المنصة الافتراضي (Production)", [
          "jobs:read",
          "candidates:read",
        ]);
        setKeys([initial.keyRecord]);
        localStorage.setItem(STORAGE_KEYS_KEY, JSON.stringify([initial.keyRecord]));
      }
    } catch {
      // fallback
    }
  }, []);

  const saveKeys = (updated: ApiKeyRecord[]) => {
    setKeys(updated);
    try {
      localStorage.setItem(STORAGE_KEYS_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateKey = () => {
    if (!newKeyName.trim()) {
      toast({ title: "يرجى كتابة اسم تعريفي للمفتاح", variant: "destructive" });
      return;
    }

    const { rawKey, keyRecord } = generateApiKey(newKeyName.trim(), selectedScopes);
    const updated = [keyRecord, ...keys];
    saveKeys(updated);

    setRevealedKey(rawKey);
    setCreateDialogOpen(false);
    setNewKeyName("");
    toast({ title: "تم إنشاء مفتاح API بنجاح ✅" });
  };

  const handleRevokeKey = (id: string) => {
    if (!window.confirm("هل أنت متأكد من تعطيل هذا المفتاح؟ ستتوقف أي خدمات خارجية تستخدمه فوراً.")) return;
    const updated = keys.map((k) => (k.id === id ? { ...k, status: "revoked" as const } : k));
    saveKeys(updated);
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
    await new Promise((r) => setTimeout(r, 450));
    setExplorerLoading(false);

    if (explorerEndpoint === "/jobs") {
      setExplorerResponse({
        status: "success",
        total: 3,
        data: [
          { id: "job_01", title: "مهندس برمجيات أول", department: "الهندسة", status: "open", location: "الرياض" },
          { id: "job_02", title: "مصمم واجهات منتجات", department: "التصميم", status: "open", location: "جدة" },
          { id: "job_03", title: "محلل بيانات ذكي", department: "البيانات", status: "open", location: "عن بُعد" },
        ],
      });
    } else {
      setExplorerResponse({
        status: "success",
        message: "Candidate registered successfully",
        candidateId: "cand_98765",
        trackingCode: "TX-API-7890",
        stage: "تقديم الطلب",
      });
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
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 text-xs font-bold mb-1.5">
            <Code2 className="w-3.5 h-3.5" />
            <span>بوابة المطورين والـ API العامة (p5-api & p5-sdk)</span>
          </div>
          <h2 className="text-lg font-black text-foreground">
            واجهة برمجة التطبيقات العامة ومكتبات الـ SDK
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            ربط المنصة برمجياً مع أنظمتكم الخارجية، استيراد الشواغر، وتسجيل المرشحين عبر REST API معتمد بـ OpenAPI 3.1
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
              {keys.length === 0 ? (
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
              <div className="flex items-center gap-2 bg-muted/40 p-2.5 rounded-xl border border-border/70">
                <Badge variant="default" className="bg-purple-600 font-mono text-xs px-2.5 py-1">
                  {explorerMethod}
                </Badge>
                <select
                  value={explorerEndpoint}
                  onChange={(e) => {
                    setExplorerEndpoint(e.target.value);
                    setExplorerMethod(e.target.value === "/jobs" ? "GET" : "POST");
                  }}
                  className="bg-transparent text-xs font-mono font-bold text-foreground focus:outline-none flex-1"
                  dir="ltr"
                >
                  <option value="/jobs">https://api.tawzeefx.com/v1/jobs</option>
                  <option value="/candidates">https://api.tawzeefx.com/v1/candidates</option>
                </select>
                <Button
                  size="sm"
                  onClick={handleRunExplorer}
                  disabled={explorerLoading}
                  className="gap-1.5 text-xs h-8 font-bold"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{explorerLoading ? "جاري الإرسال..." : "إرسال الطلب (Send)"}</span>
                </Button>
              </div>

              {explorerResponse && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" /> 200 OK — استجابة معتمدة:
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
                    onClick={() => handleCopySnippet(generateTypeScriptSnippet())}
                    className="text-xs h-7 gap-1"
                  >
                    {copiedSnippet ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>نسخ الكود</span>
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <pre className="p-4 text-[11px] font-mono overflow-x-auto text-foreground" dir="ltr">
                    {generateTypeScriptSnippet()}
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
                    onClick={() => handleCopySnippet(generateCurlSnippet())}
                    className="text-xs h-7 gap-1"
                  >
                    {copiedSnippet ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>نسخ الكود</span>
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <pre className="p-4 text-[11px] font-mono overflow-x-auto text-foreground" dir="ltr">
                    {generateCurlSnippet()}
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
                    onClick={() => handleCopySnippet(generatePythonSnippet())}
                    className="text-xs h-7 gap-1"
                  >
                    {copiedSnippet ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>نسخ الكود</span>
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <pre className="p-4 text-[11px] font-mono overflow-x-auto text-foreground" dir="ltr">
                    {generatePythonSnippet()}
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

            <Button onClick={handleCreateKey} className="w-full text-xs font-bold h-9">
              توليد المفتاح الآن
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