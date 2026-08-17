import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// Öffentlich lesbar: liefert nur den Namen des aktuellen Gegners
// (keine Personendaten). Wird vom Erfassungsformular beim Laden geholt.
export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from("einstellungen")
    .select("wert")
    .eq("schluessel", "aktueller_gegner")
    .maybeSingle();

  if (error) {
    console.error("Gegner-Abfrage-Fehler:", error);
    return NextResponse.json({ gegner: "" });
  }

  return NextResponse.json(
    { gegner: data?.wert ?? "" },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
