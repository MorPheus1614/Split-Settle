import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from '../../core/services/analytics.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardSummary } from '../../core/models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard-container">
      <div class="welcome-header">
        <div class="header-user-row">
          <img src="newuser.webp" class="user-logo-lg" alt="User Logo" />
          <div>
            <h1>Welcome back, <span class="accent">{{ user()?.name }}</span>! 👋</h1>
            <p class="subtitle">Here is your group expense breakdown & debt simplification summary in Rupees (₹).</p>
          </div>
        </div>
        <a routerLink="/groups" class="btn-primary">
          <span>👥</span> View All Groups
        </a>
      </div>

      @if (loading) {
        <div class="loading-panel glass-panel">
          <div class="spinner"></div> Loading your financial summary...
        </div>
      } @else if (summary) {
        <!-- Net Balance Banner -->
        <div class="net-banner glass-panel" [ngClass]="{
          'net-positive': summary.netBalance > 0,
          'net-negative': summary.netBalance < 0,
          'net-zero': summary.netBalance === 0
        }">
          <div class="banner-content">
            <span class="banner-badge">
              {{ summary.netBalance > 0 ? '🟢 Net Credit' : summary.netBalance < 0 ? '🔴 Net Debt' : '✨ Settled Up' }}
            </span>
            <div class="banner-text">
              @if (summary.netBalance > 0) {
                <h2>Overall, you are owed <span class="net-amount">{{ summary.netBalance | currency:'INR':'symbol':'1.2-2' }}</span> 🎉</h2>
                <p>Your friends owe you money across {{ summary.activeGroupsCount }} active groups.</p>
              } @else if (summary.netBalance < 0) {
                <h2>Overall, you owe <span class="net-amount">{{ summary.youOweTotal | currency:'INR':'symbol':'1.2-2' }}</span> 💸</h2>
                <p>Use the debt simplification recommendations below to settle up in minimal payments.</p>
              } @else {
                <h2>You are completely settled up! ✨</h2>
                <p>No pending debts across your active groups.</p>
              }
            </div>
          </div>
        </div>

        <!-- Metric Cards Grid -->
        <div class="metrics-grid">
          <div class="metric-card glass-panel glass-panel-hover">
            <div class="metric-icon green">📥</div>
            <div class="metric-info">
              <span class="metric-label">You are owed</span>
              <span class="metric-value green-text">{{ summary.youAreOwedTotal | currency:'INR':'symbol':'1.2-2' }}</span>
            </div>
          </div>

          <div class="metric-card glass-panel glass-panel-hover">
            <div class="metric-icon red">📤</div>
            <div class="metric-info">
              <span class="metric-label">You owe</span>
              <span class="metric-value red-text">{{ summary.youOweTotal | currency:'INR':'symbol':'1.2-2' }}</span>
            </div>
          </div>

          <div class="metric-card glass-panel glass-panel-hover">
            <div class="metric-icon dark">🏢</div>
            <div class="metric-info">
              <span class="metric-label">Active Groups</span>
              <span class="metric-value">{{ summary.activeGroupsCount }}</span>
            </div>
          </div>
        </div>

        <!-- Main Dashboard Split Layout -->
        <div class="dashboard-split">
          <!-- Left Column: Pending Actions & Spending Breakdown -->
          <div class="split-col">
            <!-- Simplified Debts / Action Items -->
            <div class="glass-panel section-card">
              <div class="section-header">
                <h3>⚡ Debt Simplification Actions</h3>
                <span class="badge badge-indigo">Min-Cash-Flow Plan</span>
              </div>

              @if (summary.pendingActionableSettlements.length === 0) {
                <div class="empty-state">
                  <span>🎉</span> No pending settlements required for you right now!
                </div>
              } @else {
                <div class="debt-actions-list">
                  @for (action of summary.pendingActionableSettlements; track $index) {
                    <div class="debt-action-item">
                      <div class="debt-flow">
                        <span class="user-chip">
                          <img src="newuser.webp" class="user-avatar-xs" alt="User" />
                          {{ action.fromUserName }}
                        </span>
                        <span class="arrow-badge">owes ➔</span>
                        <span class="user-chip highlighted">
                          <img src="newuser.webp" class="user-avatar-xs" alt="User" />
                          {{ action.toUserName }}
                        </span>
                        @if (action.description) {
                          <span class="expense-tag">({{ action.description }})</span>
                        }
                      </div>
                      <div class="debt-amount-col">
                        <span class="debt-amount">{{ action.amount | currency:'INR':'symbol':'1.2-2' }}</span>
                        <a routerLink="/groups" class="btn-secondary btn-sm">Go to Group</a>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Spending by Category -->
            <div class="glass-panel section-card">
              <div class="section-header">
                <h3>📊 Category Spending Breakdown</h3>
              </div>

              @if (summary.categoryBreakdown.length === 0) {
                <div class="empty-state">No expense categories tracked yet.</div>
              } @else {
                <div class="category-list">
                  @for (cat of summary.categoryBreakdown; track cat.category) {
                    <div class="category-item">
                      <div class="cat-label">
                        <span class="cat-name">{{ getCategoryEmoji(cat.category) }} {{ cat.category }}</span>
                        <span class="cat-val">{{ cat.totalAmount | currency:'INR':'symbol':'1.2-2' }} ({{ cat.percentage }}%)</span>
                      </div>
                      <div class="progress-bar-bg">
                        <div class="progress-bar-fill" [style.width.%]="cat.percentage"></div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Right Column: Recent Activity Stream -->
          <div class="split-col">
            <div class="glass-panel section-card">
              <div class="section-header">
                <h3>🕒 Recent Activity Stream</h3>
                <span class="badge badge-emerald">Live Updates</span>
              </div>

              @if (summary.recentActivities.length === 0) {
                <div class="empty-state">No recent activity found.</div>
              } @else {
                <div class="activity-feed">
                  @for (act of summary.recentActivities; track act.id + '-' + act.type) {
                    <div class="activity-item">
                      <div class="activity-icon" [ngClass]="act.type.toLowerCase()">
                        {{ act.type === 'Expense' ? '💸' : '🤝' }}
                      </div>
                      <div class="activity-details">
                        <div class="activity-title-row">
                          <span class="act-title">{{ act.title }}</span>
                          <span class="act-amount" [ngClass]="act.type === 'Expense' ? 'exp' : 'settle'">
                            {{ act.amount | currency:'INR':'symbol':'1.2-2' }}
                          </span>
                        </div>
                        <div class="activity-sub">
                          <span class="act-user-info">
                            <img src="newuser.webp" class="user-avatar-xs" alt="User" />
                            Paid by <strong>{{ act.userFullName }}</strong> in <em>{{ act.groupName }}</em>
                          </span>
                          <span class="act-date">{{ act.date | date:'shortDate' }}</span>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard-container {
      max-width: 1280px;
      margin: 2rem auto;
      padding: 0 1.5rem;
    }
    .welcome-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .header-user-row {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .user-logo-lg {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      border: 3px solid #04AA6D;
      object-fit: cover;
      background: #ffffff;
      box-shadow: 0 4px 10px rgba(4, 170, 109, 0.2);
    }
    .welcome-header h1 {
      font-size: 1.8rem;
      color: #1d2a35;
    }
    .subtitle {
      color: #55606e;
      font-size: 0.95rem;
    }
    .accent {
      color: #04AA6D;
    }
    .loading-panel {
      padding: 3rem;
      text-align: center;
      color: #55606e;
    }
    .spinner {
      display: inline-block;
      width: 24px;
      height: 24px;
      border: 3px solid #e2e8f0;
      border-radius: 50%;
      border-top-color: #04AA6D;
      animation: spin 0.8s linear infinite;
      margin-right: 0.5rem;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .net-banner {
      padding: 1.75rem 2rem;
      margin-bottom: 1.5rem;
      border-left: 6px solid #04AA6D;
      background: #ffffff;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
    }
    .net-positive {
      border-left-color: #04AA6D;
      background: #e7f9f0;
    }
    .net-negative {
      border-left-color: #e53935;
      background: #fce8e6;
    }
    .net-amount {
      font-weight: 800;
    }
    .net-positive .net-amount { color: #04AA6D; }
    .net-negative .net-amount { color: #c5221f; }
    .banner-badge {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #55606e;
      display: block;
      margin-bottom: 0.3rem;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.25rem;
      margin-bottom: 1.75rem;
    }
    .metric-card {
      padding: 1.25rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 1.25rem;
      background: #ffffff;
    }
    .metric-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }
    .metric-icon.green { background: #e7f9f0; }
    .metric-icon.red { background: #fce8e6; }
    .metric-icon.dark { background: #f1f5f9; }
    .metric-info {
      display: flex;
      flex-direction: column;
    }
    .metric-label {
      font-size: 0.85rem;
      color: #55606e;
      font-weight: 700;
    }
    .metric-value {
      font-size: 1.5rem;
      font-weight: 800;
      font-family: 'Outfit', sans-serif;
    }
    .green-text { color: #04AA6D; }
    .red-text { color: #e53935; }
    .dashboard-split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    @media (max-width: 900px) {
      .dashboard-split { grid-template-columns: 1fr; }
    }
    .section-card {
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      background: #ffffff;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }
    .section-header h3 {
      font-size: 1.15rem;
      color: #1d2a35;
    }
    .empty-state {
      text-align: center;
      padding: 2rem;
      color: #55606e;
      font-size: 0.9rem;
    }
    .debt-actions-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .debt-action-item {
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
    }
    .user-chip {
      font-weight: 700;
      font-size: 0.9rem;
      color: #1d2a35;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .user-avatar-xs {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      object-fit: cover;
      border: 1px solid #04AA6D;
      vertical-align: middle;
    }
    .act-user-info {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }
    .arrow-badge {
      color: #04AA6D;
      margin: 0 0.5rem;
      font-size: 0.8rem;
      font-weight: 700;
    }
    .expense-tag {
      font-size: 0.82rem;
      color: #55606e;
      font-style: italic;
      font-weight: 600;
      margin-left: 0.4rem;
    }
    .debt-amount {
      font-family: 'Outfit', sans-serif;
      font-size: 1.1rem;
      font-weight: 800;
      color: #04AA6D;
      margin-right: 0.75rem;
    }
    .btn-sm {
      padding: 0.35rem 0.75rem;
      font-size: 0.8rem;
    }
    .category-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .category-item {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .cat-label {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      font-weight: 700;
      color: #1d2a35;
    }
    .progress-bar-bg {
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: #04AA6D;
      border-radius: 4px;
    }
    .activity-feed {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .activity-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding-bottom: 0.8rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .activity-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
    }
    .activity-icon.expense { background: #f1f5f9; }
    .activity-icon.settlement { background: #e7f9f0; }
    .activity-details {
      flex: 1;
    }
    .activity-title-row {
      display: flex;
      justify-content: space-between;
      font-weight: 700;
      font-size: 0.92rem;
      color: #1d2a35;
    }
    .act-amount.exp { color: #1d2a35; }
    .act-amount.settle { color: #04AA6D; }
    .activity-sub {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: #55606e;
      margin-top: 0.2rem;
    }
  `]
})
export class DashboardComponent implements OnInit {
  analyticsService = inject(AnalyticsService);
  authService = inject(AuthService);

  user = this.authService.currentUserSignal;
  summary: DashboardSummary | null = null;
  loading = true;

  ngOnInit(): void {
    this.analyticsService.getDashboard().subscribe({
      next: data => {
        this.summary = data;
        this.loading = false;
      },
      error: err => {
        console.error('Failed to load dashboard', err);
        this.loading = false;
      }
    });
  }

  getCategoryEmoji(category: string): string {
    switch (category.toLowerCase()) {
      case 'food': return '🍕';
      case 'accommodation': return '🏨';
      case 'travel': return '🚗';
      case 'entertainment': return '🎟️';
      case 'rent': return '🏠';
      case 'utilities': return '💡';
      default: return '📦';
    }
  }
}
