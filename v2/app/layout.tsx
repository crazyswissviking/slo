import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FC Thun – Auswärtsfahrt UEFA",
  description:
    "Teilnehmererfassung für die Auswärtsfahrten der UEFA-Spiele des FC Thun.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de-CH">
      <body>{children}</body>
    </html>
  );
}
