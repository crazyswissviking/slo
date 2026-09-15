"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Formular = {
  name: string;
  vorname: string;
  adresse: string;
  plz: string;
  ort: string;
  tel: string;
  email: string;
};

const LEER: Formular = {
  name: "",
  vorname: "",
  adresse: "",
  plz: "",
  ort: "",
  tel: "",
  email: "",
};

type Ladezustand = "laedt" | "bereit" | "ungueltig";

export default function Erfassen() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [zustand, setZustand] = useState<Ladezustand>("laedt");
  const [formular, setFormular] = useState<Formular>(LEER);
  const [code, setCode] = useState("");
  const [fehler, setFehler] = useState<Partial<Record<keyof Formular, string>>>(
    {}
  );
  const [speichert, setSpeichert] = useState(false);
  const [speicherFehler, setSpeicherFehler] = useState("");
  const [gespeichert, setGespeichert] = useState(false);

  useEffect(() => {
    fetch(`/api/personen/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          setZustand("ungueltig");
          return;
        }
        const data = await res.json();
        const p = data.person;
        setFormular({
          name: p.name ?? "",
          vorname: p.vorname ?? "",
          adresse: p.adresse ?? "",
          plz: p.plz ?? "",
          ort: p.ort ?? "",
          tel: p.tel ?? "",
          email: p.email ?? "",
        });
        setCode(p.code ?? "");
        setZustand("bereit");
      })
      .catch(() => setZustand("ungueltig"));
  }, [token]);

  const feldSetzen = (feld: keyof Formular, wert: string) => {
    setFormular((alt) => ({ ...alt, [feld]: wert }));
  };

  const validiere = (): boolean => {
    const f: Partial<Record<keyof Formular, string>> = {};
    if (!formular.name.trim()) f.name = "Bitte Name angeben.";
    if (!formular.vorname.trim()) f.vorname = "Bitte Vorname angeben.";
    if (!formular.adresse.trim()) f.adresse = "Bitte Adresse angeben.";
    if (!formular.plz.trim()) f.plz = "Bitte PLZ angeben.";
    if (!formular.ort.trim()) f.ort = "Bitte Ort angeben.";
    if (!formular.tel.trim()) f.tel = "Bitte Telefonnummer angeben.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formular.email.trim())) {
      f.email = "Bitte eine gültige E-Mail-Adresse angeben.";
    }
    setFehler(f);
    return Object.keys(f).length === 0;
  };

  const speichern = async () => {
    if (!validiere()) return;
    setSpeichert(true);
    setSpeicherFehler("");
    try {
      const res = await fetch(`/api/personen/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formular),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Speichern fehlgeschlagen.");
      }
      setCode(data.code ?? code);
      setGespeichert(true);
    } catch (e) {
      setSpeicherFehler(
        e instanceof Error ? e.message : "Speichern fehlgeschlagen."
      );
    } finally {
      setSpeichert(false);
    }
  };

  if (zustand === "laedt") {
    return (
      <div className="page">
        <div className="card">
          <p className="hinweis">Wird geladen …</p>
        </div>
      </div>
    );
  }

  if (zustand === "ungueltig") {
    return (
      <div className="page">
        <div className="card">
          <h2>Link ungültig</h2>
          <p className="hinweis">
            Dieser Erfassungslink ist nicht (mehr) gültig. Bitte fordere auf
            der Startseite einen neuen Link an.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="ticket">
        <div className="ticketTop">
          <div>
            <div className="eyebrow">UEFA · Auswärtsfahrten</div>
            <h1>FC THUN</h1>
          </div>
          <div className="ticketStub">
            <span className="stubLabel">Erfassung</span>
            <span className="stubValue">Zuhause</span>
          </div>
        </div>
        <div className="perforation" />
        <p className="ticketSub">
          Bitte erfasse deine Angaben. Vor Ort bestimmst du dann nur noch, für
          welche Spiele und wie viele Tickets du möchtest.
        </p>
      </div>

      {gespeichert ? (
        <div className="card">
          <h2>Danke, deine Angaben sind gespeichert.</h2>
          <p className="hinweis">
            Dein persönlicher Code für die Ticketausgabe vor Ort:
          </p>
          <p
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "0.08em",
              margin: "8px 0 16px",
            }}
          >
            {code}
          </p>
          <p className="hinweis">
            Zeig diesen Code (oder die E-Mail mit dem Link) dem SLO vor Ort –
            dort werden nur noch die gewünschte Anzahl Tickets pro Spiel und
            der Betrag erfasst.
          </p>
        </div>
      ) : (
        <div className="card">
          <h2>Angaben erfassen</h2>

          <div className="feld">
            <label htmlFor="vorname">Vorname</label>
            <input
              id="vorname"
              className="input"
              type="text"
              value={formular.vorname}
              onChange={(e) => feldSetzen("vorname", e.target.value)}
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
              value={formular.name}
              onChange={(e) => feldSetzen("name", e.target.value)}
              autoComplete="family-name"
            />
            {fehler.name && <div className="fehlerText">{fehler.name}</div>}
          </div>

          <div className="feld">
            <label htmlFor="adresse">Adresse</label>
            <input
              id="adresse"
              className="input"
              type="text"
              value={formular.adresse}
              onChange={(e) => feldSetzen("adresse", e.target.value)}
              placeholder="Strasse und Hausnummer"
              autoComplete="street-address"
            />
            {fehler.adresse && <div className="fehlerText">{fehler.adresse}</div>}
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div className="feld" style={{ flex: "0 0 110px" }}>
              <label htmlFor="plz">PLZ</label>
              <input
                id="plz"
                className="input"
                type="text"
                inputMode="numeric"
                value={formular.plz}
                onChange={(e) => feldSetzen("plz", e.target.value)}
                autoComplete="postal-code"
              />
              {fehler.plz && <div className="fehlerText">{fehler.plz}</div>}
            </div>
            <div className="feld" style={{ flex: 1 }}>
              <label htmlFor="ort">Ort</label>
              <input
                id="ort"
                className="input"
                type="text"
                value={formular.ort}
                onChange={(e) => feldSetzen("ort", e.target.value)}
                autoComplete="address-level2"
              />
              {fehler.ort && <div className="fehlerText">{fehler.ort}</div>}
            </div>
          </div>

          <div className="feld">
            <label htmlFor="tel">Telefon</label>
            <input
              id="tel"
              className="input"
              type="tel"
              value={formular.tel}
              onChange={(e) => feldSetzen("tel", e.target.value)}
              placeholder="z. B. 079 123 45 67"
              autoComplete="tel"
            />
            {fehler.tel && <div className="fehlerText">{fehler.tel}</div>}
          </div>

          <div className="feld">
            <label htmlFor="email">E-Mail</label>
            <input
              id="email"
              className="input"
              type="email"
              value={formular.email}
              onChange={(e) => feldSetzen("email", e.target.value)}
              autoComplete="email"
            />
            {fehler.email && <div className="fehlerText">{fehler.email}</div>}
          </div>

          {speicherFehler && <div className="fehlerBox">{speicherFehler}</div>}

          <div className="buttonZeile">
            <button
              className="primaryBtn"
              onClick={speichern}
              disabled={speichert}
            >
              {speichert ? "Wird gespeichert …" : "Angaben speichern"}
            </button>
          </div>
        </div>
      )}

      <footer className="footer">
        <span className="footerText">FC Thun · Fanverantwortung / SLO</span>
      </footer>
    </div>
  );
}
