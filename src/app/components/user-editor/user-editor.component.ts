import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-editor.component.html',
  styleUrls: ['./user-editor.component.scss']
})
export class UserEditorComponent implements OnInit {
  editForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  userProfile: any;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router
  ) {
    this.editForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      password: ['']
    });
  }

  ngOnInit(): void {
    this.userService.getProfile().subscribe({
      next: (profile) => {
        this.userProfile = profile;
        this.editForm.patchValue({
          firstName: profile.firstName,
          lastName: profile.lastName
        });
      },
      error: (err) => {
        this.errorMessage = 'Błąd pobierania profilu.';
      }
    });
  }

  onSubmit(): void {
    if (this.editForm.invalid) {
      return;
    }

    const updatedData = this.editForm.value;
    if (!updatedData.password) {
      delete updatedData.password; // Usuń pole hasła, jeśli nie zostało zmienione
    }

    this.userService.updateProfile(updatedData).subscribe({
      next: (profile) => {
        this.successMessage = 'Profil został pomyślnie zaktualizowany.';
        this.errorMessage = '';
      },
      error: (err) => {
        this.errorMessage = err.error.message || 'Aktualizacja profilu nie powiodła się.';
        this.successMessage = '';
      }
    });
  }
}