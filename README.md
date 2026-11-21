# Group Station

Gestionale centrale del gruppo (Parquetti Group, Squadra, Pavimete, Livella…): KPI settimanali, organigramma, persone, scadenze, obiettivi, procedure, documenti.

- React + Vite. Database: progetto Supabase di Squadra, ma solo tabelle `gs_*` e bucket `gs-documenti` (nessuna tabella di Squadra).
- Vercel: importare questo repository così com'è (Vite viene riconosciuto da solo).
- Supabase › Authentication › URL Configuration › Redirect URLs: aggiungere l'indirizzo Vercel di Group Station.
- Logo: pallino rosso al centro, cerchio con tre pallini intorno (`public/logo.svg`).
