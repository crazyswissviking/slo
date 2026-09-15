import Link from "next/link";

export default function Start() {
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
        <h2>Jetzt registrieren</h2>
        <p className="hinweis" style={{ marginTop: -8, marginBottom: 16 }}>
          Erfasse deine Angaben bequem selbst. Vor Ort bestimmst du dann nur
          noch die Anzahl Tickets pro Spiel.
        </p>
        <div className="buttonZeile" style={{ justifyContent: "flex-start" }}>
          <Link className="primaryBtn" href="/registrieren">
            Angaben erfassen
          </Link>
        </div>
      </div>

      <div className="card">
        <h2>Für den SLO</h2>
        <p className="hinweis" style={{ marginTop: -8, marginBottom: 16 }}>
          QR-Code für Flyer/Plakate; Ticketausgabe und Verwaltung sind
          passwortgeschützt.
        </p>
        <div className="buttonZeile" style={{ justifyContent: "flex-start" }}>
          <Link className="secondaryBtn" href="/qr">
            QR-Code
          </Link>
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
