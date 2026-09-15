import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { erzeugeCode, erzeugeToken } from "@/lib/code";

export const runtime = "nodejs";
// Ohne diese Zeile versucht Next.js beim Build, die Route statisch zu
// rendern und würde die Handler-Funktion dabei einmal ausführen – das
// würde bei jedem Deployment einen unnötigen Datenbank-Eintrag anlegen.
export const dynamic = "force-dynamic";

// Öffentlicher Einstiegspunkt für den QR-Code (siehe /qr): legt bei jedem
// Aufruf eine neue, leere Person an und leitet direkt auf deren
// persönliches Erfassungsformular weiter. Die E-Mail-Adresse wird dort
// zusammen mit den übrigen Angaben erfasst – ein separater Mailversand
// ist nicht nötig, der Link/Code lässt sich einfach im Browser
// speichern (Lesezeichen), um die Angaben später zu ergänzen.
export async function GET(req: NextRequest) {
  const supabase = supabaseAdmin();

  let token = erzeugeToken();
  let code = erzeugeCode();
  let versuch = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { error } = await supabase
      .from("personen")
      .insert({ email: "", token, code });
    if (!error) break;
    versuch += 1;
    const istCodeKonflikt = error.code === "23505" && versuch < 5;
    if (!istCodeKonflikt) {
      console.error("Registrieren-Fehler:", error);
      return NextResponse.redirect(new URL("/", req.url));
    }
    code = erzeugeCode();
  }

  return NextResponse.redirect(new URL(`/erfassen/${token}`, req.url));
}
