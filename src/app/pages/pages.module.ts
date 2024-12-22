import { NgModule } from '@angular/core';

import { RouterModule } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { AboutComponent } from './about/about.component';
import { ContactComponent } from './contact/contact.component';
import { MapComponent } from '../components/map/map.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';

@NgModule({
  declarations: [
    HomeComponent,
    AboutComponent,
    ContactComponent,
    MapComponent
    // Inne komponenty
  ],
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    RouterModule
  ],
  exports: [
    HomeComponent,
    AboutComponent,
    ContactComponent
    // Eksportuj komponenty, jeśli potrzebujesz ich w innych modułach
  ]
})
export class PagesModule { }