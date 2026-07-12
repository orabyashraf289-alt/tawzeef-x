import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");
  const errorDesc = url.searchParams.get("error_description");

  // Default fallback redirect page
  const defaultFallback = "https://ai-hire-buddy-22.lovable.app/settings?tab=linkedin";

  let origin = "https://ai-hire-buddy-22.lovable.app";
  let userId = "";

  // Parse state (contains userId___base64Origin)
  if (state) {
    try {
      const parts = state.split("___");
      userId = parts[0];
      if (parts[1]) {
        origin = atob(parts[1]);
      }
    } catch (e) {
      console.error("Failed to parse state parameter:", e);
    }
  }

  const redirectUrl = (status: "success" | "error", details?: string) => {
    const target = new URL(`${origin}/settings`);
    target.searchParams.set("tab", "linkedin");
    target.searchParams.set("oauth", status);
    if (details) target.searchParams.set("reason", details);
    return target.toString();
  };

  // Check if LinkedIn returned an error
  if (errorParam) {
    console.error("LinkedIn OAuth error:", errorParam, errorDesc);
    return Response.redirect(redirectUrl("error", errorDesc || errorParam), 302);
  }

  if (!code || !userId) {
    console.error("Missing code or userId in callback request");
    return Response.redirect(redirectUrl("error", "missing_code_or_state"), 302);
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get client settings (if company has custom app keys)
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("linkedin_settings")
      .select("custom_client_id, custom_client_secret")
      .eq("user_id", userId)
      .maybeSingle();

    if (settingsError) throw settingsError;

    // Use custom client credentials if defined, otherwise fallback to global envs
    const clientId = settings?.custom_client_id || Deno.env.get("LINKEDIN_CLIENT_ID");
    const clientSecret = settings?.custom_client_secret || Deno.env.get("LINKEDIN_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      throw new Error("Client credentials (Client ID / Client Secret) are not configured.");
    }

    // Exchange authorization code for access token
    const tokenRedirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/linkedin-oauth`;
    console.log("Exchanging code for token with redirect_uri:", tokenRedirectUri);

    const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: tokenRedirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", tokenData);
      throw new Error(tokenData.error_description || tokenData.error || "Token exchange failed");
    }

    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in; // in seconds
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Fetch user profile from LinkedIn OIDC userinfo endpoint
    console.log("Fetching user profile from LinkedIn OIDC...");
    const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const profileData = await profileResponse.json();
    if (!profileResponse.ok) {
      console.error("Profile fetch failed:", profileData);
      throw new Error("Failed to fetch LinkedIn profile details.");
    }

    const linkedinName = profileData.name || `${profileData.given_name || ""} ${profileData.family_name || ""}`.trim();
    const linkedinUrn = `urn:li:person:${profileData.sub}`;
    // Profile photo sizes can be accessed from the picture property
    const linkedinAvatar = profileData.picture || null;

    console.log(`Successfully authenticated LinkedIn user: ${linkedinName} (${linkedinUrn})`);

    // Upsert OAuth details into database
    const { error: upsertError } = await supabaseAdmin
      .from("linkedin_settings")
      .upsert({
        user_id: userId,
        access_token: accessToken,
        expires_at: expiresAt,
        linkedin_urn: linkedinUrn,
        linkedin_name: linkedinName,
        linkedin_avatar: linkedinAvatar,
        is_active: true,
      } as any, { onConflict: "user_id" });

    if (upsertError) throw upsertError;

    // Log a success delivery for connection
    await supabaseAdmin.from("linkedin_deliveries").insert({
      user_id: userId,
      event_type: "account.connected",
      payload: { linkedin_urn: linkedinUrn, name: linkedinName },
      status: "success",
      status_code: 200,
    });

    // Redirect user back with success query
    return Response.redirect(redirectUrl("success"), 302);

  } catch (err) {
    console.error("LinkedIn OAuth integration failed:", err);
    return Response.redirect(redirectUrl("error", err.message), 302);
  }
});
