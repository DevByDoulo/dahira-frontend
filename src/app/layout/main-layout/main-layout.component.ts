import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, UserProfile } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  user: ReturnType<AuthService['getUser']> = null;
  profile: UserProfile | null = null;
  private profileSub?: Subscription;

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Membres', icon: 'group', route: '/membres' },
    { label: 'Séances', icon: 'event_repeat', route: '/seances' },
    { label: 'Cotisations', icon: 'payments', route: '/cotisations' },
    { label: 'Reçus', icon: 'receipt', route: '/recus' },
    { label: 'Trésorerie', icon: 'account_balance', route: '/tresorerie' },
    { label: 'Dépenses', icon: 'receipt_long', route: '/depenses' },
    { label: 'Événements', icon: 'event', route: '/evenements' },
    { label: 'Photos', icon: 'photo_library', route: '/photos' },
    { label: 'Annonces', icon: 'campaign', route: '/annonces' },
    { label: 'Invitations', icon: 'mail', route: '/invitation' },
  ];


  readonly backendUrl = 'http://localhost:3000';

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    // Charger le profil complet (photo_url inclus) et écouter les mises à jour
    this.profileSub = this.authService.profile$.subscribe(p => { this.profile = p; });
    if (!this.profile) {
      this.authService.getMe().subscribe();
    }
  }

  ngOnDestroy(): void {
    this.profileSub?.unsubscribe();
  }

  logout(): void {
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
