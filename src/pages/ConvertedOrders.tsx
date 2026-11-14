import DashboardLayout from "@/components/DashboardLayout";
import { PrintableEmploymentOrder } from "@/components/PrintableEmploymentOrder";
import AgencyOrderDialog from "@/components/converted-orders/AgencyOrderDialog";
import BranchTransferDialog from "@/components/converted-orders/BranchTransferDialog";
import DeleteOrderDialog from "@/components/converted-orders/DeleteOrderDialog";
import ErpSyncDialog from "@/components/converted-orders/ErpSyncDialog";
import NewDirectOrderDialog from "@/components/converted-orders/NewDirectOrderDialog";
import OrderApplicantsDialog from "@/components/converted-orders/OrderApplicantsDialog";
import OrderChecklistDialog from "@/components/converted-orders/OrderChecklistDialog";
import OrderShareDialog from "@/components/converted-orders/OrderShareDialog";
import OrderStatusDialog from "@/components/converted-orders/OrderStatusDialog";
import OrdersBranchAnalytics from "@/components/converted-orders/OrdersBranchAnalytics";
import OrdersFiltersBar from "@/components/converted-orders/OrdersFiltersBar";
import OrdersHeader from "@/components/converted-orders/OrdersHeader";
import OrdersKpiCards from "@/components/converted-orders/OrdersKpiCards";
import OrdersTable from "@/components/converted-orders/OrdersTable";
import { useConvertedOrdersPage } from "@/components/converted-orders/useConvertedOrdersPage";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function ConvertedOrders() {
  const page = useConvertedOrdersPage();

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <OrdersHeader
          onOpenNewOrder={() => page.setOpenNewOrderDialog(true)}
          onOpenAgencyOrder={() => page.setOpenAgencyOrderDialog(true)}
          onOpenBranchTransfer={() => page.setOpenBranchTransferDialog(true)}
          onOpenErpSync={() => page.setOpenErpSyncDialog(true)}
          onExportExcel={page.handleExportExcel}
        />

        <OrdersKpiCards stats={page.stats} />

        <Card className="rounded-2xl border-border/80 shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/60">
            <OrdersFiltersBar
              activeTab={page.activeTab}
              onTabChange={page.setActiveTab}
              totalOrdersCount={page.orders.length}
              stats={page.stats}
              selectedBranchFilter={page.selectedBranchFilter}
              onBranchFilterChange={page.setSelectedBranchFilter}
              selectedStatusFilter={page.selectedStatusFilter}
              onStatusFilterChange={page.setSelectedStatusFilter}
              searchTerm={page.searchTerm}
              onSearchTermChange={page.setSearchTerm}
            />
          </CardHeader>

          <CardContent className="p-0">
            {page.activeTab === "analytics" ? (
              <OrdersBranchAnalytics
                branchStats={page.stats.branchStats}
                onExportErp={page.handleExportErpFormat}
              />
            ) : (
              <OrdersTable
                orders={page.filteredOrders}
                onCreateFirstOrder={() => page.setOpenNewOrderDialog(true)}
                onOpenStatusChange={(order) => {
                  page.setSelectedOrder(order);
                  page.setSelectedNewStatus(order.status);
                  page.setStatusChangeNotes(order.notes || "");
                  page.setOpenStatusChangeDialog(true);
                }}
                onOpenChecklist={(order) => {
                  page.setSelectedOrder(order);
                  page.setCurrentChecklist(order.documents_checklist || {});
                  page.setRequiredKinds(order.required_document_kinds || []);
                  page.setOpenChecklistDialog(true);
                }}
                onOpenShare={(order) => {
                  page.setSelectedOrder(order);
                  page.setOpenShareDialog(true);
                }}
                onOpenAiMatcher={(order) => {
                  page.setSelectedOrder(order);
                  page.setOpenAiMatcherDialog(true);
                }}
                onOpenPrint={(order) => {
                  page.setSelectedOrder(order);
                  page.setOpenPrintDialog(true);
                }}
                onRequestDelete={page.setOrderToDelete}
              />
            )}
          </CardContent>
        </Card>

        <NewDirectOrderDialog
          open={page.openNewOrderDialog}
          onOpenChange={page.setOpenNewOrderDialog}
          form={page.newOrderForm}
          onChangeForm={page.setNewOrderForm}
          candidates={page.candidates}
          onSelectCandidate={page.handleSelectCandidateForOrder}
          onSubmit={page.handleCreateDirectOrder}
          isSubmitting={page.isCreatingOrder}
        />

        <AgencyOrderDialog
          open={page.openAgencyOrderDialog}
          onOpenChange={page.setOpenAgencyOrderDialog}
          form={page.agencyOrderForm}
          onChangeForm={page.setAgencyOrderForm}
          agencies={page.agencies}
          onSubmit={page.handleCreateAgencyOrder}
          isSubmitting={page.isCreatingOrder}
        />

        <BranchTransferDialog
          open={page.openBranchTransferDialog}
          onOpenChange={page.setOpenBranchTransferDialog}
          form={page.branchTransferForm}
          onChangeForm={page.setBranchTransferForm}
          onSubmit={page.handleCreateBranchTransferOrder}
          isSubmitting={page.isCreatingOrder}
        />

        <OrderChecklistDialog
          open={page.openChecklistDialog}
          onOpenChange={page.setOpenChecklistDialog}
          selectedOrder={page.selectedOrder}
          currentChecklist={page.currentChecklist}
          onToggleChecklistItem={(key, checked) =>
            page.setCurrentChecklist((prev) => ({ ...prev, [key]: checked }))
          }
          requiredKinds={page.requiredKinds}
          onToggleRequiredKind={(key) =>
            page.setRequiredKinds((prev) =>
              prev.includes(key) ? prev.filter((kind) => kind !== key) : [...prev, key]
            )
          }
          submittedDocuments={page.submittedDocuments}
          documentsLoading={page.documentsLoading}
          reviewingDocument={page.reviewingDocument}
          reviewNotes={page.reviewNotes}
          onChangeReviewNote={(docId, note) => page.setReviewNotes((prev) => ({ ...prev, [docId]: note }))}
          onRefreshDocuments={(orderId) => {
            void page.loadSubmittedDocuments(orderId);
          }}
          onOpenDocument={(doc) => {
            void page.openSubmittedDocument(doc);
          }}
          onReviewDocument={(doc, decision) => {
            void page.reviewSubmittedDocument(doc, decision);
          }}
          onSaveChecklist={() => {
            void page.handleSaveChecklist();
          }}
        />

        <OrderStatusDialog
          open={page.openStatusChangeDialog}
          onOpenChange={page.setOpenStatusChangeDialog}
          selectedOrder={page.selectedOrder}
          selectedNewStatus={page.selectedNewStatus}
          onChangeStatus={page.setSelectedNewStatus}
          statusChangeNotes={page.statusChangeNotes}
          onChangeNotes={page.setStatusChangeNotes}
          onConfirm={() => {
            void page.handleConfirmStatusUpdate();
          }}
        />

        <Dialog open={page.openPrintDialog} onOpenChange={page.setOpenPrintDialog}>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-4 sm:p-6" dir="rtl">
            {page.selectedOrder && (
              <PrintableEmploymentOrder
                order={page.selectedOrder}
                onClose={() => page.setOpenPrintDialog(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        <OrderShareDialog
          open={page.openShareDialog}
          onOpenChange={page.setOpenShareDialog}
          selectedOrder={page.selectedOrder}
          onShareWhatsApp={page.handleShareWhatsApp}
          onShareEmail={page.handleShareEmail}
          onCopyLink={page.handleCopyLink}
        />

        <OrderApplicantsDialog
          open={page.openAiMatcherDialog}
          onOpenChange={page.setOpenAiMatcherDialog}
          selectedOrder={page.selectedOrder}
          matchedCandidates={page.aiMatchedCandidates}
          onReviewCandidate={page.navigateToCandidate}
        />

        <ErpSyncDialog
          open={page.openErpSyncDialog}
          onOpenChange={page.setOpenErpSyncDialog}
          webhookUrl={page.webhookUrl}
          onChangeWebhookUrl={page.setWebhookUrl}
          isPingingWebhook={page.isPingingWebhook}
          onPingWebhook={page.handlePingWebhook}
          onExportErp={page.handleExportErpFormat}
        />

        <DeleteOrderDialog
          orderToDelete={page.orderToDelete}
          onClose={() => page.setOrderToDelete(null)}
          onConfirmDelete={page.handleDeleteOrder}
        />
      </div>
    </DashboardLayout>
  );
}
