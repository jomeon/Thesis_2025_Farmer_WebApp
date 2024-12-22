import { Component, OnInit } from '@angular/core';
import { FieldService } from '../../services/field.service';
import { MatDialog } from '@angular/material/dialog';
import { AddFieldDialogComponent } from '../add-field-dialog/add-field-dialog.component';

@Component({
  selector: 'app-fields-table',
  templateUrl: './fields-table.component.html',
  styleUrls: ['./fields-table.component.scss']
})
export class FieldsTableComponent implements OnInit {
  fields: any[] = [];
  weatherData: any = {};
  selectedDate: string = new Date().toISOString().split('T')[0];
  displayedColumns: string[] = ['name', 'area', 'crops', 'rainfall', 'temperature', 'profitLoss'];
  
  filteredFields: any[] = [];
  constructor(private fieldService: FieldService,
    public dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.loadFields();
  }

  loadFields(): void {
    this.fieldService.getFields().subscribe(data => {
      this.fields = data;
      this.loadWeatherData();
      this.fieldService.fetchFields();
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


  filterByDate(): void {
    if (this.selectedDate) {
      this.filteredFields = this.fields.filter(field =>
        field.date === this.selectedDate
      );
    }
  }

  clearFilter(): void {
    this.selectedDate = '';
    this.filteredFields = [...this.fields]; // Przywracanie oryginalnych danych
  }


  

}
