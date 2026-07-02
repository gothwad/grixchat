/**
 * Utility helper to route api requests to Supabase Edge Functions or Local Express Server proxy.
 */

export const getEdgeApiConfig = (endpoint: 'livekit-token' | 'send-notification') => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && anonKey) {
    // If Supabase credentials are in frontend, call the deployed Edge Function directly
    const baseUrl = supabaseUrl.endsWith('/') ? supabaseUrl.slice(0, -1) : supabaseUrl;
    const url = `${baseUrl}/functions/v1/${endpoint}`;
    return {
      url,
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    };
  }

  // Fallback to Express backend proxy in dev/server configuration
  return {
    url: `/api/${endpoint}`,
    headers: {
      'Content-Type': 'application/json'
    }
  };
};
