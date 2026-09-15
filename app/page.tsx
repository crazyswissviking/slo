"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Spiel } from "@/lib/types";

type Kunde = {
  vorname: string;
  name: string;
  adresse: string;
  plz: string;
  ort: string;
  tel: string;
  email: string;
};

const LEERER_KUNDE: Kunde = {
  vorname: "",
  name: "",
  adresse: "",
  plz: "",
  ort: "",
  tel: "",
  email: "",
};

type ErgebnisTicket = {
  id: string;
  spiel_id: string;
  anzahl: number;
  betrag: number;
  bezahlt: boolean;
  bezahlt_am: string | null;
};

function formatDatum(iso: string): string {
  return new Date(iso).toLocaleString("de-CH", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
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

export default function Start() {
  const [passwort, setPasswort] = useState("");
  const [passwortEingabe, setPasswortEingabe] = useState("");
  const [loginFehler, setLoginFehler] = useState("");

  const [spiele, setSpiele] = useState<Spiel[]>([]);
  const [ticketEingabe, setTicketEingabe] = useState<Record<string, string>>({});
  const [kunde, setKunde] = useState<Kunde>(LEERER_KUNDE);

  const [fehler, setFehler] = useState("");
  const [speichert, setSpeichert] = useState(false);
  const [ergebnis, setErgebnis] = useState<{
    code: string;
    tickets: ErgebnisTicket[];
  } | null>(null);
  const [markiertBezahlt, setMarkiertBezahlt] = useState(false);

  useEffect(() => {
    if (!passwort) return;
    fetch("/api/spiele")
      .then((res) => res.json())
      .then((data) => {
        const geladen: Spiel[] = data.spiele ?? [];
        setSpiele(geladen);
        setTicketEingabe(Object.fromEntries(geladen.map((s) => [s.id, ""])));
      })
      .catch(() => setFehler("Spieldaten konnten nicht geladen werden."));
  }, [passwort]);

  const anmelden = () => {
    setLoginFehler("");
    setPasswort(passwortEingabe);
  };

  const kundeSetzen = (feld: keyof Kunde, wert: string) => {
    setKunde((alt) => ({ ...alt, [feld]: wert }));
  };

  const liveGesamtbetrag = spiele.reduce((summe, s) => {
    const anzahl = Number(ticketEingabe[s.id] || 0);
    return summe + anzahl * (s.preis_pro_ticket ?? 0);
  }, 0);

  const neueErfassung = () => {
    setErgebnis(null);
    setKunde(LEERER_KUNDE);
    setTicketEingabe(Object.fromEntries(spiele.map((s) => [s.id, ""])));
    setFehler("");
  };

  const erfassen = async () => {
    setFehler("");

    for (const [feld, wert] of Object.entries(kunde)) {
      if (!wert.trim()) {
        setFehler(`Bitte "${feld}" ausfüllen.`);
        return;
      }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(kunde.email.trim())) {
      setFehler("Bitte eine gültige E-Mail-Adresse angeben.");
      return;
    }
    const gesamtAnzahl = Object.values(ticketEingabe).reduce(
      (s, v) => s + Number(v || 0),
      0
    );
    if (gesamtAnzahl === 0) {
      setFehler("Bitte mindestens ein Ticket erfassen.");
      return;
    }

    setSpeichert(true);
    try {
      const res = await fetch("/api/erfassung", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": passwort,
        },
        body: JSON.stringify({
          ...kunde,
          tickets: Object.fromEntries(
            Object.entries(ticketEingabe).map(([id, wert]) => [id, Number(wert || 0)])
          ),
        }),
      });
      if (res.status === 401) {
        setPasswort("");
        setLoginFehler("Falsches Passwort.");
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Speichern fehlgeschlagen.");
      setErgebnis({ code: data.code, tickets: data.tickets ?? [] });
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setSpeichert(false);
    }
  };

  const alleBezahlt =
    (ergebnis?.tickets.length ?? 0) > 0 &&
    ergebnis!.tickets.every((t) => t.bezahlt);

  const bezahltUmschalten = async (bezahlt: boolean) => {
    if (!ergebnis) return;
    setMarkiertBezahlt(true);
    setFehler("");
    try {
      const aktualisiert = await Promise.all(
        ergebnis.tickets.map(async (t) => {
          const res = await fetch("/api/erfassung", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "x-admin-password": passwort,
            },
            body: JSON.stringify({ ticket_id: t.id, bezahlt }),
          });
          const data = await res.json().catch(() => null);
          if (!res.ok) throw new Error(data?.error ?? "Speichern fehlgeschlagen.");
          return data.ticket as ErgebnisTicket;
        })
      );
      setErgebnis({ code: ergebnis.code, tickets: aktualisiert });
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setMarkiertBezahlt(false);
    }
  };

  const ergebnisGesamt = ergebnis?.tickets.reduce((s, t) => s + t.betrag, 0) ?? 0;

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
        <p className="ticketSub">Ticketerfassung direkt vor Ort.</p>
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
            <button className="primaryBtn" onClick={anmelden}>
              Anmelden
            </button>
          </div>
        </div>
      ) : ergebnis ? (
        <div className="card">
          <h2>Erfasst</h2>
          <p className="hinweis" style={{ marginTop: -8 }}>
            Code für diese Person: <strong>{ergebnis.code}</strong>
          </p>

          {ergebnis.tickets.map((t) => {
            const s = spiele.find((s) => s.id === t.spiel_id);
            return (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid var(--linie)",
                }}
              >
                <span>
                  {s?.gegner ?? t.spiel_id} · {t.anzahl} Ticket
                  {t.anzahl === 1 ? "" : "s"}
                </span>
                <span style={{ fontWeight: 600 }}>CHF {formatChf(t.betrag)}</span>
              </div>
            );
          })}

          <div
            style={{
              borderTop: "2px solid var(--dunkel)",
              marginTop: 12,
              paddingTop: 14,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 13, color: "var(--grau)" }}>
                Gesamtbetrag – zu bezahlen via TWINT
              </div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>
                CHF {formatChf(ergebnisGesamt)}
              </div>
            </div>
            {alleBezahlt ? (
              <button
                className="secondaryBtn"
                onClick={() => bezahltUmschalten(false)}
                disabled={markiertBezahlt}
              >
                Bezahlt · rückgängig
              </button>
            ) : (
              <button
                className="primaryBtn"
                onClick={() => bezahltUmschalten(true)}
                disabled={markiertBezahlt}
              >
                Als bezahlt markieren
              </button>
            )}
          </div>

          {fehler && (
            <div className="fehlerBox" style={{ marginTop: 14 }}>
              {fehler}
            </div>
          )}

          <div className="buttonZeile" style={{ marginTop: 20 }}>
            <button className="primaryBtn" onClick={neueErfassung}>
              Neue Erfassung
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <h2>Spiele</h2>
          <p className="hinweis" style={{ marginTop: -8, marginBottom: 14 }}>
            Anzahl Tickets pro Spiel eingeben.
          </p>

          {spiele.map((s) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                padding: "10px 0",
                borderBottom: "1px solid var(--linie)",
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{s.gegner}</div>
                <div className="hinweis" style={{ fontSize: 12.5 }}>
                  {formatDatum(s.datum)}
                  {s.preis_pro_ticket !== null ? (
                    <> · CHF {formatChf(s.preis_pro_ticket)}/Ticket</>
                  ) : (
                    <span style={{ color: "var(--rot)" }}> · kein Preis hinterlegt</span>
                  )}
                </div>
              </div>
              <input
                className="input"
                type="number"
                min={0}
                max={50}
                style={{ width: 80, textAlign: "center" }}
                value={ticketEingabe[s.id] ?? ""}
                onChange={(e) =>
                  setTicketEingabe((alt) => ({ ...alt, [s.id]: e.target.value }))
                }
              />
            </div>
          ))}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 14,
              fontWeight: 700,
              fontSize: 17,
            }}
          >
            <span>Gesamtsumme</span>
            <span>CHF {formatChf(liveGesamtbetrag)}</span>
          </div>

          <h2 style={{ marginTop: 26 }}>Angaben des Kunden</h2>

          <div style={{ display: "flex", gap: 12 }}>
            <div className="feld" style={{ flex: 1 }}>
              <label htmlFor="vorname">Vorname</label>
              <input
                id="vorname"
                className="input"
                type="text"
                value={kunde.vorname}
                onChange={(e) => kundeSetzen("vorname", e.target.value)}
              />
            </div>
            <div className="feld" style={{ flex: 1 }}>
              <label htmlFor="name">Name</label>
              <input
                id="name"
                className="input"
                type="text"
                value={kunde.name}
                onChange={(e) => kundeSetzen("name", e.target.value)}
              />
            </div>
          </div>

          <div className="feld">
            <label htmlFor="adresse">Adresse</label>
            <input
              id="adresse"
              className="input"
              type="text"
              value={kunde.adresse}
              onChange={(e) => kundeSetzen("adresse", e.target.value)}
              placeholder="Strasse und Hausnummer"
            />
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div className="feld" style={{ flex: "0 0 110px" }}>
              <label htmlFor="plz">PLZ</label>
              <input
                id="plz"
                className="input"
                type="text"
                inputMode="numeric"
                value={kunde.plz}
                onChange={(e) => kundeSetzen("plz", e.target.value)}
              />
            </div>
            <div className="feld" style={{ flex: 1 }}>
              <label htmlFor="ort">Ort</label>
              <input
                id="ort"
                className="input"
                type="text"
                value={kunde.ort}
                onChange={(e) => kundeSetzen("ort", e.target.value)}
              />
            </div>
          </div>

          <div className="feld">
            <label htmlFor="tel">Telefon</label>
            <input
              id="tel"
              className="input"
              type="tel"
              value={kunde.tel}
              onChange={(e) => kundeSetzen("tel", e.target.value)}
              placeholder="z. B. 079 123 45 67"
            />
          </div>

          <div className="feld">
            <label htmlFor="email">E-Mail</label>
            <input
              id="email"
              className="input"
              type="email"
              value={kunde.email}
              onChange={(e) => kundeSetzen("email", e.target.value)}
            />
          </div>

          {fehler && <div className="fehlerBox">{fehler}</div>}

          <div className="buttonZeile">
            <button className="primaryBtn" onClick={erfassen} disabled={speichert}>
              {speichert ? "Speichert …" : "Erfassen"}
            </button>
          </div>
        </div>
      )}

      <footer className="footer">
        <span className="footerText">FC Thun · Fanverantwortung / SLO</span>
        <Link className="linkBtn" href="/verwaltung">
          Verwaltung
        </Link>
      </footer>
    </div>
  );
}
