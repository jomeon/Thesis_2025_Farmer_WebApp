import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { AboutComponent } from './pages/about/about.component';
import { ContactComponent } from './pages/contact/contact.component';
import { RegisterComponent } from './components/register/register.component';
import { LoginComponent } from './components/login/login.component';
import { UserEditorComponent } from './components/user-editor/user-editor.component';
import { AuthGuard } from './guards/auth.guards';
import { MapComponent } from './components/map/map.component';
import { FieldsTableComponent } from './components/fields-table/fields-table.component';
import { UserComponent } from './components/user/user/user.component';
import { HistoryComponent } from './components/history/history.component';


export const routes: Routes = [
  { path: '', component: HomeComponent }, // Strona główna
  { path: 'about', component: AboutComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },
  { path: 'edit-user', component: UserEditorComponent, canActivate: [AuthGuard] },// Opcjonalnie chronione
  { path: 'map', component: MapComponent, canActivate: [AuthGuard] },
  { path: 'fields', component: FieldsTableComponent, canActivate: [AuthGuard] },
  { path: 'profile', component: UserComponent, canActivate: [AuthGuard] }, // Dodano trasę profile
  { path: 'fields/:id/history', component: HistoryComponent },
  { path: '**', redirectTo: '' }, // Przekierowanie dla nieznanych tras
  
  
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
