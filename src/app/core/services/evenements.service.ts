import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Evenement {
  id: number;
  dahira_id: number;
  titre: string;
  description: string | null;
  date_debut: string;
  heure: string | null;
  lieu: string | null;
  capacite_max: number | null;
  image_url: string | null;
  statut?: 'a_venir' | 'en_cours' | 'passe' | 'annule';
  participants_count?: number;
  mon_inscription?: boolean;
  created_at: string;
}

export interface Participant {
  membre_id: number;
  nom: string;
  prenom: string;
  inscrit: boolean;
  present: boolean | null;
}

export interface ParticipantsResponse {
  success: boolean;
  data: Participant[];
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
  date_debut: string;
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

  updateEvenement(id: number, payload: Partial<CreateEvenementPayload>): Observable<EvenementResponse> {
    return this.http.put<EvenementResponse>(`${this.apiUrl}/evenements/${id}`, payload);
  }

  deleteEvenement(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/evenements/${id}`);
  }

  getParticipants(id: number): Observable<ParticipantsResponse> {
    return this.http.get<ParticipantsResponse>(`${this.apiUrl}/evenements/${id}/participants`);
  }

  toggleInscription(id: number): Observable<{ success: boolean; data: { inscrit: boolean } }> {
    return this.http.post<{ success: boolean; data: { inscrit: boolean } }>(
      `${this.apiUrl}/evenements/${id}/inscription`,
      {},
    );
  }

  updatePresence(id: number, membreId: number, present: boolean): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(
      `${this.apiUrl}/evenements/${id}/presence/${membreId}`,
      { present },
    );
  }
}
