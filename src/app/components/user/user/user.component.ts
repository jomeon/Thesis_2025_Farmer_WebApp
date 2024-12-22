import { Component, OnInit } from '@angular/core';

import { MatDialog } from '@angular/material/dialog';

import { UserService } from '../../../services/user.service';
import { UserEditorComponent } from '../../user-editor/user-editor.component';
import { UserProfile } from '../../../interfaces/user-interface';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss']
})
export class UserComponent implements OnInit {
  userProfile: UserProfile | null = null;
  errorMessage: string = '';

  constructor(private userService: UserService, public dialog: MatDialog) { }

  ngOnInit(): void {
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    this.userService.getProfile().subscribe({
      next: (profile) => {
        this.userProfile = profile;
      },
      error: (err) => {
        this.errorMessage = 'Błąd pobierania profilu użytkownika.';
        console.error(err);
      }
    });
  }

  openEditDialog(): void {
    const dialogRef = this.dialog.open(UserEditorComponent, {
      width: '400px',
      data: { ...this.userProfile } // Przekazanie aktualnych danych użytkownika
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'updated') {
        this.loadUserProfile(); // Odświeżenie danych po aktualizacji
      }
    });
  }
}
