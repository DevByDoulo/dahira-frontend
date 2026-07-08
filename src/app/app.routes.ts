import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { superAdminGuard } from './core/guards/super-admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'inscription',
    loadComponent: () =>
      import('./features/auth/inscription/inscription.component').then(
        (m) => m.InscriptionComponent,
      ),
  },
  {
    path: 'accepter-invitation',
    loadComponent: () =>
      import('./features/auth/accepter-invitation/accepter-invitation.component').then(
        (m) => m.AccepterInvitationComponent,
      ),
  },
  {
    path: 'mot-de-passe-oublie',
    loadComponent: () =>
      import('./features/auth/mot-de-passe-oublie/mot-de-passe-oublie.component').then(
        (m) => m.MotDePasseOublieComponent,
      ),
  },
  {
    path: 'nouveau-mot-de-passe',
    loadComponent: () =>
      import('./features/auth/nouveau-mot-de-passe/nouveau-mot-de-passe.component').then(
        (m) => m.NouveauMotDePasseComponent,
      ),
  },
  {
    path: 'super-admin',
    canActivate: [superAdminGuard],
    loadComponent: () =>
      import('./layout/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/super-admin/super-admin.component').then((m) => m.SuperAdminComponent),
      },
      {
        path: 'parametres',
        loadComponent: () =>
          import('./features/parametres/parametres.component').then((m) => m.ParametresComponent),
      },
      {
        path: 'profil',
        loadComponent: () =>
          import('./features/profil/profil.component').then((m) => m.ProfilComponent),
      },
    ],
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'membres',
        canActivate: [roleGuard],
        data: { roles: ['secretaire_general', 'adjoint'] },
        loadComponent: () =>
          import('./features/membres/membres.component').then((m) => m.MembresComponent),
      },
      {
        path: 'membres/ajouter',
        canActivate: [roleGuard],
        data: { roles: ['secretaire_general', 'adjoint'] },
        loadComponent: () =>
          import('./features/membres/ajouter-membre/ajouter-membre.component').then(
            (m) => m.AjouterMembreComponent,
          ),
      },
      {
        path: 'membres/invitations',
        canActivate: [roleGuard],
        data: { roles: ['secretaire_general', 'adjoint'] },
        loadComponent: () =>
          import('./features/invitation/invitation.component').then((m) => m.InvitationComponent),
      },
      // Page unique regroupant séances, cotisations, dépenses et trésorerie
      {
        path: 'gestion-financiere',
        loadComponent: () =>
          import('./features/gestion-financiere/gestion-financiere.component').then(
            (m) => m.GestionFinanciereComponent,
          ),
        children: [
          {
            path: 'seances',
            canActivate: [roleGuard],
            data: { roles: ['secretaire_general', 'adjoint', 'tresorier', 'responsable_org'] },
            loadComponent: () =>
              import('./features/seances/seances.component').then((m) => m.SeancesComponent),
          },
          {
            path: 'cotisations',
            canActivate: [roleGuard],
            data: { roles: ['secretaire_general', 'adjoint', 'tresorier'] },
            loadComponent: () =>
              import('./features/cotisations/cotisations.component').then(
                (m) => m.CotisationsComponent,
              ),
          },
          {
            path: 'depenses',
            canActivate: [roleGuard],
            data: { roles: ['secretaire_general', 'adjoint', 'tresorier'] },
            loadComponent: () =>
              import('./features/depenses/depenses.component').then((m) => m.DepensesComponent),
          },
          {
            path: 'tresorerie',
            canActivate: [roleGuard],
            data: { roles: ['secretaire_general', 'adjoint', 'tresorier'] },
            loadComponent: () =>
              import('./features/tresorerie/tresorerie.component').then(
                (m) => m.TresorerieComponent,
              ),
          },
          {
            path: 'mes-cotisations',
            canActivate: [roleGuard],
            data: { roles: ['membre'] },
            loadComponent: () =>
              import('./features/gestion-financiere/mes-cotisations/mes-cotisations.component').then(
                (m) => m.MesCotisationsComponent,
              ),
          },
        ],
      },
      // Anciennes URL conservées via redirection (liens internes, favoris)
      { path: 'seances', redirectTo: 'gestion-financiere/seances', pathMatch: 'full' },
      { path: 'cotisations', redirectTo: 'gestion-financiere/cotisations', pathMatch: 'full' },
      { path: 'depenses', redirectTo: 'gestion-financiere/depenses', pathMatch: 'full' },
      { path: 'tresorerie', redirectTo: 'gestion-financiere/tresorerie', pathMatch: 'full' },
      { path: 'invitation', redirectTo: 'membres/invitations', pathMatch: 'full' },
      {
        path: 'membres/:id',
        canActivate: [roleGuard],
        data: { roles: ['secretaire_general', 'adjoint'] },
        loadComponent: () =>
          import('./features/membres/detail-membre/detail-membre.component').then(
            (m) => m.DetailMembreComponent,
          ),
      },
      {
        path: 'membres/:id/modifier',
        canActivate: [roleGuard],
        data: { roles: ['secretaire_general', 'adjoint'] },
        loadComponent: () =>
          import('./features/membres/modifier-membre/modifier-membre.component').then(
            (m) => m.ModifierMembreComponent,
          ),
      },
      {
        path: 'seances/creer',
        canActivate: [roleGuard],
        data: { roles: ['secretaire_general', 'adjoint', 'responsable_org'] },
        loadComponent: () =>
          import('./features/seances/creer-seance/creer-seance.component').then(
            (m) => m.CreerSeanceComponent,
          ),
      },
      {
        path: 'seances/:id',
        canActivate: [roleGuard],
        data: { roles: ['secretaire_general', 'adjoint', 'tresorier', 'responsable_org'] },
        loadComponent: () =>
          import('./features/seances/detail-seance/detail-seance.component').then(
            (m) => m.DetailSeanceComponent,
          ),
      },
      {
        path: 'seances/:id/modifier',
        canActivate: [roleGuard],
        data: { roles: ['secretaire_general', 'adjoint', 'responsable_org'] },
        loadComponent: () =>
          import('./features/seances/modifier-seance/modifier-seance.component').then(
            (m) => m.ModifierSeanceComponent,
          ),
      },
      {
        path: 'cotisations/encaisser',
        canActivate: [roleGuard],
        data: { roles: ['secretaire_general', 'adjoint', 'tresorier'] },
        loadComponent: () =>
          import('./features/cotisations/encaisser/encaisser-cotisation.component').then(
            (m) => m.EncaisserCotisationComponent,
          ),
      },
      {
        path: 'cotisations/declarer',
        canActivate: [roleGuard],
        data: { roles: ['membre'] },
        loadComponent: () =>
          import('./features/cotisations/declarer/declarer-cotisation.component').then(
            (m) => m.DeclarerCotisationComponent,
          ),
      },
      {
        path: 'depenses/ajouter',
        canActivate: [roleGuard],
        data: { roles: ['secretaire_general', 'adjoint', 'tresorier'] },
        loadComponent: () =>
          import('./features/depenses/ajouter/ajouter-depense.component').then(
            (m) => m.AjouterDepenseComponent,
          ),
      },
      {
        path: 'depenses/:id/modifier',
        canActivate: [roleGuard],
        data: { roles: ['secretaire_general', 'adjoint', 'tresorier'] },
        loadComponent: () =>
          import('./features/depenses/modifier/modifier-depense.component').then(
            (m) => m.ModifierDepenseComponent,
          ),
      },
      {
        path: 'profil',
        loadComponent: () =>
          import('./features/profil/profil.component').then((m) => m.ProfilComponent),
      },
      {
        path: 'parametres',
        canActivate: [roleGuard],
        data: { roles: ['secretaire_general', 'adjoint'] },
        loadComponent: () =>
          import('./features/parametres/parametres.component').then((m) => m.ParametresComponent),
      },
      // Autres routes protégées à ajouter ici
    ],
  },
  { path: '**', redirectTo: 'login' },
];
