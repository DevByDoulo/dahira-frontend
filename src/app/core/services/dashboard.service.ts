import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
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
    date_evenement: string;
    lieu: string;
  }>;
}

export interface DashboardChartsData {
  evolution_cotisations: Array<{ mois: string; nombre: number; montant: number }>;
  evolution_tresorerie: Array<{ periode: string; solde: number; entrees: number; sorties: number }>;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getStats(): Observable<ApiResponse<DashboardStatsData>> {
    return this.http.get<ApiResponse<DashboardStatsData>>(`${this.apiUrl}/dashboard/stats`);
  }

  getCharts(): Observable<ApiResponse<DashboardChartsData>> {
    return this.http.get<ApiResponse<DashboardChartsData>>(`${this.apiUrl}/dashboard/charts`);
  }
}
