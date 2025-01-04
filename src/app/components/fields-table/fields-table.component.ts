import { Component, OnInit } from '@angular/core';
import { FieldService } from '../../services/field.service';
import { MatDialog } from '@angular/material/dialog';
import { AddFieldDialogComponent } from '../add-field-dialog/add-field-dialog.component';
import { Router } from '@angular/router';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { Field } from '../../interfaces/field-interace';

@Component({
  selector: 'app-fields-table',
  templateUrl: './fields-table.component.html',
  styleUrls: ['./fields-table.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0', visibility: 'hidden' })),
      state('expanded', style({ height: '*', visibility: 'visible' })),
      transition('expanded <=> collapsed', animate('300ms ease-in-out')),
    ]),
  ]
})
export class FieldsTableComponent implements OnInit {
  fields: any[] = [];
  weatherData: any = {};
  selectedDate: string = new Date().toISOString().split('T')[0];
  displayedColumns: string[] = ['name', 'area', 'crops', 'rainfall', 'temperature', 'profitLoss', 'weatherDate','actions'];
  expandedElement: any | null = null;  // do przechowywania aktualnie rozwiniętego wiersza
  
  filteredFields: any[] = [];

  
  
  constructor(private fieldService: FieldService,
    public dialog: MatDialog,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.selectedDate = new Date().toISOString().split('T')[0];
    this.loadFields();
    
  }

  loadFields(): void {
    this.fieldService.getFields().subscribe(data => {
      
      this.fields = data;
      this.filteredFields = [...this.fields];
      this.loadWeatherData();
      this.fieldService.fetchFields();
      this.filterByDate(); 
    });
  }

  onDateChange(event: any): void {
    this.selectedDate = event.target.value;
    this.loadWeatherData();
  }

  loadWeatherData(): void {
    // Implementacja pobierania danych pogodowych
    // Możesz dodać nowy endpoint w backendzie lub użyć istniejącego
    // Przykład:
    this.fields.forEach(field => {
      // Zakładam, że masz endpoint do pobierania danych pogodowych dla konkretnego pola i daty
      this.fieldService.getWeatherData(field._id, this.selectedDate).subscribe(data => {
        this.weatherData[field._id] = data[0]; // Zakładam, że zwraca tablicę z jednym obiektem
      });
    });
  }

  openAddFieldDialog(): void {
    const dialogRef = this.dialog.open(AddFieldDialogComponent, {
      width: '1000px',
       maxWidth: '90vw',
      data: {} // Możesz przekazać dane, jeśli potrzebujesz
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.fieldService.addField(result).subscribe(() => {
          this.loadFields();
          this.fieldService.fetchFields();
        });
      }
    });
  }

  deleteField(field: any): void {
    // Wywołujesz usuwanie pola
    this.fieldService.deleteField(field._id).subscribe({
      next: () => {
        // Po usunięciu - odśwież listę
        this.loadFields();
      },
      error: (err) => console.error(err)
    });
    this.filterByDate();
  }

   goToField(field: any): void {
    // Np. na stronę /fields/:id/history
    this.router.navigate(['/fields', field._id, 'history']);
  }


  filterByDate(): void {
    if (!this.selectedDate) {
      return;
    }

    // Zamieniamy Date na YYYY-MM-DD
    const dateObj = new Date(this.selectedDate);
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const dateParam = `${yyyy}-${mm}-${dd}`;

    // Wywołaj endpoint /fields/byDate?date=YYYY-MM-DD
    this.fieldService.getFieldsByDate(dateParam).subscribe({
      next: (data) => {
      
        this.fields = data;
      },
      error: (err) => {
        console.error('Error filtering fields by date:', err);
      }
    });
  }

clearFilter(): void {

  this.selectedDate = new Date().toISOString().split('T')[0];
  // this.loadFields();
  this.filterByDate();

  // this.selectedDate = '';
  // // Albo ponowne pobranie wszystkich pól:
  // this.fieldService.getFields().subscribe(fields => {
  //   this.fields = fields;
  //   this.filteredFields = fields;
  // });
}

goToFieldHistory(field: Field): void {
  // Przejdź np. do /fields/:id/history
  // Możesz użyć router.navigate:
    this.router.navigate(['/fields', field._id, 'history']);

}


}
