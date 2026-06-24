import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Seance {
  id: number;
  dahira_id: number;
  date_seance: string;
  type: 'dahira' | 'mensuelle' | 'autre';
  theme: string | null;
  heure: string | null;
  lieu: string | null;
  cloturee: boolean;
  created_at: string;
}

export interface CreateSeancePayload {
  date_seance: string;
  type: Seance['type'];
  theme?: string;
  heure?: string;
  lieu?: string;
}

export interface SeanceResponse {
  success: boolean;
  data: Seance;
}

export interface SeancesResponse {
  success: boolean;
  data: Seance[];
}

@Injectable({ providedIn: 'root' })
export class SeancesService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSeances(options?: { type?: string; cloturee?: boolean; limit?: number }): Observable<SeancesResponse> {
    let params = new HttpParams();
    if (options?.type) params = params.set('type', options.type);
    if (options?.cloturee !== undefined) params = params.set('cloturee', String(options.cloturee));
    if (options?.limit !== undefined) params = params.set('limit', String(options.limit));
    return this.http.get<SeancesResponse>(`${this.apiUrl}/seances`, { params });
  }

  createSeance(payload: CreateSeancePayload): Observable<SeanceResponse> {
    return this.http.post<SeanceResponse>(`${this.apiUrl}/seances`, payload);
  }

  getSeance(id: number): Observable<SeanceResponse> {
    return this.http.get<SeanceResponse>(`${this.apiUrl}/seances/${id}`);
  }

  updateSeance(id: number, payload: CreateSeancePayload): Observable<SeanceResponse> {
    return this.http.patch<SeanceResponse>(`${this.apiUrl}/seances/${id}`, payload);
  }

  cloturerSeance(id: number): Observable<SeanceResponse> {
    return this.http.patch<SeanceResponse>(`${this.apiUrl}/seances/${id}/cloturer`, {});
  }
}
