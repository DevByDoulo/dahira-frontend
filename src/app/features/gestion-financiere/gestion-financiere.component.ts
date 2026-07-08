import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { TresorerieService, SoldeTresorerie } from '../../core/services/tresorerie.service';

interface OngletGF {
  label: string;
  icon: string;
  route: string;
  roles: string[];
}

interface GroupeGF {
  label: string;
  onglets: OngletGF[];
}

const ADMIN = ['secretaire_general', 'adjoint'];

@Component({
  selector: 'app-gestion-financiere',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './gestion-financiere.component.html',
})
export class GestionFinanciereComponent implements OnInit, OnDestroy {
  solde: SoldeTresorerie | null = null;
  isLoadingSolde = true;
  private navSub?: Subscription;

  private readonly groupes: GroupeGF[] = [
    {
      label: 'Activité de séance',
      onglets: [
        {
          label: 'Séances',
          icon: 'event_repeat',
          route: 'seances',
          roles: [...ADMIN, 'tresorier', 'responsable_org'],
        },
        {
          label: 'Cotisations',
          icon: 'payments',
          route: 'cotisations',
          roles: [...ADMIN, 'tresorier'],
        },
      ],
    },
    {
      label: 'Flux & dépenses',
      onglets: [
        {
          label: 'Dépenses',
          icon: 'receipt_long',
          route: 'depenses',
          roles: [...ADMIN, 'tresorier'],
        },
        {
          label: 'Trésorerie',
          icon: 'account_balance',
          route: 'tresorerie',
          roles: [...ADMIN, 'tresorier'],
        },
      ],
    },
    {
      label: 'Mon espace',
      onglets: [
        { label: 'Mes cotisations', icon: 'receipt', route: 'mes-cotisations', roles: ['membre'] },
      ],
    },
  ];

  constructor(
    private authService: AuthService,
    private tresorerieService: TresorerieService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  get role(): string {
    return this.authService.getUser()?.role ?? '';
  }

  /** Le bandeau solde est masqué sur l'onglet Trésorerie, qui affiche déjà ces chiffres en détail. */
  get soldeVisible(): boolean {
    return !this.router.url.startsWith('/gestion-financiere/tresorerie');
  }

  get groupesVisibles(): GroupeGF[] {
    return this.groupes
      .map((g) => ({ ...g, onglets: g.onglets.filter((o) => o.roles.includes(this.role)) }))
      .filter((g) => g.onglets.length > 0);
  }

  ngOnInit(): void {
    // Arrivée sur /gestion-financiere sans onglet : rediriger vers le premier onglet accessible.
    // Aussi après coup (le composant est réutilisé si on reclique sur l'entrée de la sidebar).
    this.redirigerSiSansOnglet();
    this.navSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.redirigerSiSansOnglet());
    this.chargerSolde();
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  private redirigerSiSansOnglet(): void {
    if (!this.route.snapshot.firstChild) {
      const premier = this.groupesVisibles[0]?.onglets[0];
      if (premier) {
        this.router.navigate([premier.route], { relativeTo: this.route, replaceUrl: true });
      }
    }
  }

  chargerSolde(): void {
    this.isLoadingSolde = true;
    this.tresorerieService.getSolde().subscribe({
      next: (res) => {
        if (res.success) this.solde = res.data;
        this.isLoadingSolde = false;
      },
      error: () => {
        this.solde = null;
        this.isLoadingSolde = false;
      },
    });
  }

  formatMontant(montant: number): string {
    return `${Math.round(montant).toLocaleString('fr-FR')} FCFA`;
  }
}
