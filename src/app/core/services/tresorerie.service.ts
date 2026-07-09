import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SoldeTresorerie {
  solde_global: number;
  entrees: { total: number; especes: number; wave: number; orange_money: number };
  sorties: { total: number; especes: number; wave: number; orange_money: number };
  soldes_par_mode: { especes: number; wave: number; orange_money: number };
}

export interface Transaction {
  type: 'entree' | 'sortie';
  id: number;
  montant: number;
  mode_paiement: string;
  date: string;
  description: string;
  membre_nom?: string;
}

export interface EvolutionPoint {
  periode: string;
  entrees: number;
  sorties: number;
  solde: number;
}

export interface Alerte {
  type: 'warning' | 'danger';
  message: string;
  priorite: 'medium' | 'high';
}

export interface PrevisionMois {
  mois: string;
  entrees_prevues: number;
  sorties_prevues: number;
  solde_projete: number;
}

export interface Previsions {
  solde_actuel: number;
  moyenne_entrees: number;
  moyenne_sorties: number;
  previsions: PrevisionMois[];
}

export interface FiltresTransactions {
  mode_paiement?: string;
  date_debut?: string;
  date_fin?: string;
}

@Injectable({ providedIn: 'root' })
export class TresorerieService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSolde(): Observable<{ success: boolean; data: SoldeTresorerie }> {
    return this.http.get<{ success: boolean; data: SoldeTresorerie }>(
      `${this.apiUrl}/tresorerie/solde`,
    );
  }

  getTransactions(
    limit: number | 'all' = 20,
    type?: 'entree' | 'sortie',
    filtres?: FiltresTransactions,
  ): Observable<{ success: boolean; data: Transaction[] }> {
    let params = new HttpParams().set('limit', limit);
    if (type) params = params.set('type', type);
    if (filtres?.mode_paiement) params = params.set('mode_paiement', filtres.mode_paiement);
    if (filtres?.date_debut) params = params.set('date_debut', filtres.date_debut);
    if (filtres?.date_fin) params = params.set('date_fin', filtres.date_fin);
    return this.http.get<{ success: boolean; data: Transaction[] }>(
      `${this.apiUrl}/tresorerie/transactions`,
      { params },
    );
  }

  getEvolution(periode: 'mois' | 'semaine' | 'jour' = 'mois'): Observable<{ success: boolean; data: EvolutionPoint[] }> {
    const params = new HttpParams().set('periode', periode);
    return this.http.get<{ success: boolean; data: EvolutionPoint[] }>(
      `${this.apiUrl}/tresorerie/evolution`,
      { params },
    );
  }

  getAlertes(): Observable<{ success: boolean; data: Alerte[] }> {
    return this.http.get<{ success: boolean; data: Alerte[] }>(
      `${this.apiUrl}/tresorerie/alertes`,
    );
  }

  getPrevisions(mois = 3): Observable<{ success: boolean; data: Previsions }> {
    const params = new HttpParams().set('mois', mois);
    return this.http.get<{ success: boolean; data: Previsions }>(
      `${this.apiUrl}/tresorerie/previsions`,
      { params },
    );
  }

  exportRapportMensuel(mois: string): Observable<Blob> {
    const params = new HttpParams().set('mois', mois);
    return this.http.get(`${this.apiUrl}/tresorerie/rapport-mensuel`, {
      params,
      responseType: 'blob',
    });
  }
}
