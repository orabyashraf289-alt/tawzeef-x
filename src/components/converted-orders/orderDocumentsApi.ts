import { supabase } from "@/integrations/supabase/client";
import type { OrderDocument } from "@/types/orderOnboardingDocuments";

interface QueryError {
  message: string;
}

type QueryResponse<T> = Promise<{ data: T | null; error: QueryError | null }>;

interface OrderOnboardingSupabaseClient {
  from: (table: "order_onboarding_documents") => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (column: string, options: { ascending: boolean }) => QueryResponse<OrderDocument[]>;
      };
    };
  };
  rpc: (
    fn: "review_order_onboarding_document",
    params: {
      _document_id: string;
      _decision: "approved" | "rejected";
      _note: string | null;
    }
  ) => QueryResponse<boolean>;
}

const onboardingClient = supabase as unknown as OrderOnboardingSupabaseClient;

export async function fetchOrderSubmittedDocuments(
  orderId: string
): Promise<{ data: OrderDocument[]; error: QueryError | null }> {
  const { data, error } = await onboardingClient
    .from("order_onboarding_documents")
    .select("id,kind,file_name,storage_path,review_status,review_note,created_at,reviewed_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  return { data: data || [], error };
}

export async function createOrderDocumentSignedUrl(
  storagePath: string
): Promise<{ signedUrl: string | null; error: Error | null }> {
  const { data, error } = await supabase.storage
    .from("order-onboarding-documents")
    .createSignedUrl(storagePath, 60);

  return { signedUrl: data?.signedUrl ?? null, error };
}

export async function submitOrderDocumentReview(
  documentId: string,
  decision: "approved" | "rejected",
  note: string | null
): Promise<{ approved: boolean; error: QueryError | null }> {
  const { data, error } = await onboardingClient.rpc("review_order_onboarding_document", {
    _document_id: documentId,
    _decision: decision,
    _note: note,
  });

  return { approved: data === true, error };
}
