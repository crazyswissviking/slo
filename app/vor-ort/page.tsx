"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Spiel } from "@/lib/types";

type Ticket = {
  id: string;
  spiel_id: string;
  anzahl: number;
  betrag: number;
  bezahlt: boolean;
  bezahlt_am: string | null;
};

type PersonTreffer = {
  id: string;
  code: string;
  email: string;
  name: string;
  vorname: string;
  daten_erfasst: boolean;
  tickets: Ticket[];
};

function formatDatum(iso: string): string {
  return new Date(iso).toLocaleString("de-CH", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatChf(betrag: number): string {
  return betrag.toLocaleString("de-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function VorOrt() {
  const [passwort, setPasswort] = useState("");
  const [passwortEingabe, setPasswortEingabe] = useState("");
  const [loginFehler, setLoginFehler] = useState("");

  const [spiele, setSpiele] = useState<Spiel[]>([]);
  const [suchbegriff, setSuchbegriff] = useState("");
  const [treffer, setTreffer] = useState<PersonTreffer[]>([]);
  const [sucht, setSucht] = useState(false);
  const [ausgewaehlt, setAusgewaehlt] = useState<PersonTreffer | null>(null);
  const [anzahlEingabe, setAnzahlEingabe] = useState<Record<string, string>>({});
  const [speichertSpiel, setSpeichertSpiel] = useState<Record<string, boolean>>({});
  const [fehler, setFehler] = useState("");

  useEffect(() => {
    if (!passwort) return;
    fetch("/api/spiele")
      .then((res) => res.json())
      .then((data) => setSpiele(data.spiele ?? []))
      .catch(() => setFehler("Spieldaten konnten nicht geladen werden."));
  }, [passwort]);

  const anmelden = () => {
    setLoginFehler("");
    setPasswort(passwortEingabe);
  };

  const suchen = useCallback(async () => {
    if (suchbegriff.trim().length < 2) {
      setTreffer([]);
      return;
    }
    setSucht(true);
    setFehler("");
    try {
      const res = await fetch(
        `/api/vor-ort?suche=${encodeURIComponent(suchbegriff.trim())}`,
        { headers: { "x-admin-password": passwort } }
      );
      if (res.status === 401) {
        setPasswort("");
        setLoginFehler("Falsches Passwort.");
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTreffer(data.personen ?? []);
    } catch {
      setFehler("Suche fehlgeschlagen.");
    } finally {
      setSucht(false);
    }
  }, [suchbegriff, passwort]);

  const personAuswaehlen = (p: PersonTreffer) => {
    setAusgewaehlt(p);
    const eingabe: Record<string, string> = {};
    for (const s of spiele) {
      const t = p.tickets.find((t) => t.spiel_id === s.id);
      eingabe[s.id] = t ? String(t.anzahl) : "";
    }
    setAnzahlEingabe(eingabe);
  };

  const ticketSpeichern = async (spielId: string) => {
    if (!ausgewaehlt) return;
    const anzahl = Number(anzahlEingabe[spielId] || 0);
    if (!Number.isInteger(anzahl) || anzahl < 0) {
      setFehler("Bitte eine gültige Anzahl Tickets eingeben.");
      return;
    }
    setSpeichertSpiel((alt) => ({ ...alt, [spielId]: true }));
    setFehler("");
    try {
      const res = await fetch("/api/vor-ort", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": passwort,
        },
        body: JSON.stringify({
          person_id: ausgewaehlt.id,
          spiel_id: spielId,
          anzahl,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Speichern fehlgeschlagen.");
      setAusgewaehlt((alt) => {
        if (!alt) return alt;
        const restlicheTickets = alt.tickets.filter((t) => t.spiel_id !== spielId);
        return { ...alt, tickets: [...restlicheTickets, data.ticket] };
      });
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setSpeichertSpiel((alt) => ({ ...alt, [spielId]: false }));
    }
  };

  const bezahltMarkieren = async (ticketId: string, bezahlt: boolean) => {
    setFehler("");
    try {
      const res = await fetch("/api/vor-ort", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": passwort,
        },
        body: JSON.stringify({ ticket_id: ticketId, bezahlt }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Speichern fehlgeschlagen.");
      setAusgewaehlt((alt) => {
        if (!alt) return alt;
        return {
          ...alt,
          tickets: alt.tickets.map((t) => (t.id === ticketId ? data.ticket : t)),
        };
      });
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    }
  };

  const gesamtbetrag = ausgewaehlt
    ? ausgewaehlt.tickets.reduce((summe, t) => summe + t.betrag, 0)
    : 0;

  return (
    <div className="page">
      <div className="ticket">
        <div className="ticketTop">
          <div>
            <div className="eyebrow">UEFA · Auswärtsfahrten</div>
            <h1>FC THUN</h1>
          </div>
          <div className="ticketStub">
            <span className="stubLabel">Bereich</span>
            <span className="stubValue">SLO</span>
          </div>
        </div>
        <div className="perforation" />
        <p className="ticketSub">Vor-Ort-Erfassung der Tickets pro Spiel.</p>
      </div>

      {!passwort ? (
        <div className="card">
          <h2>Anmelden</h2>
          <div className="feld">
            <label htmlFor="pw">Passwort</label>
            <input
              id="pw"
              className="input"
              type="password"
              value={passwortEingabe}
              onChange={(e) => setPasswortEingabe(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && anmelden()}
              placeholder="Admin-Passwort"
            />
            {loginFehler && <div className="fehlerText">{loginFehler}</div>}
          </div>
          <div className="buttonZeile">
            <Link className="secondaryBtn" href="/">
              Zurück zur Startseite
            </Link>
            <button className="primaryBtn" onClick={anmelden}>
              Anmelden
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <h2>Person suchen</h2>
            <p className="hinweis" style={{ marginTop: -8, marginBottom: 16 }}>
              Suche nach Code, Name, Vorname oder E-Mail.
            </p>
            <div className="feld">
              <label htmlFor="suche">Suche</label>
              <input
                id="suche"
                className="input"
                type="text"
                value={suchbegriff}
                onChange={(e) => setSuchbegriff(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && suchen()}
                placeholder="z. B. K7H2PQ oder Berger"
              />
            </div>
            <div className="buttonZeile">
              <button className="primaryBtn" onClick={suchen} disabled={sucht}>
                {sucht ? "Sucht …" : "Suchen"}
              </button>
            </div>

            {fehler && <div className="fehlerBox">{fehler}</div>}

            {treffer.length > 0 && (
              <div style={{ marginTop: 16 }}>
                {treffer.map((p) => (
                  <button
                    key={p.id}
                    className="secondaryBtn"
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      marginBottom: 8,
                      borderColor:
                        ausgewaehlt?.id === p.id ? "var(--rot)" : undefined,
                    }}
                    onClick={() => personAuswaehlen(p)}
                  >
                    <strong>
                      {p.vorname} {p.name}
                    </strong>{" "}
                    · Code {p.code} · {p.email}
                    {!p.daten_erfasst && (
                      <span style={{ color: "var(--rot)" }}>
                        {" "}
                        · Angaben noch nicht erfasst
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {ausgewaehlt && (
            <div className="card">
              <h2>
                {ausgewaehlt.vorname} {ausgewaehlt.name}{" "}
                <span className="anzahl">(Code {ausgewaehlt.code})</span>
              </h2>

              {spiele.map((s) => {
                const ticket = ausgewaehlt.tickets.find((t) => t.spiel_id === s.id);
                return (
                  <div
                    key={s.id}
                    style={{
                      borderTop: "1px solid var(--linie)",
                      paddingTop: 14,
                      marginTop: 14,
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>
                      {s.gegner} – {s.heimteam}
                    </div>
                    <div className="hinweis" style={{ marginBottom: 10 }}>
                      {formatDatum(s.datum)}
                      {s.preis_pro_ticket !== null && (
                        <> · CHF {formatChf(s.preis_pro_ticket)} pro Ticket</>
                      )}
                    </div>

                    {s.preis_pro_ticket === null ? (
                      <div className="fehlerText">
                        Kein Ticketpreis hinterlegt – bitte zuerst in der
                        Verwaltung setzen.
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                          <div className="feld" style={{ marginBottom: 0, flex: "0 0 120px" }}>
                            <label htmlFor={`anzahl-${s.id}`}>Anzahl Tickets</label>
                            <input
                              id={`anzahl-${s.id}`}
                              className="input"
                              type="number"
                              min={0}
                              max={50}
                              value={anzahlEingabe[s.id] ?? ""}
                              onChange={(e) =>
                                setAnzahlEingabe((alt) => ({
                                  ...alt,
                                  [s.id]: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <button
                            className="secondaryBtn"
                            onClick={() => ticketSpeichern(s.id)}
                            disabled={speichertSpiel[s.id]}
                          >
                            {speichertSpiel[s.id] ? "Speichert …" : "Speichern"}
                          </button>
                        </div>

                        {ticket && (
                          <div
                            style={{
                              marginTop: 12,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: 10,
                            }}
                          >
                            <div>
                              <div style={{ fontSize: 13, color: "var(--grau)" }}>
                                Zu bezahlen via TWINT
                              </div>
                              <div style={{ fontSize: 22, fontWeight: 700 }}>
                                CHF {formatChf(ticket.betrag)}
                              </div>
                            </div>
                            {ticket.bezahlt ? (
                              <button
                                className="secondaryBtn"
                                onClick={() => bezahltMarkieren(ticket.id, false)}
                              >
                                Bezahlt am{" "}
                                {ticket.bezahlt_am
                                  ? new Date(ticket.bezahlt_am).toLocaleString(
                                      "de-CH",
                                      { dateStyle: "short", timeStyle: "short" }
                                    )
                                  : ""}{" "}
                                · rückgängig
                              </button>
                            ) : (
                              <button
                                className="primaryBtn"
                                onClick={() => bezahltMarkieren(ticket.id, true)}
                              >
                                Als bezahlt markieren
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}

              <div
                style={{
                  borderTop: "2px solid var(--dunkel)",
                  marginTop: 16,
                  paddingTop: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 700,
                  fontSize: 16,
                }}
              >
                <span>Total</span>
                <span>CHF {formatChf(gesamtbetrag)}</span>
              </div>
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <Link className="linkBtn" href="/">
              ← Zurück zur Startseite
            </Link>
          </div>
        </>
      )}

      <footer className="footer">
        <span className="footerText">FC Thun · Fanverantwortung / SLO</span>
      </footer>
    </div>
  );
}
