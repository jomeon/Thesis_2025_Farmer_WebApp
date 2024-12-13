// src/app/pages/pages.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { HomeComponent } from './home/home.component';
import { AboutComponent } from './about/about.component';
import { ContactComponent } from './contact/contact.component';

@NgModule({
  declarations: [
    HomeComponent,
    AboutComponent,
    ContactComponent
    // Dodaj inne komponenty stron tutaj, jeśli są
  ],
  imports: [
    CommonModule,
    RouterModule // Importujemy RouterModule tutaj
  ],
  exports: [
    HomeComponent,
    AboutComponent,
    ContactComponent
    // Eksportujemy komponenty stron, jeśli potrzebujesz ich używać w innych modułach
  ]
})
export class PagesModule { }
