// src/app/shared/shared.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from './navbar/navbar.component';
import { UserComponent } from './user/user/user.component';
import { FormsModule } from '@angular/forms';
import { FieldsTableComponent } from './fields-table/fields-table.component';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';

@NgModule({
  declarations: [
    NavbarComponent,
    UserComponent,
    FieldsTableComponent
    // Inne komponenty współdzielone
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatTableModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule, // Importujemy RouterModule tutaj
  ],
  exports: [
    NavbarComponent,
    UserComponent,
    FieldsTableComponent
    // Eksportujemy komponenty, które mają być używane w innych modułach
  ]
})
export class ComponentsModule { }
