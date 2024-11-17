import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NgModule } from "@angular/core";
import { FormsModule } from '@angular/forms';

import { UserComponent } from './components/user/user/user.component';
import { BrowserModule } from '@angular/platform-browser';
@NgModule({
    declarations: [
        UserComponent
      ],
    imports: [
        BrowserModule,
        FormsModule,
    ],
    providers: [
        provideHttpClient(withInterceptorsFromDi())
      ],
      
  })
  export class AppModule {}