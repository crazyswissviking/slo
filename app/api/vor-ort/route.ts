import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function istBerechtigt(req: NextRequest): boolean {
  const passwort = process.env.ADMIN_PASSWORD;
  if (!passwort) return false;
  const header = req.headers.get("x-admin-password") ?? "";
  return header === passwort;
}

// Admin-geschützt: Person per Code, Name, Vorname oder E-Mail suchen.
// Liefert die gefundenen Personen inkl. ihrer bisherigen Tickets pro
// Spiel mit, damit die Vor-Ort-Seite den aktuellen Stand zeigen kann.
export async function GET(req: NextRequest) {
  if (!istBerechtigt(req)) {
    return NextResponse.json({ error: "Nicht berechtigt." }, { status: 401 });
  }

  const suche = (req.nextUrl.searchParams.get("suche") ?? "").trim();
  if (suche.length < 2) {
    return NextResponse.json({ personen: [] });
  }

  const like = `%${suche.replace(/[%,]/g, "")}%`;
  const { data, error } = await supabaseAdmin()
    .from("personen")
    .select(
      "id, code, email, name, vorname, daten_erfasst, tickets(id, spiel_id, anzahl, betrag, bezahlt, bezahlt_am)"
    )
    .or(
      `code.ilike.${like},name.ilike.${like},vorname.ilike.${like},email.ilike.${like}`
    )
    .order("erfasst_am", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Suche-Fehler:", error);
    return NextResponse.json({ error: "Suche fehlgeschlagen." }, { status: 500 });
  }

  return NextResponse.json({ personen: data ?? [] });
}

// Admin-geschützt: Ticketanzahl für eine Person/Spiel speichern.
// Der Betrag wird serverseitig aus dem aktuell hinterlegten Preis
// berechnet und beim Speichern eingefroren. Eine Änderung der Anzahl
// setzt den Bezahlt-Status bewusst zurück, damit nicht versehentlich
// ein falscher (alter) Betrag als bezahlt gilt.
export async function POST(req: NextRequest) {
  if (!istBerechtigt(req)) {
    return NextResponse.json({ error: "Nicht berechtigt." }, { status: 401 });
  }

  let body: { person_id?: string; spiel_id?: string; anzahl?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const personId = (body.person_id ?? "").trim();
  const spielId = (body.spiel_id ?? "").trim();
  const anzahl = Number(body.anzahl);

  if (!personId || !spielId) {
    return NextResponse.json({ error: "Person oder Spiel fehlt." }, { status: 400 });
  }
  if (!Number.isInteger(anzahl) || anzahl < 0 || anzahl > 50) {
    return NextResponse.json({ error: "Ungültige Anzahl Tickets." }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  const { data: spiel, error: spielFehler } = await supabase
    .from("spiele")
    .select("preis_pro_ticket")
    .eq("id", spielId)
    .maybeSingle();

  if (spielFehler) {
    console.error("Spiel-Abfrage-Fehler:", spielFehler);
    return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
  }
  if (!spiel) {
    return NextResponse.json({ error: "Spiel nicht gefunden." }, { status: 404 });
  }
  if (spiel.preis_pro_ticket === null) {
    return NextResponse.json(
      { error: "Für dieses Spiel ist noch kein Ticketpreis hinterlegt." },
      { status: 400 }
    );
  }

  const betrag = Math.round(anzahl * spiel.preis_pro_ticket * 100) / 100;

  const { data, error } = await supabase
    .from("tickets")
    .upsert(
      {
        person_id: personId,
        spiel_id: spielId,
        anzahl,
        betrag,
        bezahlt: false,
        bezahlt_am: null,
        aktualisiert_am: new Date().toISOString(),
      },
      { onConflict: "person_id,spiel_id" }
    )
    .select("id, spiel_id, anzahl, betrag, bezahlt, bezahlt_am")
    .maybeSingle();

  if (error) {
    console.error("Ticket-Speicher-Fehler:", error);
    return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ticket: data });
}

// Admin-geschützt: Ticket als (nicht) bezahlt markieren.
export async function PATCH(req: NextRequest) {
  if (!istBerechtigt(req)) {
    return NextResponse.json({ error: "Nicht berechtigt." }, { status: 401 });
  }

  let body: { ticket_id?: string; bezahlt?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const ticketId = (body.ticket_id ?? "").trim();
  if (!ticketId) {
    return NextResponse.json({ error: "Ticket-ID fehlt." }, { status: 400 });
  }
  const bezahlt = body.bezahlt !== false;

  const { data, error } = await supabaseAdmin()
    .from("tickets")
    .update({
      bezahlt,
      bezahlt_am: bezahlt ? new Date().toISOString() : null,
    })
    .eq("id", ticketId)
    .select("id, spiel_id, anzahl, betrag, bezahlt, bezahlt_am")
    .maybeSingle();

  if (error) {
    console.error("Bezahlt-Update-Fehler:", error);
    return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Ticket nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ticket: data });
}
