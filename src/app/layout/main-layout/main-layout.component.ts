import { Component, OnInit, OnDestroy, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, of } from 'rxjs';
import { AuthService, UserProfile } from '../../core/services/auth.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { ThemeService } from '../../core/services/theme.service';
import { SearchService, SearchResult } from '../../core/services/search.service';
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
  unreadCount = signal(0);
  showLogoutConfirm = false;

  // Recherche globale
  searchQuery = '';
  searchResults: SearchResult[] = [];
  searchOpen = false;
  isSearching = false;
  private searchInput$ = new Subject<string>();
  private searchSub?: Subscription;

  readonly navItems: NavItem[] = [
    // Tous les rôles tenant
    { label: 'Dashboard',            icon: 'dashboard',       route: '/dashboard' },
    // Admin uniquement
    { label: 'Membres',              icon: 'group',           route: '/membres',              roles: ['secretaire_general', 'adjoint'] },
    { label: 'Invitations',          icon: 'mail',            route: '/invitation',           roles: ['secretaire_general', 'adjoint'] },
    // Finance (Admin + Trésorier)
    { label: 'Cotisations',          icon: 'payments',        route: '/cotisations',          roles: ['secretaire_general', 'adjoint', 'tresorier'] },
    { label: 'Reçus',                icon: 'receipt',         route: '/recus',                roles: ['secretaire_general', 'adjoint', 'tresorier'] },
    { label: 'Trésorerie',           icon: 'account_balance', route: '/tresorerie',           roles: ['secretaire_general', 'adjoint', 'tresorier'] },
    { label: 'Dépenses',             icon: 'receipt_long',    route: '/depenses',             roles: ['secretaire_general', 'adjoint', 'tresorier'] },
    // Organisation (Admin + Responsable Org)
    { label: 'Séances',              icon: 'event_repeat',    route: '/seances',              roles: ['secretaire_general', 'adjoint', 'responsable_org'] },
    { label: 'Événements',           icon: 'event',           route: '/evenements',           roles: ['secretaire_general', 'adjoint', 'responsable_org', 'membre'] },
    { label: 'Annonces',             icon: 'campaign',        route: '/annonces',             roles: ['secretaire_general', 'adjoint', 'responsable_org', 'membre'] },
    { label: 'Photos',               icon: 'photo_library',   route: '/photos',               roles: ['secretaire_general', 'adjoint', 'responsable_org', 'membre'] },
    // Membre uniquement
    { label: 'Déclarer un paiement', icon: 'payments',        route: '/cotisations/declarer', roles: ['membre'] },
    { label: 'Mes reçus',            icon: 'receipt',         route: '/mes-recus',            roles: ['membre'] },
  ];

  readonly superAdminNavItems: NavItem[] = [
    { label: 'Tableau de bord', icon: 'admin_panel_settings', route: '/super-admin' },
    { label: 'Paramètres',      icon: 'settings',             route: '/super-admin/parametres' },
  ];

  get isSuperAdmin(): boolean {
    return (this.profile?.role ?? this.user?.role) === 'super_admin';
  }

  get visibleNavItems(): NavItem[] {
    if (this.isSuperAdmin) return this.superAdminNavItems;
    const role = (this.profile?.role ?? this.user?.role ?? '') as string;
    return this.navItems.filter(item => !item.roles || item.roles.includes(role));
  }


  readonly backendUrl = environment.backendUrl;

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationsService: NotificationsService,
    public themeService: ThemeService,
    private searchService: SearchService,
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.profileSub = this.authService.profile$.subscribe(p => { this.profile = p; });
    if (!this.profile) {
      this.authService.getMe().subscribe();
    }
    // Les notifications requièrent un dahira_id — non applicable au super_admin
    if (this.user?.role !== 'super_admin') {
      this.notificationsService.getNotifications(1, 0).subscribe({
        next: (res) => { if (res.success) this.unreadCount.set(res.data.unread); },
      });
    }

    this.searchSub = this.searchInput$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((q) => {
        if (q.length < 2) { this.searchResults = []; this.isSearching = false; return of(null); }
        this.isSearching = true;
        return this.searchService.search(q).pipe(catchError(() => of(null)));
      }),
    ).subscribe((res) => {
      this.isSearching = false;
      if (res?.success) this.searchResults = res.data;
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.sidebarOpen = false;
    this.searchOpen = false;
    this.searchQuery = '';
  }

  @HostListener('document:click')
  onDocumentClick(): void { this.searchOpen = false; }

  ngOnDestroy(): void {
    this.profileSub?.unsubscribe();
    this.searchSub?.unsubscribe();
  }

  onSearchInput(): void {
    this.searchOpen = true;
    this.searchInput$.next(this.searchQuery);
  }

  navigateToResult(result: SearchResult, event: Event): void {
    event.stopPropagation();
    this.searchOpen = false;
    this.searchQuery = '';
    this.searchResults = [];
    this.router.navigate([result.route]);
  }

  searchIcon(type: string): string {
    if (type === 'membre') return 'person';
    if (type === 'seance') return 'event_repeat';
    return 'campaign';
  }

  searchTypeLabel(type: string): string {
    if (type === 'membre') return 'Membre';
    if (type === 'seance') return 'Séance';
    return 'Annonce';
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
    const role = this.profile?.role ?? this.user?.role;
    return role === 'secretaire_general' || role === 'adjoint';
  }

  get roleLabelSidebar(): string {
    const role = (this.profile?.role ?? this.user?.role ?? '') as string;
    const labels: Record<string, string> = {
      super_admin:        'Super Administrateur',
      secretaire_general: 'Secrétaire Général',
      adjoint:            'Adjoint',
      tresorier:          'Trésorier',
      responsable_org:    'Communicateur',
      membre:             'Membre',
    };
    return labels[role] ?? role;
  }
}
