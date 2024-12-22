
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UserProfile } from '../../interfaces/user-interface';

@Component({
  selector: 'app-user-editor',
  templateUrl: './user-editor.component.html',
  styleUrls: ['./user-editor.component.scss']
})
export class UserEditorComponent implements OnInit {
  editForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    public dialogRef: MatDialogRef<UserEditorComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UserProfile
  ) {
    this.editForm = this.fb.group({
      username: [{ value: data.username, disabled: true }, Validators.required],
      email: [{ value: data.email, disabled: true }, [Validators.required, Validators.email]],
      firstName: [data.firstName, Validators.required],
      lastName: [data.lastName, Validators.required],
      password: ['']
    });
  }

  ngOnInit(): void { }

  onSubmit(): void {
    if (this.editForm.invalid) {
      return;
    }

    const updatedData = {
      firstName: this.editForm.value.firstName,
      lastName: this.editForm.value.lastName,
      password: this.editForm.value.password ? this.editForm.value.password : undefined
    };

    this.userService.updateProfile(updatedData).subscribe({
      next: (profile) => {
        this.successMessage = 'Profil został pomyślnie zaktualizowany.';
        this.errorMessage = '';
        this.dialogRef.close('updated');
      },
      error: (err) => {
        this.errorMessage = err.error.message || 'Aktualizacja profilu nie powiodła się.';
        this.successMessage = '';
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
