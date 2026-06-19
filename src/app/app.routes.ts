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
      // Autres routes protégées à ajouter ici : seances, cotisations, etc.
    ],
  },
  { path: '**', redirectTo: 'login' },
];
