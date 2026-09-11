# Sifu UI

## Dezvoltare locală pe sifu.local fără port în URL

Vite acceptă `sifu.local` și subdomeniile sale. Fișierul `Caddyfile` trimite
cererile HTTP pentru `sifu.local` și `*.sifu.local` către `127.0.0.1:5173`,
inclusiv conexiunile WebSocket pentru actualizarea automată a paginii.
Wildcard-ul proxy-ului acoperă un nivel, de exemplu `firma1.sifu.local`.

Cu Caddy instalat și portul 80 liber, rulează în două terminale din proiect:

```bash
npm run dev
```

```bash
sudo caddy run --config ./Caddyfile
```

Deschide `http://sifu.local` sau `http://firma1.sifu.local`.
Ambele procese trebuie să rămână pornite.

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

Pornește serverul cu `npm run dev`, apoi accesează `http://sifu.demo:5173`.
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

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
