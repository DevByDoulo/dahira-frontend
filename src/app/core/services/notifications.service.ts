import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Notification {
  id: number;
  user_id: number;
  dahira_id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationsResponse {
  success: boolean;
  data: {
    notifications: Notification[];
    total: number;
    unread: number;
  };
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getNotifications(limit = 50, offset = 0): Observable<NotificationsResponse> {
    const params = new HttpParams().set('limit', limit).set('offset', offset);
    return this.http.get<NotificationsResponse>(`${this.apiUrl}/notifications`, { params });
  }

  markAsRead(id: number): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${this.apiUrl}/notifications/${id}/read`, {});
  }

  markAllAsRead(): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${this.apiUrl}/notifications/read-all`, {});
  }

  delete(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/notifications/${id}`);
  }
}
