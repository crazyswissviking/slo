import { randomBytes, randomUUID } from "crypto";

// Zeichen ohne O/0 und I/1 – gleiche Logik wie bei den früheren
// Ausweisnummern: Verwechslungsgefahr beim Vorlesen/Abtippen vermeiden.
const CODE_ZEICHEN = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// Kurzer, gut vorlesbarer Code für die Vor-Ort-Suche (z. B. "K7H2PQ").
export function erzeugeCode(laenge = 6): string {
  const bytes = randomBytes(laenge);
  let code = "";
  for (let i = 0; i < laenge; i++) {
    code += CODE_ZEICHEN[bytes[i] % CODE_ZEICHEN.length];
  }
  return code;
}

// Langes, unerratbares Token für den Erfassungslink per E-Mail.
export function erzeugeToken(): string {
  return randomUUID().replace(/-/g, "");
}
