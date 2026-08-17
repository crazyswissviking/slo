import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type Eingabe = {
  gegner?: string;
  vorname?: string;
  name?: string;
  ausweisnummer?: string;
};

// Leerzeichen/Bindestriche raus, Grossbuchstaben. Deckt Schweizer
// ID/Pass (8–9-stellig) und ausländische Dokumente (andere Längen)
// gleichermassen ab.
function bereinigeAusweisnummer(wert: string): string {
  return wert.replace(/[\s-]/g, "").toUpperCase();
}

function validiere(e: Eingabe): string | null {
  const gegner = (e.gegner ?? "").trim();
  const vorname = (e.vorname ?? "").trim();
  const name = (e.name ?? "").trim();
  const ausweisnummer = bereinigeAusweisnummer(e.ausweisnummer ?? "");

  if (!gegner) return "Gegnerische Mannschaft fehlt.";
  if (!vorname) return "Vorname fehlt.";
  if (!name) return "Name fehlt.";
  if (!/^[A-Z0-9]{6,20}$/.test(ausweisnummer))
    return "Ausweisnummer ist ungültig (6–20 Zeichen, nur Buchstaben und Ziffern).";

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
    ausweisnummer: bereinigeAusweisnummer(body.ausweisnummer!),
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