import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { UserProfile } from '../interfaces/user-interface';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = '/api/users'; // Ścieżka względna dzięki proxy

  constructor(private http: HttpClient, private authService: AuthService) { }

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/profile`);
  }

  updateProfile(userData: any): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.apiUrl}/profile`, userData);
  }

  getUsers(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  addUser(user: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, user);
  }
  
  createUser(userData: any): Observable<UserProfile> {
    return this.http.post<UserProfile>(`${this.apiUrl}/register`, userData); // Zakładam endpoint do tworzenia użytkowników
  }
}
