import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { erzeugeCode, erzeugeToken } from "@/lib/code";

export const runtime = "nodejs";

function istBerechtigt(req: NextRequest): boolean {
  const passwort = process.env.ADMIN_PASSWORD;
  if (!passwort) return false;
  const header = req.headers.get("x-admin-password") ?? "";
  return header === passwort;
}

const FELDER = ["vorname", "name", "adresse", "plz", "ort", "tel", "email"] as const;

// Admin-geschützt: Der SLO erfasst Kundendaten und Ticketanzahl pro Spiel
// in einem Schritt direkt vor Ort. Legt die Person und die zugehörigen
// Ticket-Zeilen (nur für Spiele mit Anzahl > 0) in einem Rutsch an.
export async function POST(req: NextRequest) {
  if (!istBerechtigt(req)) {
    return NextResponse.json({ error: "Nicht berechtigt." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const eingabe: Record<string, string> = {};
  for (const feld of FELDER) {
    const wert = body[feld];
    if (typeof wert !== "string" || !wert.trim()) {
      return NextResponse.json(
        { error: `Bitte "${feld}" ausfüllen.` },
        { status: 400 }
      );
    }
    const bereinigt = wert.trim();
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

  const ticketsEingabe = body.tickets;
  if (typeof ticketsEingabe !== "object" || ticketsEingabe === null) {
    return NextResponse.json({ error: "Ticketangaben fehlen." }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  const { data: spiele, error: spieleFehler } = await supabase
    .from("uefa_spiele")
    .select("id, preis_pro_ticket");
  if (spieleFehler) {
    console.error("Spiele-Fehler:", spieleFehler);
    return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
  }
  const preiseNachId = new Map(
    (spiele ?? []).map((s) => [s.id, s.preis_pro_ticket as number | null])
  );

  const ticketZeilen: { spiel_id: string; anzahl: number; betrag: number }[] = [];
  for (const [spielId, anzahlRoh] of Object.entries(
    ticketsEingabe as Record<string, unknown>
  )) {
    const anzahl = Number(anzahlRoh);
    if (!Number.isInteger(anzahl) || anzahl < 0 || anzahl > 50) {
      return NextResponse.json({ error: "Ungültige Anzahl Tickets." }, { status: 400 });
    }
    if (!preiseNachId.has(spielId)) {
      return NextResponse.json({ error: "Unbekanntes Spiel." }, { status: 400 });
    }
    if (anzahl === 0) continue;
    const preis = preiseNachId.get(spielId) ?? null;
    if (preis === null) {
      return NextResponse.json(
        { error: "Für ein gewähltes Spiel ist noch kein Ticketpreis hinterlegt." },
        { status: 400 }
      );
    }
    ticketZeilen.push({
      spiel_id: spielId,
      anzahl,
      betrag: Math.round(anzahl * preis * 100) / 100,
    });
  }

  if (ticketZeilen.length === 0) {
    return NextResponse.json(
      { error: "Bitte mindestens ein Ticket erfassen." },
      { status: 400 }
    );
  }

  let code = erzeugeCode();
  let personId: string | null = null;
  let versuch = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase
      .from("personen")
      .insert({
        ...eingabe,
        email: eingabe.email.toLowerCase(),
        token: erzeugeToken(),
        code,
        daten_erfasst: true,
        erfasst_am: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (!error && data) {
      personId = data.id;
      break;
    }
    versuch += 1;
    if (!error || error.code !== "23505" || versuch >= 5) {
      console.error("Insert-Fehler:", error);
      return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
    }
    code = erzeugeCode();
  }

  const { data: erstellteTickets, error: ticketFehler } = await supabase
    .from("tickets")
    .insert(
      ticketZeilen.map((t) => ({
        person_id: personId,
        spiel_id: t.spiel_id,
        anzahl: t.anzahl,
        betrag: t.betrag,
      }))
    )
    .select("id, spiel_id, anzahl, betrag, bezahlt, bezahlt_am");

  if (ticketFehler) {
    console.error("Ticket-Insert-Fehler:", ticketFehler);
    return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, code, tickets: erstellteTickets ?? [] });
}

// Admin-geschützt: eines der soeben erfassten Tickets als (nicht)
// bezahlt markieren.
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
