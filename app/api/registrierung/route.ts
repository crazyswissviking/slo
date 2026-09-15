import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { erzeugeCode, erzeugeToken } from "@/lib/code";
import { sendeErfassungsLink } from "@/lib/email";

export const runtime = "nodejs";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Öffentlich: Person anhand E-Mail anlegen (oder bestehenden Eintrag
// wiederverwenden) und den Erfassungslink per Mail verschicken.
export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { error: "Bitte eine gültige E-Mail-Adresse angeben." },
      { status: 400 }
    );
  }

  const supabase = supabaseAdmin();

  // Bestehenden Eintrag zur selben E-Mail wiederverwenden, statt
  // Dubletten anzulegen – so funktioniert der Button auch als
  // "Link erneut zusenden".
  const bestehend = await supabase
    .from("personen")
    .select("id, token, code")
    .eq("email", email)
    .maybeSingle();

  if (bestehend.error) {
    console.error("Suche-Fehler:", bestehend.error);
    return NextResponse.json(
      { error: "Registrierung fehlgeschlagen." },
      { status: 500 }
    );
  }

  let token: string;
  let code: string;

  if (bestehend.data) {
    token = bestehend.data.token;
    code = bestehend.data.code;
    await supabase
      .from("personen")
      .update({ angefordert_am: new Date().toISOString() })
      .eq("id", bestehend.data.id);
  } else {
    token = erzeugeToken();
    code = erzeugeCode();

    // Sehr unwahrscheinlicher Code-Konflikt: einmal neu würfeln und
    // erneut versuchen.
    let versuch = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { error } = await supabase
        .from("personen")
        .insert({ email, token, code });
      if (!error) break;
      versuch += 1;
      const istCodeKonflikt = error.code === "23505" && versuch < 3;
      if (!istCodeKonflikt) {
        console.error("Insert-Fehler:", error);
        return NextResponse.json(
          { error: "Registrierung fehlgeschlagen." },
          { status: 500 }
        );
      }
      code = erzeugeCode();
    }
  }

  const link = `${req.nextUrl.origin}/erfassen/${token}`;

  try {
    await sendeErfassungsLink({ an: email, link, code });
  } catch (e) {
    console.error("Mail-Fehler:", e);
    return NextResponse.json(
      {
        error:
          "Eintrag wurde gespeichert, aber die E-Mail konnte nicht verschickt werden.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
