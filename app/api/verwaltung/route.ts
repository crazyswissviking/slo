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

  const { data, error } = await supabaseAdmin()
    .from("personen")
    .select(
      "id, code, email, name, vorname, adresse, plz, ort, tel, daten_erfasst, angefordert_am, erfasst_am, tickets(id, spiel_id, anzahl, betrag, bezahlt, bezahlt_am)"
    )
    .order("erfasst_am", { ascending: false, nullsFirst: false })
    .order("angefordert_am", { ascending: false });

  if (error) {
    console.error("Select-Fehler:", error);
    return NextResponse.json(
      { error: "Liste konnte nicht geladen werden." },
      { status: 500 }
    );
  }

  return NextResponse.json({ personen: data ?? [] });
}

export async function DELETE(req: NextRequest) {
  if (!istBerechtigt(req)) {
    return NextResponse.json({ error: "Nicht berechtigt." }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID fehlt." }, { status: 400 });
  }

  // Tickets werden per "on delete cascade" automatisch mitgelöscht.
  const { error } = await supabaseAdmin().from("personen").delete().eq("id", id);

  if (error) {
    console.error("Delete-Fehler:", error);
    return NextResponse.json(
      { error: "Löschen fehlgeschlagen." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
