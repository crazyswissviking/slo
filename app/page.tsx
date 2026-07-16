"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

function formatDatumCH(isoDate: string): string {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}.${m}.${y}`;
}

type Fehler = Partial<
  Record<"gegner" | "vorname" | "name" | "geburtsdatum", string>
>;

function validiere(
  gegner: string,
  vorname: string,
  name: string,
  geburtsdatum: string
): Fehler {
  const fehler: Fehler = {};
  if (!gegner.trim()) fehler.gegner = "Bitte gegnerische Mannschaft angeben.";
  if (!vorname.trim()) fehler.vorname = "Bitte Vorname angeben.";
  if (!name.trim()) fehler.name = "Bitte Name angeben.";
  if (!geburtsdatum) {
    fehler.geburtsdatum = "Bitte Geburtsdatum angeben.";
  } else {
    const d = new Date(geburtsdatum);
    const heute = new Date();
    const min = new Date();
    min.setFullYear(heute.getFullYear() - 120);
    if (d > heute) fehler.geburtsdatum = "Das Geburtsdatum liegt in der Zukunft.";
    else if (d < min) fehler.geburtsdatum = "Bitte Geburtsdatum prüfen.";
  }
  return fehler;
}

export default function Erfassung() {
  const [gegner, setGegner] = useState("");
  const [standardGesetzt, setStandardGesetzt] = useState(false);
  const [gegnerGeladen, setGegnerGeladen] = useState(false);
  const [vorname, setVorname] = useState("");
  const [name, setName] = useState("");
  const [geburtsdatum, setGeburtsdatum] = useState("");
  const [fehler, setFehler] = useState<Fehler>({});
  const [zeigeBestaetigung, setZeigeBestaetigung] = useState(false);
  const [speichert, setSpeichert] = useState(false);
  const [speicherFehler, setSpeicherFehler] = useState("");

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
    const f = validiere(gegner, vorname, name, geburtsdatum);
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
          geburtsdatum,
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
      setGeburtsdatum("");
      setFehler({});
      setZeigeBestaetigung(false);
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
          <label htmlFor="geburtsdatum">Geburtsdatum</label>
          <input
            id="geburtsdatum"
            className="input"
            type="date"
            value={geburtsdatum}
            onChange={(e) => setGeburtsdatum(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
          />
          {fehler.geburtsdatum && (
            <div className="fehlerText">{fehler.geburtsdatum}</div>
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
                <dt>Geburtsdatum</dt>
                <dd>{formatDatumCH(geburtsdatum)}</dd>
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

      <footer className="footer">
        <span className="footerText">FC Thun · Fanverantwortung / SLO</span>
        <Link className="linkBtn" href="/verwaltung">
          Verwaltung
        </Link>
      </footer>
    </div>
  );
}
