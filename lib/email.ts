import { Resend } from "resend";

// Verschickt den Erfassungslink per E-Mail (Resend). Wirft einen Fehler,
// wenn die Umgebungsvariablen fehlen oder der Versand fehlschlägt – das
// wird von der aufrufenden API-Route abgefangen.
export async function sendeErfassungsLink(params: {
  an: string;
  link: string;
  code: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const absender = process.env.EMAIL_FROM;
  if (!apiKey || !absender) {
    throw new Error(
      "RESEND_API_KEY oder EMAIL_FROM fehlt in den Umgebungsvariablen."
    );
  }

  const resend = new Resend(apiKey);
  const { an, link, code } = params;

  const { error } = await resend.emails.send({
    from: absender,
    to: an,
    subject: "FC Thun UEFA-Auswärtsfahrten – deine Registrierung",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1e;">
        <div style="background:#c8102e; color:#fff; border-radius:10px; padding:20px 22px; margin-bottom:20px;">
          <div style="font-size:11px; letter-spacing:0.14em; text-transform:uppercase; opacity:0.85;">UEFA · Auswärtsfahrten</div>
          <h1 style="margin:6px 0 0; font-size:24px;">FC THUN</h1>
        </div>
        <p>Hallo,</p>
        <p>bitte erfasse deine Angaben für die UEFA-Auswärtsfahrten über den folgenden Link:</p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="background:#c8102e; color:#fff; text-decoration:none; padding:12px 20px; border-radius:7px; font-weight:600; display:inline-block;">
            Angaben jetzt erfassen
          </a>
        </p>
        <p>Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
          <a href="${link}">${link}</a>
        </p>
        <p>Dein persönlicher Code für die Ticketausgabe vor Ort lautet:</p>
        <p style="font-size:22px; font-weight:700; letter-spacing:0.08em;">${code}</p>
        <p style="color:#5e5e66; font-size:13px;">
          Notiere dir diesen Code oder halte diese E-Mail bereit – der SLO
          braucht ihn vor Ort, um dir die gewünschte Anzahl Tickets
          zuzuweisen.
        </p>
        <p style="color:#5e5e66; font-size:12px; margin-top:32px;">FC Thun · Fanverantwortung / SLO</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Resend-Fehler: ${error.message}`);
  }
}
