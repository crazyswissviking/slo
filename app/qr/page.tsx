import { headers } from "next/headers";
import QRCode from "qrcode";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function QrSeite() {
  const kopfzeilen = headers();
  const host = kopfzeilen.get("host") ?? "localhost:3000";
  const protokoll =
    kopfzeilen.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const url = `${protokoll}://${host}/registrieren`;

  const dataUrl = await QRCode.toDataURL(url, {
    width: 512,
    margin: 2,
    color: { dark: "#1a1a1e", light: "#ffffff" },
  });

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
        <p className="ticketSub">
          QR-Code für Flyer, Plakate oder Social Media – zum Ausdrucken oder
          Teilen.
        </p>
      </div>

      <div className="card" style={{ textAlign: "center" }}>
        <h2>Registrierungs-QR-Code</h2>
        <img
          src={dataUrl}
          alt="QR-Code zur Registrierung"
          style={{ width: 260, height: 260, margin: "0 auto 16px" }}
        />
        <p className="hinweis" style={{ wordBreak: "break-all" }}>{url}</p>
        <p className="hinweis" style={{ marginBottom: 16 }}>
          Wer den Code scannt, landet direkt im persönlichen
          Erfassungsformular – ganz ohne Anmeldung oder E-Mail-Versand. Der
          Link lässt sich als Lesezeichen speichern, um die Angaben später zu
          ergänzen.
        </p>
        <a className="primaryBtn" href={dataUrl} download="fcthun-registrierung-qr.png">
          Als PNG herunterladen
        </a>

        <div style={{ marginTop: 20 }}>
          <Link className="linkBtn" href="/">
            ← Zurück zur Startseite
          </Link>
        </div>
      </div>

      <footer className="footer">
        <span className="footerText">FC Thun · Fanverantwortung / SLO</span>
      </footer>
    </div>
  );
}
