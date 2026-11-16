import { BarChart3, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  COMPANY_DEFAULT_BRANCHES,
  isConvertedOrdersTab,
  STATUS_BADGE_MAP,
  type ConvertedOrdersTab,
  type OrdersStatsSummary,
} from "./convertedOrdersConstants";

interface OrdersFiltersBarProps {
  activeTab: ConvertedOrdersTab;
  onTabChange: (tab: ConvertedOrdersTab) => void;
  totalOrdersCount: number;
  stats: OrdersStatsSummary;
  selectedBranchFilter: string;
  onBranchFilterChange: (branch: string) => void;
  selectedStatusFilter: string;
  onStatusFilterChange: (status: string) => void;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
}

export default function OrdersFiltersBar({
  activeTab,
  onTabChange,
  totalOrdersCount,
  stats,
  selectedBranchFilter,
  onBranchFilterChange,
  selectedStatusFilter,
  onStatusFilterChange,
  searchTerm,
  onSearchTermChange,
}: OrdersFiltersBarProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          if (isConvertedOrdersTab(v)) onTabChange(v);
        }}
        className="w-full md:w-auto"
      >
        <TabsList className="bg-muted/70 p-1 rounded-xl h-11">
          <TabsTrigger value="all" className="rounded-lg text-xs font-bold px-3">
            جميع الأوامر ({totalOrdersCount})
          </TabsTrigger>
          <TabsTrigger value="direct_hire" className="rounded-lg text-xs font-bold px-3">
            أوامر التعيين ({stats.directHire})
          </TabsTrigger>
          <TabsTrigger value="agency_fulfillment" className="rounded-lg text-xs font-bold px-3">
            أوامر الوكالات ({stats.agencyFulfillment})
          </TabsTrigger>
          <TabsTrigger value="branch_transfer" className="rounded-lg text-xs font-bold px-3">
            تحويل الفروع ({stats.branchTransfer})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-lg text-xs font-bold px-3 gap-1 text-emerald-700">
            <BarChart3 className="w-3.5 h-3.5" />
            تحليلات سد الاحتياج
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab !== "analytics" && (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedBranchFilter} onValueChange={onBranchFilterChange}>
            <SelectTrigger className="w-[180px] h-9 text-xs rounded-xl border-border">
              <SelectValue placeholder="تصفية حسب الفرع" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">كافة الفروع والمجمعات</SelectItem>
              {COMPANY_DEFAULT_BRANCHES.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-[160px] h-9 text-xs rounded-xl border-border">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">كافة الحالات</SelectItem>
              {Object.entries(STATUS_BADGE_MAP).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative w-full sm:w-[220px]">
            <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="بحث برقم الأمر أو الاسم..."
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              className="pr-8 h-9 text-xs rounded-xl bg-background"
            />
          </div>
        </div>
      )}
    </div>
  );
}
