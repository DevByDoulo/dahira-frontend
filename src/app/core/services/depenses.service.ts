import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Depense {
  id: number;
  dahira_id: number;
  description: string;
  montant: number;
  categorie: 'evenements' | 'location' | 'nourriture' | 'donations' | 'maintenance' | 'autres';
  mode_paiement: 'especes' | 'wave' | 'orange_money' | 'virement' | 'cheque';
  date_depense: string;
  justificatif_url: string | null;
  note: string | null;
  statut: 'en_attente' | 'validee' | 'rejetee';
  cree_par: number;
  valide_par: number | null;
  created_at: string;
  cree_par_nom: string | null;
  valide_par_nom: string | null;
}

export interface DepensesListResponse {
  success: boolean;
  data: {
    depenses: Depense[];
    total: number;
    limit: number;
    offset: number;
  };
}

export interface DepenseResponse {
  success: boolean;
  data: Depense;
}

export interface CreateDepensePayload {
  description: string;
  montant: number;
  categorie: Depense['categorie'];
  mode_paiement: Depense['mode_paiement'];
  date_depense: string;
  justificatif_url?: string;
  note?: string;
}

export type UpdateDepensePayload = Partial<CreateDepensePayload>;

@Injectable({ providedIn: 'root' })
export class DepensesService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getDepenses(filters?: {
    statut?: string;
    categorie?: string;
    date_debut?: string;
    date_fin?: string;
    limit?: number;
    offset?: number;
  }): Observable<DepensesListResponse> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
      });
    }
    return this.http.get<DepensesListResponse>(`${this.apiUrl}/depenses`, { params });
  }

  createDepense(payload: CreateDepensePayload): Observable<DepenseResponse> {
    return this.http.post<DepenseResponse>(`${this.apiUrl}/depenses`, payload);
  }

  validerDepense(id: number): Observable<DepenseResponse> {
    return this.http.patch<DepenseResponse>(`${this.apiUrl}/depenses/${id}/valider`, {});
  }

  rejeterDepense(id: number, motif: string): Observable<DepenseResponse> {
    return this.http.patch<DepenseResponse>(`${this.apiUrl}/depenses/${id}/rejeter`, { motif });
  }

  getDepense(id: number): Observable<DepenseResponse> {
    return this.http.get<DepenseResponse>(`${this.apiUrl}/depenses/${id}`);
  }

  updateDepense(id: number, payload: UpdateDepensePayload): Observable<DepenseResponse> {
    return this.http.put<DepenseResponse>(`${this.apiUrl}/depenses/${id}`, payload);
  }

  uploadJustificatif(file: File): Observable<{ success: boolean; data: { url: string } }> {
    const formData = new FormData();
    formData.append('justificatif', file);
    return this.http.post<{ success: boolean; data: { url: string } }>(
      `${this.apiUrl}/depenses/upload-justificatif`,
      formData,
    );
  }

  deleteDepense(id: number): Observable<{ success: boolean; data: unknown }> {
    return this.http.delete<{ success: boolean; data: unknown }>(`${this.apiUrl}/depenses/${id}`);
  }
}
