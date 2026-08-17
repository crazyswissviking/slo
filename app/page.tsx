"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Fehler = Partial<
  Record<"gegner" | "vorname" | "name" | "ausweisnummer", string>
>;

// Leerzeichen/Bindestriche raus, Grossbuchstaben – z. B. "e 123 4567"
// wird zu "E1234567".
function bereinigeAusweisnummer(wert: string): string {
  return wert.replace(/[\s-]/g, "").toUpperCase();
}

// Schweizer Formate: alt = 1 Buchstabe + 7 Ziffern (8-stellig),
// neu (ab 2023) = 9-stellig alphanumerisch. Die Buchstaben O und I
// werden laut Fedpol auf Schweizer Ausweisen nie verwendet (Verwechslung
// mit 0/1). Andere Längen (6–20 Zeichen) werden als ausländisches
// Dokument akzeptiert, ohne die O/I-Einschränkung.
function ausweisnummerFehler(bereinigt: string): string | null {
  if (!bereinigt) return "Bitte Ausweisnummer angeben.";
  if (!/^[A-Z0-9]{6,20}$/.test(bereinigt)) {
    return "Ungültige Ausweisnummer (6–20 Zeichen, nur Buchstaben und Ziffern).";
  }
  const istAltesChFormat = /^[A-Z][0-9]{7}$/.test(bereinigt);
  const istNeuesChFormat = bereinigt.length === 9;
  if ((istAltesChFormat || istNeuesChFormat) && /[OI]/.test(bereinigt)) {
    return "Die Buchstaben O und I werden bei Schweizer Pässen/IDs nicht verwendet – vermutlich ist 0 oder 1 gemeint.";
  }
  return null;
}

function validiere(
  gegner: string,
  vorname: string,
  name: string,
  ausweisnummer: string
): Fehler {
  const fehler: Fehler = {};
  if (!gegner.trim()) fehler.gegner = "Bitte gegnerische Mannschaft angeben.";
  if (!vorname.trim()) fehler.vorname = "Bitte Vorname angeben.";
  if (!name.trim()) fehler.name = "Bitte Name angeben.";
  const ausweisFehler = ausweisnummerFehler(bereinigeAusweisnummer(ausweisnummer));
  if (ausweisFehler) fehler.ausweisnummer = ausweisFehler;
  return fehler;
}

