import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, UserProfile } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { ToastComponent } from '../../shared/components/toast/toast.component';
import { environment } from '../../../environments/environment';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[]; // undefined = visible par tous les rôles
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive, ToastComponent],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  user: ReturnType<AuthService['getUser']> = null;
  profile: UserProfile | null = null;
  private profileSub?: Subscription;

  sidebarOpen = false;
  showLogoutConfirm = false;

  readonly navItems: NavItem[] = [
    // Tous les rôles tenant
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    // Séances, cotisations, dépenses et trésorerie regroupées (onglets filtrés par rôle)
    { label: 'Gestion financière', icon: 'account_balance', route: '/gestion-financiere' },
    // Admin uniquement — inclut les invitations
    {
      label: 'Membres',
      icon: 'group',
      route: '/membres',
      roles: ['secretaire_general', 'adjoint'],
    },
  ];

  readonly superAdminNavItems: NavItem[] = [
    { label: 'Tableau de bord', icon: 'admin_panel_settings', route: '/super-admin' },
    { label: 'Paramètres', icon: 'settings', route: '/super-admin/parametres' },
  ];

  get isSuperAdmin(): boolean {
    return (this.profile?.role ?? this.user?.role) === 'super_admin';
  }

  get visibleNavItems(): NavItem[] {
    if (this.isSuperAdmin) return this.superAdminNavItems;
    const role = (this.profile?.role ?? this.user?.role ?? '') as string;
    return this.navItems.filter((item) => !item.roles || item.roles.includes(role));
  }

  readonly backendUrl = environment.backendUrl;

  constructor(
    private authService: AuthService,
    private router: Router,
    public themeService: ThemeService,
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.profileSub = this.authService.profile$.subscribe((p) => {
      this.profile = p;
    });
    if (!this.profile) {
      this.authService.getMe().subscribe();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.sidebarOpen = false;
  }

  ngOnDestroy(): void {
    this.profileSub?.unsubscribe();
  }

  logout(): void {
    this.showLogoutConfirm = true;
  }

  confirmLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  get avatarSrc(): string | null {
    const url = this.profile?.photo_url;
    if (!url) return null;
    return url.startsWith('http') ? url : `${this.backendUrl}${url}`;
  }

  get userFullName(): string {
    if (this.profile) return this.profile.nom;
    if (!this.user) return '';
    return `${this.user.prenom ?? ''} ${this.user.nom ?? ''}`.trim();
  }

  get userInitials(): string {
    const name = this.profile?.nom ?? `${this.user?.prenom ?? ''} ${this.user?.nom ?? ''}`;
    return (
      name
        .trim()
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || '?'
    );
  }

  get userRole(): string {
    return (this.profile?.role ?? this.user?.role ?? '') as string;
  }

  get isBureau(): boolean {
    const role = this.profile?.role ?? this.user?.role;
    return role === 'secretaire_general' || role === 'adjoint';
  }

  get roleLabelSidebar(): string {
    const role = (this.profile?.role ?? this.user?.role ?? '') as string;
    const labels: Record<string, string> = {
      super_admin: 'Super Administrateur',
      secretaire_general: 'Secrétaire Général',
      adjoint: 'Adjoint',
      tresorier: 'Trésorier',
      responsable_org: 'Communicateur',
      membre: 'Membre',
    };
    return labels[role] ?? role;
  }
}
