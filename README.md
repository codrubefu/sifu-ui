# Sifu UI

React 19 + TypeScript ERP for sports clubs, backed by the companion Laravel
`sifu-api` repository. Install locked dependencies with `npm ci`.

Agent navigation: [AGENTS.md](AGENTS.md) · [Task guide](docs/AI_GUIDE.md).
Run `npm test` for TypeScript + ESLint (no behavioral test suite is installed),
`npm run typecheck` for types only, and `npm run build` for production output.


## Dezvoltare locală pe sifu.local fără port în URL

Vite acceptă `sifu.local` și subdomeniile sale. Fișierul `Caddyfile` trimite
cererile HTTP pentru `sifu.local` și `*.sifu.local` către `127.0.0.1:5173`,
inclusiv conexiunile WebSocket pentru actualizarea automată a paginii.
Wildcard-ul proxy-ului acoperă un nivel, de exemplu `firma1.sifu.local`.

Cu Caddy instalat și portul 80 liber, rulează din proiect (scriptul cere sudo
și pornește atât Caddy, cât și Vite):

```bash
npm run dev
```

Deschide `http://sifu.local` sau `http://firma1.sifu.local`.
Comanda menține ambele procese pornite și le oprește împreună.

Numele trebuie configurate pe sistemul unde rulează browserul. Pentru nume
explicite, adaugă în `/etc/hosts` (Linux) sau
`C:\Windows\System32\drivers\etc\hosts` (Windows, ca administrator):

```text
127.0.0.1 sifu.local firma1.sifu.local firma2.sifu.local
```

`hosts` nu acceptă wildcard-uri. Pentru subdomenii arbitrare este necesar un
resolver DNS local configurat pentru întreaga zonă `sifu.local`. Dacă browserul
rulează în Windows și aplicația în WSL, configurația DNS trebuie aplicată în
Windows; modificarea `/etc/hosts` din WSL nu configurează browserul din Windows.

## Dezvoltare locală pe sifu.demo

Pornește doar Vite, fără Caddy/sudo, cu `npm run dev:vite`, apoi accesează `http://sifu.demo:5173`.
Vite ascultă pe toate interfețele, pe portul fix 5173, și acceptă domeniul
`sifu.demo` și toate subdomeniile sale (de exemplu `firma1.sifu.demo`).
Dacă portul este ocupat, comanda se oprește fără să aleagă alt port.

Domeniile trebuie să rezolve către calculatorul pe care rulează serverul.
Pentru browserul de pe același calculator, adaugă în fișierul `hosts`:

```text
127.0.0.1 sifu.demo firma1.sifu.demo firma2.sifu.demo
```

Pe Windows, fișierul este `C:\Windows\System32\drivers\etc\hosts` și se editează
cu drepturi de administrator; pe Linux este `/etc/hosts`. Dacă Vite rulează în
WSL și browserul în Windows, configurează fișierul din Windows.

Fișierul `hosts` cere fiecare nume explicit și nu acceptă wildcard.
Pentru subdomenii arbitrare, configurează un resolver DNS local cu o regulă
pentru `sifu.demo` și `*.sifu.demo` către IP-ul serverului. De exemplu, într-un
resolver dnsmasq utilizat de sistemul browserului: `address=/sifu.demo/127.0.0.1`.

Pentru URL-uri fără `:5173`, este necesar un reverse proxy pe portul 80 către
Vite, cu suport WebSocket pentru HMR și rutare pentru domeniu și subdomenii.

Configurația folosește [opțiunile serverului Vite](https://vite.dev/config/server-options.html#server-allowedhosts).
