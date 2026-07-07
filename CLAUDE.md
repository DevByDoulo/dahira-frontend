# Dahira App - Contexte projet

## Langue
Réponds TOUJOURS en français, sans exception.

## Projet
Application Angular 21 + Tailwind v4 de gestion pour une association religieuse sénégalaise (dahira).
Backend : Node.js/Express/MySQL sur le port 3000.
Architecture multi-tenant via dahira_id.

Périmètre volontairement réduit (juillet 2026) : annonces, événements, notifications in-app,
galerie photos, reçus PDF et recherche globale ont été supprimés pour recentrer l'app sur
la gestion des cotisations (code récupérable dans l'historique git).

## Stack
- Frontend : Angular 21 standalone, Tailwind v4, Material Symbols Outlined
- Backend : Node.js/Express/MySQL (port 3000)
- Auth : JWT stocké en localStorage

## Conventions
- Composants standalone uniquement, pas de NgModule
- Pattern ApiResponse<T> avec { success, data }
- dahira_id toujours extrait du JWT côté serveur, jamais du client

## Commandes

```bash
npm start          # dev server à http://localhost:4200 (ng serve)
npm run build      # build production → dist/
npm run watch      # build incrémental (watch mode)
npm test           # tests unitaires via Angular CLI + Vitest
```

Test fichier unique : `ng test --include="**/auth.service.spec.ts"`

Générer un composant : `ng generate component features/<feature>/<name>/<name>`

## Architecture

### Composants standalone Angular 21
Pas de NgModule. Bootstrap via `src/main.ts` → `bootstrapApplication(AppComponent, appConfig)`. Providers globaux dans `src/app/app.config.ts`.

### Convention de dossiers
```
src/app/
  core/
    services/        # services singleton (auth, etc.)
    guards/          # auth.guard.ts (CanActivateFn)
    interceptors/    # auth.interceptor.ts (HttpInterceptorFn)
  features/
    auth/login/      # LoginComponent
    dashboard/
    membres/
    seances/
    cotisations/
    depenses/
    tresorerie/
    invitation/
    parametres/
    profil/
    super-admin/
  layout/
    main-layout/     # shell après login (sidebar + navbar)
  shared/
    components/      # composants présentationnels réutilisables
    models/          # interfaces/types TypeScript partagés
```

Nouvelles features → `features/<domaine>/<feature>/`. Singletons → `core/services/`.

### Routing
Routes dans `src/app/app.routes.ts`. Routes protégées regroupées sous `canActivate: [authGuard]`.

### Auth flow
- `AuthService` (`core/services/auth.service.ts`) : POST `/api/auth/login`, stocke `token` + `user` en localStorage
- `authInterceptor` (`core/interceptors/`) : injecte `Authorization: Bearer <token>` sur chaque requête HTTP
- `authGuard` (`core/guards/`) : redirige vers `/login` si pas de token

### Styling
- **Tailwind CSS v4** via `@tailwindcss/postcss` (`.postcssrc.json`)
- Tokens de design (palette Material Design 3) dans `src/styles.css` sous `@theme {}`
- Google Fonts : Inter (texte) + Material Symbols Outlined (icônes)

### TypeScript
Mode strict complet (`strict`, `strictTemplates`, `strictInjectionParameters`). Vérifier avec `npx tsc --noEmit`.

### Formatage
Prettier (`.prettierrc`) : `printWidth: 100`, `singleQuote: true`, `parser: angular` pour HTML. Lancer `npx prettier --write .` avant commit.
