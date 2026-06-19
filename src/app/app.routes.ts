import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: '',
    loadComponent: () =>
      import('./layout/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'membres',
        loadComponent: () =>
          import('./features/membres/membres.component').then(m => m.MembresComponent),
      },
      {
        path: 'membres/ajouter',
        loadComponent: () =>
          import('./features/membres/ajouter-membre/ajouter-membre.component').then(
            m => m.AjouterMembreComponent,
          ),
      },
      {
        path: 'seances',
        loadComponent: () =>
          import('./features/seances/seances.component').then(m => m.SeancesComponent),
      },
      {
        path: 'membres/:id/modifier',
        loadComponent: () =>
          import('./features/membres/modifier-membre/modifier-membre.component').then(
            m => m.ModifierMembreComponent,
          ),
      },
      {
        path: 'seances/creer',
        loadComponent: () =>
          import('./features/seances/creer-seance/creer-seance.component').then(m => m.CreerSeanceComponent),
      },
      {
        path: 'seances/:id/modifier',
        loadComponent: () =>
          import('./features/seances/modifier-seance/modifier-seance.component').then(
            m => m.ModifierSeanceComponent,
          ),
      },
      {
        path: 'cotisations',
        loadComponent: () =>
          import('./features/cotisations/cotisations.component').then(m => m.CotisationsComponent),
      },
      {
        path: 'cotisations/encaisser',
        loadComponent: () =>
          import('./features/cotisations/encaisser/encaisser-cotisation.component').then(
            m => m.EncaisserCotisationComponent,
          ),
      },
      // Autres routes protégées à ajouter ici
    ],
  },
  { path: '**', redirectTo: 'login' },
];
