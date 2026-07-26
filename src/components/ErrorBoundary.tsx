import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global error boundary. Catches render-time errors anywhere in the tree
 * and shows a friendly bilingual recovery screen instead of a blank page.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", error, info.componentStack);

    // Auto-reload on deployment chunk hash mismatch
    const isChunkLoadError =
      error?.message?.includes("Failed to fetch dynamically imported module") ||
      error?.message?.includes("Loading chunk") ||
      error?.message?.includes("Importing a module script failed");

    if (isChunkLoadError) {
      const reloaded = sessionStorage.getItem("chunk_auto_reloaded");
      if (!reloaded) {
        sessionStorage.setItem("chunk_auto_reloaded", "true");
        window.location.reload();
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const isRTL =
      typeof document !== "undefined" && document.documentElement.dir === "rtl";

    return (
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="min-h-screen flex items-center justify-center bg-background p-6"
      >
        <div className="max-w-md w-full rounded-2xl border border-border bg-card/80 backdrop-blur p-8 shadow-xl text-center space-y-5">
          <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground">
              {isRTL ? "حدث خطأ غير متوقع" : "Something went wrong"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isRTL
                ? "نعتذر عن هذا الانقطاع. يمكنك إعادة المحاولة أو العودة للصفحة الرئيسية."
                : "Sorry about that. You can retry or go back home."}
            </p>
            {this.state.error?.message && (
              <p className="text-xs text-muted-foreground/70 font-mono break-all bg-muted/50 rounded-md p-2 mt-2">
                {this.state.error.message}
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button onClick={this.handleReload} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              {isRTL ? "إعادة تحميل" : "Reload"}
            </Button>
            <Button onClick={this.handleHome} variant="outline" className="gap-2">
              <Home className="w-4 h-4" />
              {isRTL ? "الرئيسية" : "Home"}
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
