import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface TopContributeur {
  id: number;
  nom: string;
  prenom: string;
  photo_url: string | null;
  nb_cotisations: number;
  total_montant: number;
}

export interface DashboardStatsData {
  membres: {
    total: number;
    actifs: number;
    inactifs: number;
    nouveaux_ce_mois: number;
  };
  cotisations: {
    total_mois: number;
    montant_total_mois: number;
    en_attente: number;
    approuvees: number;
    membres_a_jour: number;
    membres_en_retard: number;
    taux_a_jour: number;
  };
  tresorerie: {
    solde_global: number;
    entrees_total: number;
    sorties_total: number;
  };
  evenements_a_venir: Array<{
    id: number;
    titre: string;
    date_debut: string;
    lieu: string;
  }>;
  top_contributeurs?: TopContributeur[];
}

export interface DashboardChartsData {
  evolution_cotisations: Array<{ mois: string; nombre: number; montant: number }>;
  evolution_tresorerie: Array<{ periode: string; solde: number; entrees: number; sorties: number }>;
  repartition_paiement: Array<{ mode_paiement: string; nombre: number; montant: number }>;
}

export interface ComparativeStats {
  cotisations: {
    nombre: { actuel: number; precedent: number; evolution: number };
    montant: { actuel: number; precedent: number; evolution: number };
  };
  nouveaux_membres: { actuel: number; precedent: number; evolution: number };
}

export interface ActivityItem {
  type: 'cotisation' | 'nouveau_membre' | 'annonce';
  id: number;
  created_at: string;
  montant?: number;
  nom: string;
  prenom?: string;
  photo_url?: string | null;
  titre?: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getStats(): Observable<ApiResponse<DashboardStatsData>> {
    return this.http.get<ApiResponse<DashboardStatsData>>(`${this.apiUrl}/dashboard/stats`);
  }

  getCharts(): Observable<ApiResponse<DashboardChartsData>> {
    return this.http.get<ApiResponse<DashboardChartsData>>(`${this.apiUrl}/dashboard/charts`);
  }

  getComparative(): Observable<ApiResponse<ComparativeStats>> {
    return this.http.get<ApiResponse<ComparativeStats>>(`${this.apiUrl}/dashboard/comparative`);
  }

  getActivity(): Observable<ApiResponse<ActivityItem[]>> {
    return this.http.get<ApiResponse<ActivityItem[]>>(`${this.apiUrl}/dashboard/activity?limit=8`);
  }
}
