import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type Eingabe = {
  gegner?: string;
  vorname?: string;
  name?: string;
  geburtsdatum?: string;
};

function validiere(e: Eingabe): string | null {
  const gegner = (e.gegner ?? "").trim();
  const vorname = (e.vorname ?? "").trim();
  const name = (e.name ?? "").trim();
  const geburtsdatum = e.geburtsdatum ?? "";

  if (!gegner) return "Gegnerische Mannschaft fehlt.";
  if (!vorname) return "Vorname fehlt.";
  if (!name) return "Name fehlt.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(geburtsdatum))
    return "Geburtsdatum ist ungültig.";

  const d = new Date(geburtsdatum);
  const heute = new Date();
  const min = new Date();
  min.setFullYear(heute.getFullYear() - 120);
  if (isNaN(d.getTime()) || d > heute || d < min)
    return "Geburtsdatum ist unplausibel.";

  if (gegner.length > 100 || vorname.length > 100 || name.length > 100)
    return "Eingabe zu lang.";

  return null;
}

export async function POST(req: NextRequest) {
  let body: Eingabe;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const fehler = validiere(body);
  if (fehler) {
    return NextResponse.json({ error: fehler }, { status: 400 });
  }

  const { error } = await supabaseAdmin().from("teilnehmer").insert({
    gegner: body.gegner!.trim(),
    vorname: body.vorname!.trim(),
    name: body.name!.trim(),
    geburtsdatum: body.geburtsdatum,
  });

  if (error) {
    console.error("Insert-Fehler:", error);
    return NextResponse.json(
      { error: "Speichern fehlgeschlagen." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
