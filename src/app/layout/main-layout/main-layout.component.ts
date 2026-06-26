import { Component, OnInit, OnDestroy, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, UserProfile } from '../../core/services/auth.service';
import { NotificationsService } from '../../core/services/notifications.service';
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
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ToastComponent],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  user: ReturnType<AuthService['getUser']> = null;
  profile: UserProfile | null = null;
  private profileSub?: Subscription;

  sidebarOpen = false;
  unreadCount = signal(0);
  showLogoutConfirm = false;

  readonly navItems: NavItem[] = [
    { label: 'Dashboard',    icon: 'dashboard',       route: '/dashboard' },
    { label: 'Membres',      icon: 'group',           route: '/membres',    roles: ['bureau'] },
    { label: 'Séances',      icon: 'event_repeat',    route: '/seances',    roles: ['bureau', 'tresorier'] },
    { label: 'Cotisations',  icon: 'payments',        route: '/cotisations',roles: ['bureau', 'tresorier'] },
    { label: 'Reçus',        icon: 'receipt',         route: '/recus',      roles: ['bureau', 'tresorier'] },
    { label: 'Trésorerie',   icon: 'account_balance', route: '/tresorerie', roles: ['bureau', 'tresorier'] },
    { label: 'Dépenses',     icon: 'receipt_long',    route: '/depenses',   roles: ['bureau', 'tresorier'] },
    { label: 'Déclarer un paiement', icon: 'payments',  route: '/cotisations/declarer', roles: ['membre'] },
    { label: 'Mes reçus',            icon: 'receipt',   route: '/mes-recus',            roles: ['membre'] },
    { label: 'Événements',   icon: 'event',           route: '/evenements' },
    { label: 'Photos',       icon: 'photo_library',   route: '/photos' },
    { label: 'Annonces',     icon: 'campaign',        route: '/annonces' },
    { label: 'Invitations',  icon: 'mail',            route: '/invitation', roles: ['bureau'] },
  ];

  get visibleNavItems(): NavItem[] {
    const role = (this.profile?.role ?? this.user?.role ?? '') as string;
    return this.navItems.filter(item => !item.roles || item.roles.includes(role));
  }


  readonly backendUrl = environment.backendUrl;

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationsService: NotificationsService,
    public themeService: ThemeService,
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.profileSub = this.authService.profile$.subscribe(p => { this.profile = p; });
    if (!this.profile) {
      this.authService.getMe().subscribe();
    }
    this.notificationsService.getNotifications(1, 0).subscribe({
      next: (res) => { if (res.success) this.unreadCount.set(res.data.unread); },
    });
  }

  @HostListener('document:keydown.escape')
  closeSidebar(): void { this.sidebarOpen = false; }

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
    return name.trim().split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  }

  get userRole(): string {
    return (this.profile?.role ?? this.user?.role ?? '') as string;
  }

  get isBureau(): boolean {
    return (this.profile?.role ?? this.user?.role) === 'bureau';
  }
}
