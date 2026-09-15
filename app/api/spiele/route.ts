import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function istBerechtigt(req: NextRequest): boolean {
  const passwort = process.env.ADMIN_PASSWORD;
  if (!passwort) return false;
  const header = req.headers.get("x-admin-password") ?? "";
  return header === passwort;
}

// Öffentlich lesbar: Spieldaten inkl. Preis, damit sowohl die
// Ticketerfassung als auch die Verwaltung sie anzeigen können.
export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from("spiele")
    .select("id, gegner, heimteam, datum, preis_pro_ticket, reihenfolge")
    .order("reihenfolge", { ascending: true });

  if (error) {
    console.error("Spiele-Abfrage-Fehler:", error);
    return NextResponse.json({ error: "Fehler beim Laden." }, { status: 500 });
  }

  return NextResponse.json(
    { spiele: data ?? [] },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

// Admin-geschützt: Preis pro Ticket für ein Spiel setzen.
export async function PATCH(req: NextRequest) {
  if (!istBerechtigt(req)) {
    return NextResponse.json({ error: "Nicht berechtigt." }, { status: 401 });
  }

  let body: { id?: string; preis_pro_ticket?: number | string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const id = (body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "Spiel-ID fehlt." }, { status: 400 });
  }

  const preis =
    body.preis_pro_ticket === null || body.preis_pro_ticket === ""
      ? null
      : Number(body.preis_pro_ticket);

  if (preis !== null && (Number.isNaN(preis) || preis < 0 || preis > 10000)) {
    return NextResponse.json({ error: "Ungültiger Preis." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from("spiele")
    .update({ preis_pro_ticket: preis })
    .eq("id", id)
    .select("id, gegner, heimteam, datum, preis_pro_ticket, reihenfolge")
    .maybeSingle();

  if (error) {
    console.error("Preis-Update-Fehler:", error);
    return NextResponse.json(
      { error: "Speichern fehlgeschlagen." },
      { status: 500 }
    );
  }
  if (!data) {
    return NextResponse.json({ error: "Spiel nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, spiel: data });
}
