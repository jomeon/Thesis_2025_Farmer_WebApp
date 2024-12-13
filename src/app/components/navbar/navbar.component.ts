import { Component, OnInit } from '@angular/core';
import { NavbarService } from '../../services/navbar.service';
import { NavItem } from '../../interfaces/nav-item'; // Zaktualizowany import
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  
})
export class NavbarComponent implements OnInit {
  navItems: NavItem[] = [];

  constructor(
    private navbarService: NavbarService,
    private authService: AuthService,  
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadNavItems();

    // Aktualizuj nawigację, gdy stan autoryzacji się zmieni
    this.authService.currentUser.subscribe(() => {
      this.loadNavItems();
    });
  }

  loadNavItems(): void {
    this.navbarService.getNavItems().subscribe({
      next: (items) => {
        this.navItems = items;
        console.log('Pobrane navItems:', this.navItems);
      },
      error: (error) => {
        console.error('Błąd pobierania elementów nawigacji', error);
      },
      complete: () => {
        console.log('Subskrypcja zakończona.');
      }
    });
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}