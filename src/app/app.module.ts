import {  provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NgModule } from "@angular/core";
import { FormsModule } from '@angular/forms';

import { BrowserModule } from '@angular/platform-browser';


import { RouterModule } from '@angular/router';

import { PagesModule } from './pages/pages.module';
import { ComponentsModule } from './components/components.module';


@NgModule({
    declarations: [
      
      ],
    imports: [
      ComponentsModule,
        BrowserModule,
        FormsModule,
        RouterModule,
        PagesModule,
      
    ],
    providers: [
        provideHttpClient(withInterceptorsFromDi())
      ],
      bootstrap: []
      
  })
  export class AppModule {}