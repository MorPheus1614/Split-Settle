import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GroupService } from '../../core/services/group.service';
import { Group } from '../../core/models/models';

@Component({
  selector: 'app-groups-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="groups-container">
      <div class="header-row">
        <div>
          <h1>My Expense <span class="accent">Groups</span> 👥</h1>
          <p class="subtitle">Manage shared trips, apartment rent, household budgets & events in Rupees (₹)</p>
        </div>
        <div class="action-buttons">
          <button (click)="showJoinModal = true" class="btn-secondary">
            🔑 Join via Code
          </button>
          <button (click)="showCreateModal = true" class="btn-primary">
            ➕ Create New Group
          </button>
        </div>
      </div>

      @if (loading) {
        <div class="loading-panel glass-panel">
          <div class="spinner"></div> Fetching your active groups...
        </div>
      } @else if (groups.length === 0) {
        <div class="empty-panel glass-panel">
          <div class="empty-icon">🏝️</div>
          <h2>No Groups Found</h2>
          <p>Create a new group or join an existing group with an invite code to start splitting expenses.</p>
          <button (click)="showCreateModal = true" class="btn-primary" style="margin-top: 1rem;">
            ➕ Create First Group
          </button>
        </div>
      } @else {
        <div class="groups-grid">
          @for (group of groups; track group.id) {
            <a [routerLink]="['/groups', group.id]" class="group-card glass-panel glass-panel-hover">
              <div class="card-header">
                <span class="group-type-badge" [ngClass]="group.groupType.toLowerCase()">
                  {{ getGroupEmoji(group.groupType) }} {{ group.groupType }}
                </span>
                <span class="invite-tag" title="Invite Code">Code: <strong>{{ group.inviteCode }}</strong></span>
              </div>

              <h2 class="group-title">{{ group.name }}</h2>
              <p class="group-desc">{{ group.description || 'No description provided.' }}</p>

              <div class="card-footer">
                <span class="members-count-tag">👥 {{ group.members.length }} Member{{ group.members.length === 1 ? '' : 's' }}</span>

                <div class="total-expense">
                  <span class="lbl">Total Expenses</span>
                  <span class="val">{{ group.totalExpenses | currency:'INR':'symbol':'1.2-2' }}</span>
                </div>
              </div>
            </a>
          }
        </div>
      }

      <!-- Create Group Modal -->
      @if (showCreateModal) {
        <div class="modal-overlay" (click)="showCreateModal = false">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <h2>➕ Create New Group</h2>
            <p class="modal-subtitle">Organize expenses for a trip, house, or event.</p>

            <form (ngSubmit)="onCreateGroup()" class="modal-form">
              <div class="form-group">
                <label class="form-label">Group Name</label>
                <input type="text" [(ngModel)]="newGroup.name" name="name" class="form-input" placeholder="e.g. Goa Trip 2026" required />
              </div>

              <div class="form-group">
                <label class="form-label">Group Type</label>
                <select [(ngModel)]="newGroup.groupType" name="groupType" class="form-select">
                  <option value="Trip">🌴 Trip / Vacation</option>
                  <option value="Home">🏠 Home / Apartment</option>
                  <option value="Event">🎉 Party / Event</option>
                  <option value="Other">📦 Other</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Description (Optional)</label>
                <textarea [(ngModel)]="newGroup.description" name="description" class="form-textarea" rows="2" placeholder="Brief details..."></textarea>
              </div>

              <div class="modal-actions">
                <button type="button" (click)="showCreateModal = false" class="btn-secondary">Cancel</button>
                <button type="submit" [disabled]="submitting" class="btn-primary">
                  {{ submitting ? 'Creating...' : 'Create Group' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Join Group Modal -->
      @if (showJoinModal) {
        <div class="modal-overlay" (click)="showJoinModal = false">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <h2>🔑 Join Group with Code</h2>
            <p class="modal-subtitle">Enter the invite code shared by your group admin.</p>

            <form (ngSubmit)="onJoinGroup()" class="modal-form">
              <div class="form-group">
                <label class="form-label">Invite Code</label>
                <input type="text" [(ngModel)]="joinInviteCode" name="inviteCode" class="form-input" placeholder="e.g. GOA2026TRIP" style="text-transform: uppercase;" required />
              </div>

              @if (joinError) {
                <div class="alert-error">⚠️ {{ joinError }}</div>
              }

              <div class="modal-actions">
                <button type="button" (click)="showJoinModal = false" class="btn-secondary">Cancel</button>
                <button type="submit" [disabled]="submitting" class="btn-primary">
                  {{ submitting ? 'Joining...' : 'Join Group' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .groups-container {
      max-width: 1280px;
      margin: 2rem auto;
      padding: 0 1.5rem;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .header-row h1 { font-size: 1.8rem; color: #1d2a35; }
    .subtitle { color: #55606e; font-size: 0.95rem; }
    .accent { color: #04AA6D; }
    .action-buttons { display: flex; gap: 0.75rem; }
    .loading-panel, .empty-panel {
      padding: 4rem;
      text-align: center;
      color: #55606e;
      background: #ffffff;
    }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
    .groups-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.5rem;
    }
    .group-card {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      text-decoration: none;
      color: #1d2a35;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      transition: all 0.2s ease;
    }
    .group-card:hover {
      border-color: #04AA6D;
      box-shadow: 0 8px 24px rgba(4, 170, 109, 0.15);
      transform: translateY(-2px);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    .group-type-badge {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.2rem 0.60rem;
      border-radius: 6px;
      background: #e7f9f0;
      color: #04AA6D;
    }
    .invite-tag {
      font-size: 0.75rem;
      color: #55606e;
      font-family: monospace;
    }
    .group-title {
      font-size: 1.25rem;
      color: #1d2a35;
      margin-bottom: 0.4rem;
    }
    .group-desc {
      font-size: 0.88rem;
      color: #55606e;
      margin-bottom: 1.25rem;
      flex: 1;
      line-clamp: 2;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 1rem;
      border-top: 1px solid #e2e8f0;
    }
    .members-avatars {
      display: flex;
      align-items: center;
    }
    .members-count-tag {
      font-size: 0.85rem;
      font-weight: 700;
      color: #55606e;
      background: #f1f5f9;
      padding: 0.25rem 0.65rem;
      border-radius: 6px;
    }
    .total-expense {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .total-expense .lbl { font-size: 0.72rem; color: #55606e; font-weight: 600; }
    .total-expense .val { font-family: 'Outfit', sans-serif; font-size: 1.1rem; font-weight: 800; color: #04AA6D; }
    .modal-subtitle { font-size: 0.88rem; color: #55606e; margin-bottom: 1.25rem; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }
    .alert-error {
      background: #fce8e6;
      border: 1px solid #c5221f;
      color: #c5221f;
      padding: 0.6rem 0.8rem;
      border-radius: 8px;
      font-size: 0.85rem;
      margin-top: 0.5rem;
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
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class GroupsListComponent implements OnInit {
  groupService = inject(GroupService);

  groups: Group[] = [];
  loading = true;
  showCreateModal = false;
  showJoinModal = false;
  submitting = false;
  joinError = '';

  newGroup = {
    name: '',
    description: '',
    groupType: 'Trip'
  };

  joinInviteCode = '';

  ngOnInit(): void {
    this.loadGroups();
  }

  loadGroups(): void {
    this.loading = true;
    this.groupService.getMyGroups().subscribe({
      next: data => {
        this.groups = data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  onCreateGroup(): void {
    if (!this.newGroup.name) return;
    this.submitting = true;
    this.groupService.createGroup(this.newGroup).subscribe({
      next: () => {
        this.submitting = false;
        this.showCreateModal = false;
        this.newGroup = { name: '', description: '', groupType: 'Trip' };
        this.loadGroups();
      },
      error: () => this.submitting = false
    });
  }

  onJoinGroup(): void {
    if (!this.joinInviteCode) return;
    this.submitting = true;
    this.joinError = '';
    this.groupService.joinGroup(this.joinInviteCode).subscribe({
      next: () => {
        this.submitting = false;
        this.showJoinModal = false;
        this.joinInviteCode = '';
        this.loadGroups();
      },
      error: err => {
        this.submitting = false;
        this.joinError = err.error?.message || 'Failed to join group with this code.';
      }
    });
  }

  getGroupEmoji(type: string): string {
    switch (type.toLowerCase()) {
      case 'trip': return '🌴';
      case 'home': return '🏠';
      case 'event': return '🎉';
      default: return '📦';
    }
  }
}
