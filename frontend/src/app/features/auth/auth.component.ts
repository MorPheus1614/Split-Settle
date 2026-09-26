import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-wrapper">
      <div class="auth-card glass-panel">
        <div class="auth-header">
          <img src="logo.png" class="auth-logo-img" alt="SPLIT&SETTLE Logo" />
          <h2>Welcome to <span class="accent">SPLIT&SETTLE</span></h2>
          <p>Expense sharing & intelligent debt simplification</p>
        </div>

        <div class="tab-buttons">
          <button [class.active]="isLoginMode" (click)="isLoginMode = true">Sign In</button>
          <button [class.active]="!isLoginMode" (click)="isLoginMode = false">Create Account</button>
        </div>

        @if (errorMessage) {
          <div class="alert alert-error">
            ⚠️ {{ errorMessage }}
          </div>
        }

        <!-- Manual Email/Password Form -->
        <form (ngSubmit)="onSubmit()" class="auth-form">
          @if (!isLoginMode) {
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input type="text" [(ngModel)]="name" name="name" class="form-input" placeholder="e.g. Alex Rivers" required />
            </div>
          }

          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" [(ngModel)]="email" name="email" class="form-input" placeholder="alex@example.com" required />
          </div>

          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" [(ngModel)]="password" name="password" class="form-input" placeholder="••••••••" required />
          </div>

          <button type="submit" [disabled]="loading" class="btn-primary btn-block">
            {{ loading ? 'Processing...' : (isLoginMode ? 'Sign In to Account' : 'Register New Account') }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .auth-wrapper {
      min-height: 80vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
    }
    .auth-card {
      width: 100%;
      max-width: 440px;
      padding: 2.5rem 2rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
      border-radius: 16px;
    }
    .auth-header {
      text-align: center;
      margin-bottom: 1.75rem;
    }
    .auth-logo-img {
      height: 54px;
      width: auto;
      object-fit: contain;
      margin: 0 auto 1rem auto;
      display: block;
    }
    .auth-header h2 {
      font-size: 1.6rem;
      color: #1d2a35;
      margin-bottom: 0.3rem;
    }
    .accent {
      color: #04AA6D;
    }
    .auth-header p {
      font-size: 0.88rem;
      color: #55606e;
    }
    .tab-buttons {
      display: flex;
      background: #f1f5f9;
      padding: 4px;
      border-radius: 8px;
      margin-bottom: 1.25rem;
      border: 1px solid #e2e8f0;
    }
    .tab-buttons button {
      flex: 1;
      padding: 0.6rem;
      background: transparent;
      border: none;
      color: #55606e;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .tab-buttons button.active {
      background: #04AA6D;
      color: #ffffff;
    }
    .btn-block {
      width: 100%;
      justify-content: center;
      margin-top: 0.5rem;
      padding: 0.8rem;
    }
    .alert-error {
      background: #fce8e6;
      border: 1px solid #c5221f;
      color: #c5221f;
      padding: 0.75rem;
      border-radius: 8px;
      font-size: 0.85rem;
      margin-bottom: 1.25rem;
    }
  `]
})
export class AuthComponent {
  authService = inject(AuthService);
  router = inject(Router);

  isLoginMode = true;
  name = '';
  email = '';
  password = '';
  loading = false;
  errorMessage = '';

  onSubmit(): void {
    this.errorMessage = '';
    this.loading = true;

    if (this.isLoginMode) {
      this.authService.login({ email: this.email, password: this.password }).subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/dashboard']);
        },
        error: err => {
          this.loading = false;
          this.errorMessage = err.error?.message || 'Login failed. Please check credentials.';
        }
      });
    } else {
      this.authService.register({ name: this.name, email: this.email, password: this.password }).subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/dashboard']);
        },
        error: err => {
          this.loading = false;
          this.errorMessage = err.error?.message || 'Registration failed.';
        }
      });
    }
  }
}


