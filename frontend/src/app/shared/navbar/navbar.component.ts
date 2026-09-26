import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar">
      <div class="nav-container">
        <a routerLink="/dashboard" class="brand">
          <img src="logo.png" class="brand-logo-img" alt="SPLIT&SETTLE Logo" />
          <span class="brand-text">SPLIT<span class="accent">&</span>SETTLE</span>
        </a>

        @if (authService.isLoggedIn()) {
          <div class="nav-links">
            <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
              <span class="nav-icon">📊</span> Dashboard
            </a>
            <a routerLink="/groups" routerLinkActive="active" class="nav-item">
              <span class="nav-icon">👥</span> Groups
            </a>
          </div>

          <div class="user-menu">
            <div class="user-info">
              <img src="newuser.webp" class="user-avatar-img" alt="User Logo" />
              <div class="user-details">
                <span class="user-name">{{ user()?.name }}</span>
                <span class="user-role badge-role">{{ user()?.role }}</span>
              </div>
            </div>
            <button (click)="logout()" class="btn-logout" title="Sign Out">
              🚪 Logout
            </button>
          </div>
        } @else {
          <div class="nav-links">
            <a routerLink="/login" class="btn-signin">Sign In</a>
          </div>
        }
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      background: #1d2a35;
      padding: 0.75rem 2rem;
      position: sticky;
      top: 0;
      z-index: 50;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .nav-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      max-width: 1280px;
      margin: 0 auto;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      text-decoration: none;
      color: #ffffff;
    }
    .brand-logo-img {
      height: 38px;
      width: auto;
      object-fit: contain;
      border-radius: 6px;
    }
    .brand-text {
      font-family: 'Outfit', sans-serif;
      font-size: 1.3rem;
      font-weight: 800;
      letter-spacing: 0.03em;
    }
    .accent {
      color: #04AA6D;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .nav-item {
      color: #e2e8f0;
      text-decoration: none;
      font-weight: 600;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .nav-item:hover, .nav-item.active {
      color: #ffffff;
      background: #04AA6D;
    }
    .btn-signin {
      background: #04AA6D;
      color: #ffffff;
      padding: 0.5rem 1.2rem;
      border-radius: 20px;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .btn-signin:hover {
      background: #059862;
    }
    .user-menu {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }
    .user-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .user-avatar-img {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      border: 2px solid #04AA6D;
      object-fit: cover;
      background: #ffffff;
    }
    .user-details {
      display: flex;
      flex-direction: column;
    }
    .user-name {
      font-size: 0.9rem;
      font-weight: 700;
      color: #ffffff;
    }
    .badge-role {
      font-size: 0.7rem;
      font-weight: 700;
      color: #04AA6D;
      text-transform: uppercase;
    }
    .btn-logout {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
      padding: 0.45rem 0.9rem;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-logout:hover {
      background: #e53935;
      border-color: #e53935;
    }
  `]
})
export class NavbarComponent {
  authService = inject(AuthService);
  router = inject(Router);
  user = this.authService.currentUserSignal;

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
