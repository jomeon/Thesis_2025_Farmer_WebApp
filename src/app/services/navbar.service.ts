import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { NavItem } from '../interfaces/nav-item'; 

@Injectable({
  providedIn: 'root'
})
export class NavbarService {
  private navItemsUrl = 'http://localhost:5000/api/navitems';
  private publicNavItemsUrl = 'http://localhost:5000/api/navitems/public'; // endpoint

  constructor(private http: HttpClient) { }

  getNavItems(): Observable<NavItem[]> {
    const token = localStorage.getItem('token');

     if (token) {
      // Jeśli token istnieje, użyj endpointu dla zalogowanych użytkowników
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });
      return this.http.get<NavItem[]>(this.navItemsUrl, { headers });
    } else {
      // Jeśli brak tokenu, użyj endpointu publicznego
      return this.http.get<NavItem[]>(this.navItemsUrl);
    }
  }
}
