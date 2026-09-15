import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const FELDER = ["name", "vorname", "adresse", "plz", "ort", "tel", "email"] as const;

// Der Token im Link wirkt wie ein Passwort: Nur wer den Link kennt
// (per Mail erhalten), kommt an die Daten dieser Person. Es gibt
// keine Liste, aus der man Tokens erraten oder aufzählen könnte.
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { data, error } = await supabaseAdmin()
    .from("personen")
    .select(
      "code, email, name, vorname, adresse, plz, ort, tel, daten_erfasst"
    )
    .eq("token", params.token)
    .maybeSingle();

  if (error) {
    console.error("Abfrage-Fehler:", error);
    return NextResponse.json({ error: "Fehler beim Laden." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Link ungültig." }, { status: 404 });
  }

  return NextResponse.json({ person: data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const eingabe: Record<string, string> = {};
  for (const feld of FELDER) {
    const wert = body[feld];
    if (typeof wert !== "string") {
      return NextResponse.json(
        { error: `Feld "${feld}" fehlt oder ist ungültig.` },
        { status: 400 }
      );
    }
    const bereinigt = wert.trim();
    if (!bereinigt) {
      return NextResponse.json(
        { error: `Bitte "${feld}" ausfüllen.` },
        { status: 400 }
      );
    }
    if (bereinigt.length > 200) {
      return NextResponse.json({ error: "Eingabe zu lang." }, { status: 400 });
    }
    eingabe[feld] = bereinigt;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eingabe.email)) {
    return NextResponse.json(
      { error: "Bitte eine gültige E-Mail-Adresse angeben." },
      { status: 400 }
    );
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("personen")
    .update({
      ...eingabe,
      email: eingabe.email.toLowerCase(),
      daten_erfasst: true,
      erfasst_am: new Date().toISOString(),
    })
    .eq("token", params.token)
    .select("code")
    .maybeSingle();

  if (error) {
    console.error("Update-Fehler:", error);
    return NextResponse.json(
      { error: "Speichern fehlgeschlagen." },
      { status: 500 }
    );
  }
  if (!data) {
    return NextResponse.json({ error: "Link ungültig." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, code: data.code });
}
