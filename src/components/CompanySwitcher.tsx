import React from "react";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useI18n } from "@/contexts/I18nContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Check,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Plus,
  GitBranch,
} from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  className?: string;
}

export default function CompanySwitcher({ className = "" }: Props) {
  const {
    activeCompany,
    activeCompanyId,
    setActiveCompanyId,
    myCompanies,
    isBranch,
  } = useCompanyContext();
  const { locale } = useI18n();
  const isAr = locale !== "en";

  if (!activeCompany && myCompanies.length === 0) {
    return null;
  }

  // Separate parent companies and branches
  const parentCompanies = myCompanies.filter((c) => !c.parent_company_id);
  const branchCompanies = myCompanies.filter((c) => !!c.parent_company_id);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 gap-2 rounded-xl bg-slate-900/40 dark:bg-slate-900/80 border-slate-700/60 text-slate-100 hover:bg-slate-800 hover:text-white transition-all shadow-xs"
          >
            <div className="w-5 h-5 rounded-md bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col items-start text-right rtl:text-right ltr:text-left max-w-[160px] sm:max-w-[200px]">
              <span className="text-xs font-bold truncate leading-tight">
                {activeCompany?.name || (isAr ? "الشركة النشطة" : "Active Company")}
              </span>
            </div>
            {isBranch ? (
              <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-500/40 text-amber-300 bg-amber-500/10">
                {isAr ? "فرع" : "Branch"}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/40 text-emerald-300 bg-emerald-500/10">
                {isAr ? "رئيسي" : "Main"}
              </Badge>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align={isAr ? "end" : "start"}
          className="w-64 bg-slate-900/95 backdrop-blur-xl border border-slate-700 text-white rounded-xl shadow-2xl p-1.5 z-50"
        >
          <DropdownMenuLabel className="text-[11px] font-bold text-slate-400 px-2 py-1.5 flex items-center justify-between">
            <span>{isAr ? "بيئة العمل / الشركة الحالية" : "Active Workspace"}</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="bg-slate-800" />

          {/* Parent Companies */}
          {parentCompanies.length > 0 && (
            <div className="space-y-0.5 my-1">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {isAr ? "الشركات والمقرات الرئيسية" : "Main Companies"}
              </div>
              {parentCompanies.map((comp) => {
                const isSelected = comp.id === activeCompanyId;
                return (
                  <DropdownMenuItem
                    key={comp.id}
                    onClick={() => setActiveCompanyId(comp.id)}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs transition-colors ${
                      isSelected
                        ? "bg-emerald-600/20 text-emerald-300 font-bold border border-emerald-500/30"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{comp.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </DropdownMenuItem>
                );
              })}
            </div>
          )}

          {/* Sub Branches */}
          {branchCompanies.length > 0 && (
            <div className="space-y-0.5 my-1 pt-1 border-t border-slate-800">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <GitBranch className="w-3 h-3 text-amber-400" />
                <span>{isAr ? "الفروع التابعة" : "Branches"}</span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {branchCompanies.map((b) => {
                  const isSelected = b.id === activeCompanyId;
                  return (
                    <DropdownMenuItem
                      key={b.id}
                      onClick={() => setActiveCompanyId(b.id)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-xs transition-colors ${
                        isSelected
                          ? "bg-amber-600/20 text-amber-300 font-bold border border-amber-500/30"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span className="truncate">{b.name}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </DropdownMenuItem>
                  );
                })}
              </div>
            </div>
          )}

          <DropdownMenuSeparator className="bg-slate-800" />

          <DropdownMenuItem asChild className="p-0">
            <Link
              to="/company"
              className="flex items-center gap-2 px-2.5 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg w-full"
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAr ? "إدارة الشركات والفروع" : "Manage Companies & Branches"}</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
