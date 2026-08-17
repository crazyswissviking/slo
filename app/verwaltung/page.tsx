"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Teilnehmer = {
  id: string;
  gegner: string;
  name: string;
  vorname: string;
  ausweisnummer: string;
  erfasst_am: string;
};

export default function Verwaltung() {
  const [passwort, setPasswort] = useState("");
  const [passwortEingabe, setPasswortEingabe] = useState("");
  const [loginFehler, setLoginFehler] = useState("");
  const [eintraege, setEintraege] = useState<Teilnehmer[]>([]);
  const [standardGegner, setStandardGegner] = useState("");
  const [standardEingabe, setStandardEingabe] = useState("");
  const [standardMeldung, setStandardMeldung] = useState("");
  const [standardSpeichert, setStandardSpeichert] = useState(false);
  const [filterGegner, setFilterGegner] = useState<string>("alle");
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState("");

  const laden = useCallback(async (pw: string) => {
    setLaedt(true);
    setFehler("");
    try {
      const res = await fetch("/api/verwaltung", {
        headers: { "x-admin-password": pw },
      });
      if (res.status === 401) {
        setPasswort("");
        setLoginFehler("Falsches Passwort.");
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEintraege(data.teilnehmer ?? []);
      setStandardGegner(data.standardGegner ?? "");
      setStandardEingabe(data.standardGegner ?? "");
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

  const standardSpeichern = async (wert: string) => {
    setStandardSpeichert(true);
    setStandardMeldung("");
    try {
      const res = await fetch("/api/verwaltung", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": passwort,
        },
        body: JSON.stringify({ gegner: wert }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStandardGegner(data.standardGegner ?? "");
      setStandardEingabe(data.standardGegner ?? "");
      setStandardMeldung(
        data.standardGegner
          ? `Standard gesetzt: ${data.standardGegner} – FC Thun`
          : "Standard entfernt – Teilnehmer geben den Gegner wieder selbst ein."
      );
    } catch {
      setStandardMeldung("Standard konnte nicht gespeichert werden.");
    } finally {
      setStandardSpeichert(false);
    }
  };

  const loeschen = async (id: string) => {
    try {
      const res = await fetch(`/api/verwaltung?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "x-admin-password": passwort },
      });
      if (!res.ok) throw new Error();
      setEintraege((alt) => alt.filter((e) => e.id !== id));
    } catch {
      setFehler("Eintrag konnte nicht gelöscht werden.");
    }
  };

  const gegnerListe = Array.from(new Set(eintraege.map((e) => e.gegner))).sort(
    (a, b) => a.localeCompare(b, "de-CH")
  );

  const gefiltert =
    filterGegner === "alle"
      ? eintraege
      : eintraege.filter((e) => e.gegner === filterGegner);

  const csvExport = () => {
    const kopf = "Spiel;Name;Vorname;Ausweisnummer;Erfasst am";
    const zeilen = gefiltert.map((e) => {
      const erfasst = e.erfasst_am
        ? new Date(e.erfasst_am).toLocaleString("de-CH")
        : "";
      return `${e.gegner} – FC Thun;${e.name};${e.vorname};${e.ausweisnummer};${erfasst}`;
    });
    const csv = "\uFEFF" + [kopf, ...zeilen].join("\r\n"); // BOM für Excel
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      filterGegner === "alle"
        ? "teilnehmerliste-alle-spiele.csv"
        : `teilnehmerliste-${filterGegner
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page">
      <div className="ticket">
        <div className="ticketTop">
          <div>
            <div className="eyebrow">UEFA · Auswärtsfahrt</div>
            <h1>FC THUN</h1>
          </div>
          <div className="ticketStub">
            <span className="stubLabel">Bereich</span>
            <span className="stubValue">SLO</span>
          </div>
        </div>
        <div className="perforation" />
        <p className="ticketSub">Verwaltung der Teilnehmerlisten.</p>
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
              Zurück zur Erfassung
            </Link>
            <button className="primaryBtn" onClick={anmelden}>
              Anmelden
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <h2>Aktuelles Spiel</h2>
            <p className="hinweis" style={{ marginTop: -8 }}>
              Ist ein Standard gesetzt, sehen die Teilnehmer den Gegner nur
              noch als Anzeige und können ihn nicht ändern.
            </p>
            <div className="feld">
              <label htmlFor="standard">Gegnerische Mannschaft</label>
              <input
                id="standard"
                className="input"
                type="text"
                value={standardEingabe}
                onChange={(e) => setStandardEingabe(e.target.value)}
                placeholder="z. B. Sparta Prag"
              />
            </div>
            {standardMeldung && <p className="hinweis">{standardMeldung}</p>}
            <div className="buttonZeile">
              {standardGegner && (
                <button
                  className="secondaryBtn"
                  onClick={() => standardSpeichern("")}
                  disabled={standardSpeichert}
                >
                  Standard entfernen
                </button>
              )}
              <button
                className="primaryBtn"
                onClick={() => standardSpeichern(standardEingabe)}
                disabled={standardSpeichert || !standardEingabe.trim()}
              >
                {standardSpeichert
                  ? "Wird gespeichert …"
                  : "Als Standard speichern"}
              </button>
            </div>
          </div>

          <div className="card">
            <div className="adminKopf">
              <h2>
                Teilnehmerliste{" "}
                <span className="anzahl">({gefiltert.length})</span>
              </h2>
              <div className="adminAktionen">
                <button
                  className="secondaryBtn"
                  onClick={() => laden(passwort)}
                  disabled={laedt}
                >
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

            {gegnerListe.length > 0 && (
              <div className="feld">
                <label htmlFor="filter">Spiel filtern</label>
                <select
                  id="filter"
                  className="input"
                  value={filterGegner}
                  onChange={(e) => setFilterGegner(e.target.value)}
                >
                  <option value="alle">Alle Spiele</option>
                  {gegnerListe.map((g) => (
                    <option key={g} value={g}>
                      {g} – FC Thun
                    </option>
                  ))}
                </select>
              </div>
            )}

            {fehler && <div className="fehlerBox">{fehler}</div>}

            {laedt ? (
              <p className="hinweis">Liste wird geladen …</p>
            ) : gefiltert.length === 0 ? (
              <p className="hinweis">
                Noch keine Teilnehmer erfasst. Sobald sich jemand anmeldet,
                erscheint der Eintrag hier.
              </p>
            ) : (
              <div className="tabellenScroll">
                <table className="tabelle">
                  <thead>
                    <tr>
                      <th>Spiel</th>
                      <th>Name</th>
                      <th>Vorname</th>
                      <th>Ausweisnummer</th>
                      <th>Erfasst am</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {gefiltert.map((e) => (
                      <tr key={e.id}>
                        <td style={{ whiteSpace: "nowrap" }}>{e.gegner}</td>
                        <td>{e.name}</td>
                        <td>{e.vorname}</td>
                        <td>{e.ausweisnummer}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {e.erfasst_am
                            ? new Date(e.erfasst_am).toLocaleString("de-CH", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })
                            : "–"}
                        </td>
                        <td>
                          <button
                            className="deleteBtn"
                            onClick={() => loeschen(e.id)}
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
                ← Zurück zur Erfassung
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
