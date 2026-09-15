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

type Person = {
  id: string;
  code: string;
  email: string;
  name: string;
  vorname: string;
  adresse: string;
  plz: string;
  ort: string;
  tel: string;
  daten_erfasst: boolean;
  angefordert_am: string;
  erfasst_am: string | null;
  tickets: Ticket[];
};

function formatChf(betrag: number): string {
  return betrag.toLocaleString("de-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function Verwaltung() {
  const [passwort, setPasswort] = useState("");
  const [passwortEingabe, setPasswortEingabe] = useState("");
  const [loginFehler, setLoginFehler] = useState("");

  const [personen, setPersonen] = useState<Person[]>([]);
  const [spiele, setSpiele] = useState<Spiel[]>([]);
  const [preisEingabe, setPreisEingabe] = useState<Record<string, string>>({});
  const [preisSpeichert, setPreisSpeichert] = useState<Record<string, boolean>>({});
  const [preisMeldung, setPreisMeldung] = useState<Record<string, string>>({});

  const [nurOffene, setNurOffene] = useState(false);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState("");

  const laden = useCallback(async (pw: string) => {
    setLaedt(true);
    setFehler("");
    try {
      const [personenRes, spieleRes] = await Promise.all([
        fetch("/api/verwaltung", { headers: { "x-admin-password": pw } }),
        fetch("/api/spiele"),
      ]);
      if (personenRes.status === 401) {
        setPasswort("");
        setLoginFehler("Falsches Passwort.");
        return;
      }
      if (!personenRes.ok || !spieleRes.ok) throw new Error();
      const personenData = await personenRes.json();
      const spieleData = await spieleRes.json();
      setPersonen(personenData.personen ?? []);
      const geladeneSpiele: Spiel[] = spieleData.spiele ?? [];
      setSpiele(geladeneSpiele);
      setPreisEingabe(
        Object.fromEntries(
          geladeneSpiele.map((s) => [
            s.id,
            s.preis_pro_ticket !== null ? String(s.preis_pro_ticket) : "",
          ])
        )
      );
    } catch {
      setFehler("Liste konnte nicht geladen werden.");
    } finally {
      setLaedt(false);
    }
  }, []);

  useEffect(() => {
    if (passwort) laden(passwort);
  }, [passwort, laden]);

  const anmelden = () => {
    setLoginFehler("");
    setPasswort(passwortEingabe);
  };

  const preisSpeichern = async (spielId: string) => {
    setPreisSpeichert((alt) => ({ ...alt, [spielId]: true }));
    setPreisMeldung((alt) => ({ ...alt, [spielId]: "" }));
    try {
      const wert = preisEingabe[spielId];
      const res = await fetch("/api/spiele", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": passwort,
        },
        body: JSON.stringify({
          id: spielId,
          preis_pro_ticket: wert.trim() === "" ? null : Number(wert),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Speichern fehlgeschlagen.");
      setSpiele((alt) => alt.map((s) => (s.id === spielId ? data.spiel : s)));
      setPreisMeldung((alt) => ({ ...alt, [spielId]: "Gespeichert." }));
    } catch (e) {
      setPreisMeldung((alt) => ({
        ...alt,
        [spielId]: e instanceof Error ? e.message : "Speichern fehlgeschlagen.",
      }));
    } finally {
      setPreisSpeichert((alt) => ({ ...alt, [spielId]: false }));
    }
  };

  const loeschen = async (id: string) => {
    try {
      const res = await fetch(`/api/verwaltung?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "x-admin-password": passwort },
      });
      if (!res.ok) throw new Error();
      setPersonen((alt) => alt.filter((p) => p.id !== id));
    } catch {
      setFehler("Eintrag konnte nicht gelöscht werden.");
    }
  };

  const gesamtbetrag = (p: Person) =>
    p.tickets.reduce((summe, t) => summe + t.betrag, 0);

  const gefiltert = nurOffene
    ? personen.filter((p) => p.tickets.some((t) => t.anzahl > 0 && !t.bezahlt))
    : personen;

  const csvExport = () => {
    const spielKopf = spiele.flatMap((s) => [
      `${s.gegner} Anzahl`,
      `${s.gegner} Bezahlt`,
    ]);
    const kopf = [
      "Name",
      "Vorname",
      "Adresse",
      "PLZ",
      "Ort",
      "Telefon",
      "E-Mail",
      "Code",
      "Erfasst am",
      ...spielKopf,
      "Total CHF",
    ].join(";");

    const zeilen = gefiltert.map((p) => {
      const erfasst = p.erfasst_am
        ? new Date(p.erfasst_am).toLocaleString("de-CH")
        : "";
      const spielSpalten = spiele.flatMap((s) => {
        const t = p.tickets.find((t) => t.spiel_id === s.id);
        return [
          String(t?.anzahl ?? 0),
          t?.bezahlt ? "ja" : "nein",
        ];
      });
      return [
        p.name,
        p.vorname,
        p.adresse,
        p.plz,
        p.ort,
        p.tel,
        p.email,
        p.code,
        erfasst,
        ...spielSpalten,
        formatChf(gesamtbetrag(p)),
      ].join(";");
    });

    const csv = "﻿" + [kopf, ...zeilen].join("\r\n"); // BOM für Excel
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "uefa-auswaertsfahrten.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

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
        <p className="ticketSub">Verwaltung der Registrierungen und Tickets.</p>
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
            <h2>Ticketpreise</h2>
            {spiele.map((s) => (
              <div
                key={s.id}
                style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 12 }}
              >
                <div className="feld" style={{ marginBottom: 0, flex: 1 }}>
                  <label htmlFor={`preis-${s.id}`}>
                    {s.gegner} – {s.heimteam}
                  </label>
                  <input
                    id={`preis-${s.id}`}
                    className="input"
                    type="number"
                    min={0}
                    step="0.05"
                    placeholder="CHF"
                    value={preisEingabe[s.id] ?? ""}
                    onChange={(e) =>
                      setPreisEingabe((alt) => ({ ...alt, [s.id]: e.target.value }))
                    }
                  />
                </div>
                <button
                  className="secondaryBtn"
                  onClick={() => preisSpeichern(s.id)}
                  disabled={preisSpeichert[s.id]}
                >
                  {preisSpeichert[s.id] ? "Speichert …" : "Speichern"}
                </button>
                {preisMeldung[s.id] && (
                  <span className="hinweis" style={{ whiteSpace: "nowrap" }}>
                    {preisMeldung[s.id]}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="card">
            <div className="adminKopf">
              <h2>
                Personen <span className="anzahl">({gefiltert.length})</span>
              </h2>
              <div className="adminAktionen">
                <button className="secondaryBtn" onClick={() => laden(passwort)} disabled={laedt}>
                  Aktualisieren
                </button>
                <button
                  className="primaryBtn"
                  onClick={csvExport}
                  disabled={gefiltert.length === 0}
                >
                  CSV exportieren
                </button>
              </div>
            </div>

            <div className="feld" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                id="nurOffene"
                type="checkbox"
                checked={nurOffene}
                onChange={(e) => setNurOffene(e.target.checked)}
              />
              <label htmlFor="nurOffene" style={{ margin: 0, textTransform: "none" }}>
                Nur offene Zahlungen anzeigen
              </label>
            </div>

            {fehler && <div className="fehlerBox">{fehler}</div>}

            {laedt ? (
              <p className="hinweis">Liste wird geladen …</p>
            ) : gefiltert.length === 0 ? (
              <p className="hinweis">Keine Einträge gefunden.</p>
            ) : (
              <div className="tabellenScroll">
                <table className="tabelle">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Kontakt</th>
                      <th>Code</th>
                      <th>Erfasst</th>
                      {spiele.map((s) => (
                        <th key={s.id}>{s.gegner}</th>
                      ))}
                      <th>Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {gefiltert.map((p) => (
                      <tr key={p.id}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {p.vorname} {p.name}
                          <div className="hinweis" style={{ fontSize: 12 }}>
                            {p.adresse}, {p.plz} {p.ort}
                          </div>
                        </td>
                        <td>
                          {p.email}
                          <div className="hinweis" style={{ fontSize: 12 }}>
                            {p.tel}
                          </div>
                        </td>
                        <td>{p.code}</td>
                        <td>
                          {p.daten_erfasst ? (
                            "ja"
                          ) : (
                            <span style={{ color: "var(--rot)" }}>nein</span>
                          )}
                        </td>
                        {spiele.map((s) => {
                          const t = p.tickets.find((t) => t.spiel_id === s.id);
                          if (!t || t.anzahl === 0) {
                            return <td key={s.id}>–</td>;
                          }
                          return (
                            <td key={s.id} style={{ whiteSpace: "nowrap" }}>
                              {t.anzahl} × (CHF {formatChf(t.betrag)})
                              <div
                                className="hinweis"
                                style={{
                                  fontSize: 12,
                                  color: t.bezahlt ? "#2e8b3d" : "var(--rot)",
                                }}
                              >
                                {t.bezahlt ? "bezahlt" : "offen"}
                              </div>
                            </td>
                          );
                        })}
                        <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                          CHF {formatChf(gesamtbetrag(p))}
                        </td>
                        <td>
                          <button
                            className="deleteBtn"
                            onClick={() => loeschen(p.id)}
                            title="Eintrag löschen"
                          >
                            Löschen
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <Link className="linkBtn" href="/">
                ← Zurück zur Ticketerfassung
              </Link>
            </div>
          </div>
        </>
      )}

      <footer className="footer">
        <span className="footerText">FC Thun · Fanverantwortung / SLO</span>
      </footer>
    </div>
  );
}
