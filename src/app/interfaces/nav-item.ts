import { UserProfile } from "./user-interface";

export interface NavItem {
    label: string;
    path: string;
  }

  interface AuthResponse {
    token: string;
    user: UserProfile;
  }