// Gemeinsame Typen für Personen, Spiele und Tickets.

export type Spiel = {
  id: string;
  gegner: string;
  heimteam: string;
  datum: string; // ISO-Timestamp
  preis_pro_ticket: number | null;
  reihenfolge: number;
};

export type Person = {
  id: string;
  token: string;
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
};

export type Ticket = {
  id: string;
  person_id: string;
  spiel_id: string;
  anzahl: number;
  betrag: number;
  bezahlt: boolean;
  bezahlt_am: string | null;
};

// Personendaten, wie sie über das öffentliche Erfassungsformular
// eingegeben/geändert werden dürfen.
export type PersonenEingabe = {
  name: string;
  vorname: string;
  adresse: string;
  plz: string;
  ort: string;
  tel: string;
  email: string;
};
