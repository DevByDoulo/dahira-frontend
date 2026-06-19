import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EncaisserCotisationPayload {
  membre_id: number;
  seance_id: number;
  montant: number;
  mode_paiement: 'especes' | 'wave' | 'orange_money';
  note?: string;
}

export interface DeclarerCotisationPayload {
  seance_id: number;
  montant: number;
  mode_paiement: 'wave' | 'orange_money';
  note?: string;
}

export interface Cotisation {
  id: number;
  dahira_id: number;
  membre_id: number;
  seance_id: number;
  montant: number;
  mode_paiement: 'especes' | 'wave' | 'orange_money';
  note: string | null;
  statut: 'pending' | 'approved' | 'rejected';
  declare_par: number | null;
  valide_par: number | null;
  valide_at: string | null;
  created_at: string;
  nom?: string;
  prenom?: string;
  date_seance?: string;
  type?: string;
}

export interface CotisationsResponse {
  success: boolean;
  data: Cotisation[];
}

export interface CotisationResponse {
  success: boolean;
  data: Cotisation;
}

export interface CotisationStats {
  total_especes: number;
  total_wave: number;
  total_orange_money: number;
  total_general: number;
  membres_a_jour: number;
  membres_en_retard: { id: number; nom: string; prenom: string }[];
}

export interface CotisationStatsResponse {
  success: boolean;
  data: CotisationStats;
}

@Injectable({ providedIn: 'root' })
export class CotisationsService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getCotisations(statut?: string): Observable<CotisationsResponse> {
    const params = statut ? `?statut=${statut}` : '';
    return this.http.get<CotisationsResponse>(`${this.apiUrl}/cotisations${params}`);
  }

  validerCotisation(id: number): Observable<CotisationResponse> {
    return this.http.patch<CotisationResponse>(`${this.apiUrl}/cotisations/${id}/valider`, {});
  }

  rejeterCotisation(id: number, note?: string): Observable<CotisationResponse> {
    return this.http.patch<CotisationResponse>(
      `${this.apiUrl}/cotisations/${id}/rejeter`,
      note ? { note } : {},
    );
  }

  declarerCotisation(payload: DeclarerCotisationPayload): Observable<CotisationResponse> {
    return this.http.post<CotisationResponse>(`${this.apiUrl}/cotisations/declarer`, payload);
  }

  encaisserCotisation(payload: EncaisserCotisationPayload): Observable<CotisationResponse> {
    return this.http.post<CotisationResponse>(`${this.apiUrl}/cotisations/encaisser`, payload);
  }

  getStats(): Observable<CotisationStatsResponse> {
    return this.http.get<CotisationStatsResponse>(`${this.apiUrl}/cotisations/dashboard`);
  }

  genererRecu(cotisationId: number): Observable<{ success: boolean; data: unknown }> {
    return this.http.post<{ success: boolean; data: unknown }>(
      `${this.apiUrl}/recus/cotisation/${cotisationId}/generer`,
      {},
    );
  }
}
