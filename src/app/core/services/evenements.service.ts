import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Evenement {
  id: number;
  dahira_id: number;
  titre: string;
  description: string | null;
  date_evenement: string;
  heure: string | null;
  lieu: string | null;
  capacite_max: number | null;
  photo_url: string | null;
  statut?: 'a_venir' | 'en_cours' | 'passe' | 'annule';
  participants_count?: number;
  created_at: string;
}

export interface EvenementResponse {
  success: boolean;
  data: Evenement;
}

export interface EvenementsResponse {
  success: boolean;
  data: Evenement[];
}

export interface CreateEvenementPayload {
  titre: string;
  description?: string;
  date_evenement: string;
  heure?: string;
  lieu?: string;
  capacite_max?: number;
}

@Injectable({ providedIn: 'root' })
export class EvenementsService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getEvenements(statut?: string): Observable<EvenementsResponse> {
    let params = new HttpParams();
    if (statut) params = params.set('statut', statut);
    return this.http.get<EvenementsResponse>(`${this.apiUrl}/evenements`, { params });
  }

  createEvenement(payload: CreateEvenementPayload, image?: File): Observable<EvenementResponse> {
    const form = new FormData();
    Object.entries(payload).forEach(([k, v]) => { if (v !== undefined) form.append(k, String(v)); });
    if (image) form.append('photo', image);
    return this.http.post<EvenementResponse>(`${this.apiUrl}/evenements`, form);
  }

  getEvenement(id: number): Observable<EvenementResponse> {
    return this.http.get<EvenementResponse>(`${this.apiUrl}/evenements/${id}`);
  }

  deleteEvenement(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/evenements/${id}`);
  }
}
