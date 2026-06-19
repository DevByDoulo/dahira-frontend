import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

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
export class MainLayoutComponent implements OnInit {
  user: ReturnType<AuthService['getUser']> = null;

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Membres', icon: 'group', route: '/membres' },
    { label: 'Séances', icon: 'event_repeat', route: '/seances' },
    { label: 'Cotisations', icon: 'payments', route: '/cotisations' },
    { label: 'Trésorerie', icon: 'account_balance', route: '/tresorerie' },
    { label: 'Dépenses', icon: 'receipt_long', route: '/depenses' },
    { label: 'Événements', icon: 'event', route: '/evenements' },
    { label: 'Annonces', icon: 'campaign', route: '/annonces' },
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  get userFullName(): string {
    if (!this.user) return '';
    return `${this.user.prenom ?? ''} ${this.user.nom ?? ''}`.trim();
  }

  get userInitials(): string {
    if (!this.user) return '?';
    const p = (this.user.prenom as string)?.[0] ?? '';
    const n = (this.user.nom as string)?.[0] ?? '';
    return (p + n).toUpperCase() || '?';
  }

  get userRole(): string {
    return (this.user?.role as string) ?? '';
  }
}