export default function Erfassung() {
  const [gegner, setGegner] = useState("");
  const [standardGesetzt, setStandardGesetzt] = useState(false);
  const [gegnerGeladen, setGegnerGeladen] = useState(false);
  const [vorname, setVorname] = useState("");
  const [name, setName] = useState("");
  const [ausweisnummer, setAusweisnummer] = useState("");
  const [fehler, setFehler] = useState<Fehler>({});
  const [zeigeBestaetigung, setZeigeBestaetigung] = useState(false);
  const [speichert, setSpeichert] = useState(false);
  const [speicherFehler, setSpeicherFehler] = useState("");
  const [zeigeErfolg, setZeigeErfolg] = useState(false);

  // Standard-Gegner beim Laden holen
  useEffect(() => {
    fetch("/api/gegner")
      .then((res) => (res.ok ? res.json() : { gegner: "" }))
      .then((data) => {
        if (data.gegner) {
          setGegner(data.gegner);
          setStandardGesetzt(true);
        }
      })
      .catch(() => {})
      .finally(() => setGegnerGeladen(true));
  }, []);

  const pruefen = () => {
    const f = validiere(gegner, vorname, name, ausweisnummer);
    setFehler(f);
    if (Object.keys(f).length === 0) {
      setSpeicherFehler("");
      setZeigeBestaetigung(true);
    }
  };

  const speichern = async () => {
    setSpeichert(true);
    setSpeicherFehler("");
    try {
      const res = await fetch("/api/teilnehmer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gegner: gegner.trim(),
          vorname: vorname.trim(),
          name: name.trim(),
          ausweisnummer: bereinigeAusweisnummer(ausweisnummer),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Speichern fehlgeschlagen.");
      }
      // Keine weitere Bestätigung – Formular zurücksetzen.
      // Der Gegner bleibt stehen (Standard oder manuell), damit die
      // nächste Person am selben Gerät nicht neu eintippen muss.
      setVorname("");
      setName("");
      setAusweisnummer("");
      setFehler({});
      setZeigeBestaetigung(false);
      setZeigeErfolg(true);
      setTimeout(() => setZeigeErfolg(false), 3000);
    } catch (e) {
      setSpeicherFehler(
        e instanceof Error
          ? e.message
          : "Die Daten konnten nicht gespeichert werden. Bitte erneut versuchen."
      );
    } finally {
      setSpeichert(false);
    }
  };

  return (
    <div className="page">
      <div className="ticket">
        <div className="ticketTop">
          <div>
            <div className="eyebrow">UEFA · Auswärtsfahrt</div>
            <h1>
              {gegner.trim() ? `${gegner.trim().toUpperCase()} – ` : ""}FC THUN
            </h1>
          </div>
          <div className="ticketStub">
            <span className="stubLabel">Sektor</span>
            <span className="stubValue">Gäste</span>
          </div>
        </div>
        <div className="perforation" />
        <p className="ticketSub">
          Anmeldung für die Teilnehmerliste. Nur wer erfasst ist, kann ein
          Ticket lösen.
        </p>
      </div>

      <div className="card">
        <h2>Teilnehmer erfassen</h2>

        <div className="feld">
          <label htmlFor="gegner">Gegnerische Mannschaft</label>
          {!gegnerGeladen ? (
            <div className="gegnerFix">Wird geladen …</div>
          ) : standardGesetzt ? (
            <div className="gegnerFix">
              {gegner} <span className="gegnerFixZusatz">– FC Thun</span>
            </div>
          ) : (
            <input
              id="gegner"
              className="input"
              type="text"
              value={gegner}
              onChange={(e) => setGegner(e.target.value)}
              placeholder="z. B. Sparta Prag"
            />
          )}
          {fehler.gegner && <div className="fehlerText">{fehler.gegner}</div>}
        </div>

        <div className="feld">
          <label htmlFor="vorname">Vorname</label>
          <input
            id="vorname"
            className="input"
            type="text"
            value={vorname}
            onChange={(e) => setVorname(e.target.value)}
            placeholder="z. B. Ueli"
            autoComplete="given-name"
          />
          {fehler.vorname && <div className="fehlerText">{fehler.vorname}</div>}
        </div>

        <div className="feld">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            className="input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. Berger"
            autoComplete="family-name"
          />
          {fehler.name && <div className="fehlerText">{fehler.name}</div>}
        </div>

        <div className="feld">
          <label htmlFor="ausweisnummer">Ausweisnummer (Pass oder ID)</label>
          <input
            id="ausweisnummer"
            className="input"
            type="text"
            value={ausweisnummer}
            onChange={(e) => setAusweisnummer(e.target.value)}
            placeholder="z. B. E1234567"
            autoCapitalize="characters"
          />
          {fehler.ausweisnummer && (
            <div className="fehlerText">{fehler.ausweisnummer}</div>
          )}
        </div>

        <button className="primaryBtn" onClick={pruefen}>
          Daten prüfen
        </button>
      </div>

      {zeigeBestaetigung && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="dialog">
            <h3>Sind diese Angaben korrekt?</h3>
            <dl>
              <div className="dlRow">
                <dt>Spiel</dt>
                <dd>{gegner.trim()} – FC Thun</dd>
              </div>
              <div className="dlRow">
                <dt>Vorname</dt>
                <dd>{vorname.trim()}</dd>
              </div>
              <div className="dlRow">
                <dt>Name</dt>
                <dd>{name.trim()}</dd>
              </div>
              <div className="dlRow">
                <dt>Ausweisnummer</dt>
                <dd>{bereinigeAusweisnummer(ausweisnummer)}</dd>
              </div>
            </dl>
            {speicherFehler && <div className="fehlerBox">{speicherFehler}</div>}
            <div className="buttonZeile">
              <button
                className="secondaryBtn"
                onClick={() => setZeigeBestaetigung(false)}
                disabled={speichert}
              >
                Nein, korrigieren
              </button>
              <button
                className="primaryBtn"
                onClick={speichern}
                disabled={speichert}
              >
                {speichert ? "Wird gespeichert …" : "Ja, Daten speichern"}
              </button>
            </div>
          </div>
        </div>
      )}

      {zeigeErfolg && (
        <div className="erfolgOverlay" role="status" aria-live="polite">
          <div className="erfolgKreis">
            <svg
              className="erfolgHaken"
              viewBox="0 0 52 52"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle className="erfolgKreisLinie" cx="26" cy="26" r="24" />
              <path className="erfolgHakenLinie" d="M14 27l8 8 16-16" />
            </svg>
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
