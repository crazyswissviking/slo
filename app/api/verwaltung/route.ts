import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function istBerechtigt(req: NextRequest): boolean {
  const passwort = process.env.ADMIN_PASSWORD;
  if (!passwort) return false;
  const header = req.headers.get("x-admin-password") ?? "";
  return header === passwort;
}

export async function GET(req: NextRequest) {
  if (!istBerechtigt(req)) {
    return NextResponse.json({ error: "Nicht berechtigt." }, { status: 401 });
  }

  const supabase = supabaseAdmin();

  const [teilnehmerRes, gegnerRes] = await Promise.all([
    supabase
      .from("teilnehmer")
      .select("id, gegner, name, vorname, geburtsdatum, erfasst_am")
      .order("gegner", { ascending: true })
      .order("name", { ascending: true })
      .order("vorname", { ascending: true }),
    supabase
      .from("einstellungen")
      .select("wert")
      .eq("schluessel", "aktueller_gegner")
      .maybeSingle(),
  ]);

  if (teilnehmerRes.error) {
    console.error("Select-Fehler:", teilnehmerRes.error);
    return NextResponse.json(
      { error: "Liste konnte nicht geladen werden." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    teilnehmer: teilnehmerRes.data ?? [],
    standardGegner: gegnerRes.data?.wert ?? "",
  });
}

// Standard-Gegner setzen oder löschen (leerer String = kein Standard)
export async function PUT(req: NextRequest) {
  if (!istBerechtigt(req)) {
    return NextResponse.json({ error: "Nicht berechtigt." }, { status: 401 });
  }

  let body: { gegner?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const gegner = (body.gegner ?? "").trim();
  if (gegner.length > 100) {
    return NextResponse.json({ error: "Eingabe zu lang." }, { status: 400 });
  }

  const { error } = await supabaseAdmin()
    .from("einstellungen")
    .upsert({
      schluessel: "aktueller_gegner",
      wert: gegner,
      geaendert_am: new Date().toISOString(),
    });

  if (error) {
    console.error("Einstellungs-Fehler:", error);
    return NextResponse.json(
      { error: "Speichern fehlgeschlagen." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, standardGegner: gegner });
}

export async function DELETE(req: NextRequest) {
  if (!istBerechtigt(req)) {
    return NextResponse.json({ error: "Nicht berechtigt." }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID fehlt." }, { status: 400 });
  }

  const { error } = await supabaseAdmin()
    .from("teilnehmer")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Delete-Fehler:", error);
    return NextResponse.json(
      { error: "Löschen fehlgeschlagen." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
