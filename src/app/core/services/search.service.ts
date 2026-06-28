import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SearchResult {
  type: 'membre' | 'seance' | 'annonce';
  id: number;
  label: string;
  sublabel: string;
  photo_url?: string | null;
  route: string;
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  search(q: string): Observable<{ success: boolean; data: SearchResult[] }> {
    return this.http.get<{ success: boolean; data: SearchResult[] }>(
      `${this.apiUrl}/search?q=${encodeURIComponent(q)}`,
    );
  }
}
