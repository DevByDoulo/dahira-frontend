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
      import('./features/auth/inscription/inscription.component').then(m => m.InscriptionComponent),
  },
  {
    path: 'accepter-invitation',
    loadComponent: () =>
      import('./features/auth/accepter-invitation/accepter-invitation.component').then(
        m => m.AccepterInvitationComponent,
      ),
  },
  {
    path: 'mot-de-passe-oublie',
    loadComponent: () =>
      import('./features/auth/mot-de-passe-oublie/mot-de-passe-oublie.component').then(
        m => m.MotDePasseOublieComponent,
      ),
  },
  {
    path: 'nouveau-mot-de-passe',
    loadComponent: () =>
      import('./features/auth/nouveau-mot-de-passe/nouveau-mot-de-passe.component').then(
        m => m.NouveauMotDePasseComponent,
      ),
  },
  {
    path: 'super-admin',
    canActivate: [superAdminGuard],
    loadComponent: () =>
      import('./layout/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/super-admin/super-admin.component').then(m => m.SuperAdminComponent),
      },
      {
        path: 'parametres',
        loadComponent: () =>
          import('./features/parametres/parametres.component').then(m => m.ParametresComponent),
      },
      {
        path: 'profil',
        loadComponent: () =>
          import('./features/profil/profil.component').then(m => m.ProfilComponent),
      },
    ],
  },
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
        canActivate: [roleGuard],
        data: { roles: ['bureau'] },
        loadComponent: () =>
          import('./features/membres/membres.component').then(m => m.MembresComponent),
      },
      {
        path: 'membres/ajouter',
        canActivate: [roleGuard],
        data: { roles: ['bureau'] },
        loadComponent: () =>
          import('./features/membres/ajouter-membre/ajouter-membre.component').then(
            m => m.AjouterMembreComponent,
          ),
      },
      {
        path: 'seances',
        canActivate: [roleGuard],
        data: { roles: ['bureau', 'tresorier', 'responsable_org'] },
        loadComponent: () =>
          import('./features/seances/seances.component').then(m => m.SeancesComponent),
      },
      {
        path: 'membres/:id',
        canActivate: [roleGuard],
        data: { roles: ['bureau'] },
        loadComponent: () =>
          import('./features/membres/detail-membre/detail-membre.component').then(
            m => m.DetailMembreComponent,
          ),
      },
      {
        path: 'membres/:id/modifier',
        canActivate: [roleGuard],
        data: { roles: ['bureau'] },
        loadComponent: () =>
          import('./features/membres/modifier-membre/modifier-membre.component').then(
            m => m.ModifierMembreComponent,
          ),
      },
      {
        path: 'seances/creer',
        canActivate: [roleGuard],
        data: { roles: ['bureau', 'responsable_org'] },
        loadComponent: () =>
          import('./features/seances/creer-seance/creer-seance.component').then(m => m.CreerSeanceComponent),
      },
      {
        path: 'seances/:id',
        canActivate: [roleGuard],
        data: { roles: ['bureau', 'tresorier', 'responsable_org'] },
        loadComponent: () =>
          import('./features/seances/detail-seance/detail-seance.component').then(m => m.DetailSeanceComponent),
      },
      {
        path: 'seances/:id/modifier',
        canActivate: [roleGuard],
        data: { roles: ['bureau', 'responsable_org'] },
        loadComponent: () =>
          import('./features/seances/modifier-seance/modifier-seance.component').then(
            m => m.ModifierSeanceComponent,
          ),
      },
      {
        path: 'cotisations',
        canActivate: [roleGuard],
        data: { roles: ['bureau', 'tresorier'] },
        loadComponent: () =>
          import('./features/cotisations/cotisations.component').then(m => m.CotisationsComponent),
      },
      {
        path: 'recus',
        canActivate: [roleGuard],
        data: { roles: ['bureau', 'tresorier'] },
        loadComponent: () =>
          import('./features/cotisations/recus/recus.component').then(m => m.RecusComponent),
      },
      {
        path: 'mes-recus',
        canActivate: [roleGuard],
        data: { roles: ['membre'] },
        loadComponent: () =>
          import('./features/cotisations/mes-recus/mes-recus.component').then(
            m => m.MesRecusComponent,
          ),
      },
      {
        path: 'cotisations/encaisser',
        canActivate: [roleGuard],
        data: { roles: ['bureau', 'tresorier'] },
        loadComponent: () =>
          import('./features/cotisations/encaisser/encaisser-cotisation.component').then(
            m => m.EncaisserCotisationComponent,
          ),
      },
      {
        path: 'cotisations/declarer',
        canActivate: [roleGuard],
        data: { roles: ['membre'] },
        loadComponent: () =>
          import('./features/cotisations/declarer/declarer-cotisation.component').then(
            m => m.DeclarerCotisationComponent,
          ),
      },
      {
        path: 'depenses',
        canActivate: [roleGuard],
        data: { roles: ['bureau', 'tresorier'] },
        loadComponent: () =>
          import('./features/depenses/depenses.component').then(m => m.DepensesComponent),
      },
      {
        path: 'depenses/ajouter',
        canActivate: [roleGuard],
        data: { roles: ['bureau', 'tresorier'] },
        loadComponent: () =>
          import('./features/depenses/ajouter/ajouter-depense.component').then(
            m => m.AjouterDepenseComponent,
          ),
      },
      {
        path: 'depenses/:id/modifier',
        canActivate: [roleGuard],
        data: { roles: ['bureau', 'tresorier'] },
        loadComponent: () =>
          import('./features/depenses/modifier/modifier-depense.component').then(
            m => m.ModifierDepenseComponent,
          ),
      },
      {
        path: 'tresorerie',
        canActivate: [roleGuard],
        data: { roles: ['bureau', 'tresorier'] },
        loadComponent: () =>
          import('./features/tresorerie/tresorerie.component').then(m => m.TresorerieComponent),
      },
      {
        path: 'annonces',
        loadComponent: () =>
          import('./features/annonces/annonces.component').then(m => m.AnnoncesComponent),
      },
      {
        path: 'annonces/creer',
        canActivate: [roleGuard],
        data: { roles: ['bureau', 'responsable_org'] },
        loadComponent: () =>
          import('./features/annonces/creer-annonce/creer-annonce.component').then(
            m => m.CreerAnnonceComponent,
          ),
      },
      {
        path: 'annonces/:id/modifier',
        canActivate: [roleGuard],
        data: { roles: ['bureau', 'responsable_org'] },
        loadComponent: () =>
          import('./features/annonces/modifier-annonce/modifier-annonce.component').then(
            m => m.ModifierAnnonceComponent,
          ),
      },
      {
        path: 'evenements',
        loadComponent: () =>
          import('./features/evenements/evenements.component').then(m => m.EvenementsComponent),
      },
      {
        path: 'evenements/creer',
        canActivate: [roleGuard],
        data: { roles: ['bureau', 'responsable_org'] },
        loadComponent: () =>
          import('./features/evenements/creer-evenement/creer-evenement.component').then(
            m => m.CreerEvenementComponent,
          ),
      },
      {
        path: 'evenements/:id/modifier',
        canActivate: [roleGuard],
        data: { roles: ['bureau', 'responsable_org'] },
        loadComponent: () =>
          import('./features/evenements/modifier-evenement/modifier-evenement.component').then(
            m => m.ModifierEvenementComponent,
          ),
      },
      {
        path: 'evenements/:id',
        loadComponent: () =>
          import('./features/evenements/detail-evenement/detail-evenement.component').then(
            m => m.DetailEvenementComponent,
          ),
      },
      {
        path: 'profil',
        loadComponent: () =>
          import('./features/profil/profil.component').then(m => m.ProfilComponent),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/notifications/notifications.component').then(
            m => m.NotificationsComponent,
          ),
      },
      {
        path: 'photos/ajouter',
        canActivate: [roleGuard],
        data: { roles: ['bureau'] },
        loadComponent: () =>
          import('./features/photos/ajouter-photo/ajouter-photo.component').then(
            m => m.AjouterPhotoComponent,
          ),
      },
      {
        path: 'photos',
        loadComponent: () =>
          import('./features/photos/photos.component').then(m => m.PhotosComponent),
      },
      {
        path: 'parametres',
        loadComponent: () =>
          import('./features/parametres/parametres.component').then(m => m.ParametresComponent),
      },
      {
        path: 'invitation',
        loadComponent: () =>
          import('./features/invitation/invitation.component').then(m => m.InvitationComponent),
      },
      // Autres routes protégées à ajouter ici
    ],
  },
  { path: '**', redirectTo: 'login' },
];
