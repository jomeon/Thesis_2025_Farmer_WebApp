// src/app/shared/shared.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from './navbar/navbar.component';
import {  UsersComponent } from './user/user/users.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FieldsTableComponent } from './fields-table/fields-table.component';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { AddFieldDialogComponent } from './add-field-dialog/add-field-dialog.component';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { UserComponent } from './user/user/user.component';
import { UserEditorComponent } from './user-editor/user-editor.component';
import { MatDialogModule } from '@angular/material/dialog';

@NgModule({
  declarations: [
    NavbarComponent,
    UsersComponent,
    UserComponent,
    FieldsTableComponent,
    AddFieldDialogComponent,
    UserEditorComponent
    // Inne komponenty współdzielone
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatTableModule,
    MatInputModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatIconModule,
    MatExpansionModule,
    MatButtonModule, // Importujemy RouterModule tutaj
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    
    
  ],
  exports: [
    NavbarComponent,
    UserComponent,
    FieldsTableComponent,
   
  ],
  providers: [  
    MatDatepickerModule,  
  ],
})
export class ComponentsModule { }
