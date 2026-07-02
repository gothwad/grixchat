import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleAuth } from "npm:google-auth-library@9.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { tokens, title, body, data } = await req.json();

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return new Response(JSON.stringify({ error: "Missing recipient tokens" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!serviceAccountJson) {
      console.log("[PUSH SIMULATION] FIREBASE_SERVICE_ACCOUNT not set in Edge Function.");
      return new Response(JSON.stringify({ 
        success: true, 
        simulated: true, 
        message: "Push simulated. Configure FIREBASE_SERVICE_ACCOUNT in Supabase Edge Secrets to enable active FCM sending." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let credentials = JSON.parse(serviceAccountJson);
    if (typeof credentials === "string") {
      credentials = JSON.parse(credentials);
    }

    const projectId = credentials.project_id;
    if (credentials.private_key && typeof credentials.private_key === "string") {
      credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
    }

    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });
    const client = await auth.getClient();
    const accessTokenObj = await client.getAccessToken();
    const accessToken = accessTokenObj.token;

    if (!accessToken) {
      throw new Error("Failed to retrieve FCM access token from Google Auth");
    }

    const results = await Promise.all(
      tokens.map(async (token) => {
        try {
          const payload = {
            message: {
              token,
              notification: { title, body },
              data: {
                click_action: data?.click_action || "/chats",
                conversationId: data?.conversationId || "",
                senderId: data?.senderId || "",
                ...(data || {}),
              },
            },
          };

          const response = await fetch(
            `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            }
          );

          if (!response.ok) {
            const errRes = await response.json();
            throw new Error(JSON.stringify(errRes));
          }

          const resJson = await response.json();
          return { token, success: true, messageId: resJson?.name };
        } catch (err: any) {
          return { token, success: false, error: err.message };
        }
      })
    );

    const sentCount = results.filter((r) => r.success).length;

    return new Response(JSON.stringify({ success: true, total: tokens.length, sentCount, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
