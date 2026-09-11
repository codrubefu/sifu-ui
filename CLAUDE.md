# erp-ui

Frontend React 19 + TypeScript + Vite pentru un ERP de sală de arte marțiale / club sportiv, multi-organizație (multi-tenant). Backend-ul (Laravel) este într-un repository separat, `sifu-api`.

## Documentație obligatorie de citit

Înainte de orice implementare sau explicație, citește:

- `docs/project-rules-agent.md` — regulile de implementare ale proiectului (convenții API client, permisiuni, UI, localizare, state, types). Sursă unică de adevăr.
- `docs/functionality-explainer-agent.md` — ce face UI-ul, ecran cu ecran, cu componentele/serviciile/endpoint-urile implicate. Sursă unică de adevăr pentru comportamentul existent.

Există un subagent dedicat în `.claude/agents/sifu-ui-dev.md` care încarcă aceste fișiere automat, atât pentru implementare/modificare de cod cât și pentru explicarea comportamentului existent (un singur agent — cele două roluri foloseau aceeași sursă de adevăr, nu are sens să pornești două).

**Task trivial → nu porni subagent.** Dacă schimbarea e evidentă dintr-o privire și atinge un singur fișier (sau câteva strâns legate) — editează direct, fără să pornești `sifu-ui-dev`. Un subagent pornește fără context și trebuie să recitească `docs/project-rules-agent.md` de la zero; pentru un task de o linie, costul ăsta depășește task-ul însuși. Dacă ai dubii dacă task-ul e chiar trivial, nu e trivial — folosește subagentul.

**Nu citi documentele mari în întregime pentru un task îngust.** Pentru "cum funcționează X" sau o schimbare pe un singur ecran, caută (grep) în `docs/functionality-explainer-agent.md` ecranul/funcționalitatea relevantă și citește doar acea secțiune. Citește tot fișierul doar pentru un audit pe tot repo-ul.

**Regulă obligatorie**: orice ecran nou/schimbat, workflow, contract de serviciu API, regulă de permisiune, rută sau namespace de localizare trebuie reflectat în `docs/functionality-explainer-agent.md` înainte de a considera task-ul terminat.

## Companion backend

Acest frontend are un repository backend Laravel însoțitor, `sifu-api`, care își ține propriile `docs/project-rules-agent.md` și `docs/functionality-explainer-agent.md`. Task-urile full-stack au de obicei nevoie de ambele repo-uri actualizate, backend întâi — dacă un endpoint necesar nu există încă, spune asta explicit în loc să-i ghicești contractul.

## Convenții esențiale

- **API calls**: `apiClient<T>()` (`src/api/apiCore.ts` / `apiClient.ts`) pentru toate request-urile JSON.
- **Permisiuni**: `useAuth()` / `Can` (`src/components/Can.tsx`), conform `src/permissions/permissions.ts`.
- **UI**: reutilizează `src/components/primitives/*` în loc de markup nou de nivel jos.
- **Localizare**: orice text vizibil nou merge în toate cele trei fișiere locale (`src/i18n/locales/ro.json`, `en.json`, `uk.json`).

Detaliile complete și checklist-ul de review sunt în `docs/project-rules-agent.md`.

## Comenzi de bază

```bash
npm run test    # tsc -b && eslint .
npm run build   # pentru schimbări de build config sau mai ample
```

Pentru orice altceva, vezi `docs/project-rules-agent.md`.
