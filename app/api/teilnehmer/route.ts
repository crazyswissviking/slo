import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type Eingabe = {
  gegner?: string;
  vorname?: string;
  name?: string;
  ausweisnummer?: string;
};

// Leerzeichen/Bindestriche raus, Grossbuchstaben.
function bereinigeAusweisnummer(wert: string): string {
  return wert.replace(/[\s-]/g, "").toUpperCase();
}

// Schweizer Formate: alt = 1 Buchstabe + 7 Ziffern (8-stellig),
// neu (ab 2023) = 9-stellig alphanumerisch. Die Buchstaben O und I
// werden laut Fedpol auf Schweizer Ausweisen nie verwendet (Verwechslung
// mit 0/1). Andere Längen (6–20 Zeichen) werden als ausländisches
// Dokument akzeptiert, ohne die O/I-Einschränkung.
function ausweisnummerFehler(bereinigt: string): string | null {
  if (!bereinigt) return "Ausweisnummer fehlt.";
  if (!/^[A-Z0-9]{6,20}$/.test(bereinigt))
    return "Ausweisnummer ist ungültig (6–20 Zeichen, nur Buchstaben und Ziffern).";
  const istAltesChFormat = /^[A-Z][0-9]{7}$/.test(bereinigt);
  const istNeuesChFormat = bereinigt.length === 9;
  if ((istAltesChFormat || istNeuesChFormat) && /[OI]/.test(bereinigt))
    return "Die Buchstaben O und I werden bei Schweizer Pässen/IDs nicht verwendet.";
  return null;
}

function validiere(e: Eingabe): string | null {
  const gegner = (e.gegner ?? "").trim();
  const vorname = (e.vorname ?? "").trim();
  const name = (e.name ?? "").trim();
  const ausweisnummer = bereinigeAusweisnummer(e.ausweisnummer ?? "");

  if (!gegner) return "Gegnerische Mannschaft fehlt.";
  if (!vorname) return "Vorname fehlt.";
  if (!name) return "Name fehlt.";
  const ausweisFehler = ausweisnummerFehler(ausweisnummer);
  if (ausweisFehler) return ausweisFehler;

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