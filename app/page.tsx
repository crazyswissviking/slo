"use client";

import { useState } from "react";
import Link from "next/link";

export default function Start() {
  const [email, setEmail] = useState("");
  const [sendet, setSendet] = useState(false);
  const [fehler, setFehler] = useState("");
  const [gesendet, setGesendet] = useState(false);

  const linkAnfordern = async () => {
    setFehler("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFehler("Bitte eine gültige E-Mail-Adresse angeben.");
      return;
    }
    setSendet(true);
    try {
      const res = await fetch("/api/registrierung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Senden fehlgeschlagen.");
      setGesendet(true);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Senden fehlgeschlagen.");
    } finally {
      setSendet(false);
    }
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
            <span className="stubLabel">Sektor</span>
            <span className="stubValue">Gäste</span>
          </div>
        </div>
        <div className="perforation" />
        <p className="ticketSub">
          Registrierung für die UEFA-Auswärtsfahrten. Nur wer erfasst ist,
          kann vor Ort Tickets lösen.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2>Zuhause registrieren</h2>
        {gesendet ? (
          <p className="hinweis">
            Der Link zur Erfassung wurde an <strong>{email.trim()}</strong>{" "}
            verschickt. Bitte öffne ihn dort und trage deine Angaben ein.
          </p>
        ) : (
          <>
            <p className="hinweis" style={{ marginTop: -8, marginBottom: 16 }}>
              Trag deine E-Mail-Adresse ein – wir schicken dir einen Link, mit
              dem du deine Angaben bequem von zuhause aus erfassen kannst.
              Vor Ort bestimmst du dann nur noch die Anzahl Tickets pro Spiel.
            </p>
            <div className="feld">
              <label htmlFor="email">E-Mail</label>
              <input
                id="email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && linkAnfordern()}
                placeholder="name@beispiel.ch"
                autoComplete="email"
              />
              {fehler && <div className="fehlerText">{fehler}</div>}
            </div>
            <div className="buttonZeile">
              <button
                className="primaryBtn"
                onClick={linkAnfordern}
                disabled={sendet}
              >
                {sendet ? "Wird gesendet …" : "Link zusenden"}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h2>Für den SLO</h2>
        <p className="hinweis" style={{ marginTop: -8, marginBottom: 16 }}>
          Ticketausgabe und Verwaltung sind passwortgeschützt.
        </p>
        <div className="buttonZeile" style={{ justifyContent: "flex-start" }}>
          <Link className="secondaryBtn" href="/vor-ort">
            Vor-Ort-Erfassung
          </Link>
          <Link className="secondaryBtn" href="/verwaltung">
            Verwaltung
          </Link>
        </div>
      </div>

      <footer className="footer">
        <span className="footerText">FC Thun · Fanverantwortung / SLO</span>
      </footer>
    </div>
  );
}
