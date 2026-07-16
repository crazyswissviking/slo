import { createClient } from "@supabase/supabase-js";

// Dieser Client darf NUR serverseitig (API-Routen) verwendet werden.
// Der Service-Role-Key umgeht Row Level Security.
export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt in den Umgebungsvariablen."
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
