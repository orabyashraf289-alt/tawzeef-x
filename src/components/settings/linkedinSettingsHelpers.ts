import type { Json, Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type LinkedInDeliveryRow = Tables<"linkedin_deliveries">;

export interface LinkedInSettingsRecord {
  zapier_webhook_url: string;
  is_active: boolean;
  access_token: string | null;
  linkedin_urn: string | null;
  linkedin_name: string | null;
  linkedin_avatar: string | null;
  custom_client_id: string;
  custom_client_secret: string;
}

export interface LinkedInSettingsUpsertInput {
  user_id: string;
  zapier_webhook_url?: string;
  is_active?: boolean;
  custom_client_id?: string;
  custom_client_secret?: string;
}

export interface LinkedInDisconnectUpdateInput {
  access_token: null;
  expires_at: null;
  linkedin_urn: null;
  linkedin_name: null;
  linkedin_avatar: null;
}

export const LINKEDIN_OAUTH_REDIRECT_URI =
  "https://rlfewneisuezsamhosct.supabase.co/functions/v1/linkedin-oauth";

const DEFAULT_LINKEDIN_CLIENT_ID = "863i5e87aexdqp";

export function isValidZapierUrl(url: string): boolean {
  return !url || url.startsWith("https://hooks.zapier.com/");
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function parseLinkedInSettings(raw: unknown): LinkedInSettingsRecord | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const row = raw as Record<string, unknown>;
  return {
    zapier_webhook_url: asString(row.zapier_webhook_url),
    is_active: typeof row.is_active === "boolean" ? row.is_active : true,
    access_token: asStringOrNull(row.access_token),
    linkedin_urn: asStringOrNull(row.linkedin_urn),
    linkedin_name: asStringOrNull(row.linkedin_name),
    linkedin_avatar: asStringOrNull(row.linkedin_avatar),
    custom_client_id: asString(row.custom_client_id),
    custom_client_secret: asString(row.custom_client_secret),
  };
}

/**
 * Narrow bridge for LinkedIn OAuth columns added by migrations after types.ts generation.
 */
export function toLinkedInUpsertPayload(
  payload: LinkedInSettingsUpsertInput,
): TablesInsert<"linkedin_settings"> {
  return payload as unknown as TablesInsert<"linkedin_settings">;
}

/**
 * Narrow bridge for LinkedIn OAuth token revocation columns not yet in types.ts.
 */
export function toLinkedInUpdatePayload(
  payload: LinkedInDisconnectUpdateInput,
): TablesUpdate<"linkedin_settings"> {
  return payload as unknown as TablesUpdate<"linkedin_settings">;
}

export function getDeliveryJobTitle(payload: Json): string | undefined {
  if (payload && typeof payload === "object" && !Array.isArray(payload) && "job_title" in payload) {
    return typeof payload.job_title === "string" ? payload.job_title : undefined;
  }
  return undefined;
}

export function buildLinkedInAuthUrl(userId: string, customClientId: string, origin: string): string {
  const clientId = customClientId || DEFAULT_LINKEDIN_CLIENT_ID;
  const state = `${userId}___${btoa(origin)}`;
  const scope = encodeURIComponent("openid profile w_member_social");
  return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(LINKEDIN_OAUTH_REDIRECT_URI)}&state=${state}&scope=${scope}`;
}
