import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../services/user.service';


@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent implements OnInit {
  users: any[] = [];
  newUser = { name: '', email: '', password: '' };

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers() {
    this.userService.getUsers().subscribe((data) => {
      this.users = data;
    });
  }

  addUser() {
    this.userService.addUser(this.newUser).subscribe(() => {
      this.loadUsers();
      this.newUser = { name: '', email: '', password: '' };
    });
  }
}
