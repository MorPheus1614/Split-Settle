import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GroupService } from '../../core/services/group.service';
import { ExpenseService } from '../../core/services/expense.service';
import { SettlementService } from '../../core/services/settlement.service';
import { AuthService } from '../../core/services/auth.service';
import { Expense, Group, GroupBalanceSummary, User } from '../../core/models/models';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="detail-container">
      @if (loading) {
        <div class="loading-panel glass-panel">
          <div class="spinner"></div> Loading group workspace...
        </div>
      } @else if (group) {
        <!-- Group Header -->
        <div class="group-header glass-panel">
          <div class="header-main">
            <a routerLink="/groups" class="back-link">⬅ Back to Groups</a>
            <div class="title-row">
              <h2>{{ group.name }}</h2>
              <span class="group-type-badge">{{ group.groupType }}</span>
            </div>
            <p class="desc">{{ group.description }}</p>

            <div class="group-meta">
              <div class="meta-item">
                <span class="meta-label">Total Expenses</span>
                <span class="meta-val text-green">{{ group.totalExpenses | currency:'INR':'symbol':'1.2-2' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Members</span>
                <span class="meta-val">{{ group.memberCount }} People</span>
              </div>
              <div class="meta-item invite-box">
                <span class="meta-label">Invite Code</span>
                <div class="code-copy">
                  <code>{{ group.inviteCode }}</code>
                  <button (click)="copyInviteCode()" class="btn-copy">
                    {{ copiedCode ? '✓ Copied' : '📋 Copy' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="tab-bar">
          <button [class.active]="activeTab === 'expenses'" (click)="activeTab = 'expenses'">
            💸 Expenses ({{ expenses.length }})
          </button>
          <button [class.active]="activeTab === 'debts'" (click)="activeTab = 'debts'">
            ⚡ Debt Simplification & Settle Up
          </button>
          <button [class.active]="activeTab === 'members'" (click)="activeTab = 'members'">
            👥 Members ({{ group.members.length }})
          </button>
        </div>

        <!-- TAB 1: EXPENSES LIST -->
        @if (activeTab === 'expenses') {
          <div class="tab-content">
            <div class="content-header">
              <h3>Group Expenses</h3>
              <button (click)="openAddExpenseModal()" class="btn-primary">
                ➕ Add Expense
              </button>
            </div>

            @if (expenses.length === 0) {
              <div class="empty-panel glass-panel">
                <span>🧾</span> No expenses added to this group yet.
              </div>
            } @else {
              <div class="expenses-list">
                @for (exp of expenses; track exp.id) {
                  <div class="expense-card glass-panel glass-panel-hover">
                    <div class="exp-icon-col">
                      <span class="cat-emoji">{{ getCategoryEmoji(exp.category) }}</span>
                    </div>

                    <div class="exp-info-col">
                      <div class="exp-title-row">
                        <span class="exp-title">{{ exp.title }}</span>
                        <span class="badge badge-indigo">{{ exp.category }}</span>
                        <span class="badge badge-amber">{{ exp.splitType }} Split</span>
                      </div>
                      <div class="exp-sub">
                        <span>Paid by <strong>{{ exp.paidByName }}</strong></span>
                        <span class="dot">•</span>
                        <span>{{ exp.date | date:'mediumDate' }}</span>
                      </div>
                      @if (exp.notes) {
                        <p class="exp-notes">💬 "{{ exp.notes }}"</p>
                      }
                    </div>

                    <div class="exp-amount-col">
                      <span class="exp-amount">{{ exp.amount | currency:'INR':'symbol':'1.2-2' }}</span>
                      <div class="split-preview">
                        @for (sp of exp.splits; track sp.userId) {
                          <span class="split-chip" [title]="sp.userName + ': ' + (sp.amount | currency:'INR':'symbol':'1.2-2')">
                            {{ sp.userName }}: {{ sp.amount | currency:'INR':'symbol':'1.2-2' }}
                          </span>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- TAB 2: DEBT SIMPLIFICATION & SETTLE UP -->
        @if (activeTab === 'debts') {
          <div class="tab-content">
            <div class="debt-simplified-panel glass-panel">
              <div class="panel-header">
                <div>
                  <h3>⚡ Greedy Debt Simplification Plan</h3>
                  <p class="panel-sub">Minimizes total payment transactions between members using graph debt reduction algorithm.</p>
                </div>
                @if (userHasPendingDebt) {
                  <button (click)="openSettleUpModal()" class="btn-success">
                    🤝 Record Settlement / Settle Up
                  </button>
                }
              </div>

              <!-- Member Net Balances Overview -->
              <div class="net-balances-section">
                <h4>Member Net Balances</h4>
                <div class="balances-grid">
                  @for (mb of balanceSummary?.memberBalances; track mb.userId) {
                    <div class="balance-card glass-panel" [ngClass]="{
                      'pos': mb.netBalance > 0,
                      'neg': mb.netBalance < 0,
                      'zero': mb.netBalance === 0
                    }">
                      <div class="member-header-row">
                        <img src="newuser.webp" class="user-avatar-xs" alt="User" />
                        <span class="member-name">{{ mb.userName }}</span>
                      </div>
                      <span class="net-val">
                        {{ mb.netBalance > 0 ? '+' : '' }}{{ mb.netBalance | currency:'INR':'symbol':'1.2-2' }}
                      </span>
                      <span class="net-status">
                        {{ mb.netBalance > 0 ? 'is owed' : mb.netBalance < 0 ? 'owes' : 'settled' }}
                      </span>
                    </div>
                  }
                </div>
              </div>

              <!-- Optimized Debt Settlement Stream -->
              <div class="simplified-plan-section">
                <h4>Optimal Payment Transactions</h4>

                @if (!balanceSummary?.simplifiedDebts || balanceSummary?.simplifiedDebts?.length === 0) {
                  <div class="all-settled-box glass-panel">
                    <span>🎉</span> All members are completely settled up! No transactions needed.
                  </div>
                } @else {
                  <div class="transactions-flow">
                    @for (tx of balanceSummary?.simplifiedDebts; track $index) {
                      <div class="tx-card glass-panel">
                        <div class="tx-left">
                          <span class="user-pill payer">
                            <img src="newuser.webp" class="user-avatar-xs" alt="User" />
                            {{ tx.fromUserName }}
                          </span>
                          <span class="flow-arrow">pays ➔</span>
                          <span class="user-pill payee">
                            <img src="newuser.webp" class="user-avatar-xs" alt="User" />
                            {{ tx.toUserName }}
                          </span>
                          @if (tx.description) {
                            <span class="tx-desc">({{ tx.description }})</span>
                          }
                        </div>
                        <div class="tx-right">
                          <span class="tx-amount">{{ tx.amount | currency:'INR':'symbol':'1.2-2' }}</span>
                          @if (canSettleTx(tx)) {
                            <button (click)="settleDebtAction(tx)" class="btn-primary btn-sm">Settle Up</button>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- TAB 3: MEMBERS -->
        @if (activeTab === 'members') {
          <div class="tab-content">
            <div class="glass-panel member-panel">
              <div class="content-header">
                <h3>Group Members ({{ group.members.length }})</h3>
                <form (ngSubmit)="onAddMember()" class="add-member-form">
                  <div class="add-member-wrapper">
                    <div class="input-dropdown-container">
                      <input 
                        type="text" 
                        [(ngModel)]="newMemberEmail" 
                        name="email" 
                        class="form-input" 
                        placeholder="Search by name or enter email..." 
                        (focus)="onMemberInputFocus()"
                        (input)="onMemberInputChange()"
                        (blur)="onMemberInputBlur()"
                        autocomplete="off"
                        required 
                      />

                      @if (showUserDropdown && availableUsers.length > 0) {
                        <div class="user-suggestions-dropdown">
                          <div class="dropdown-header">Available Database Users (Click to select)</div>
                          @for (u of availableUsers; track u.id) {
                            <div class="suggestion-item" (mousedown)="selectUserToMemberInput(u)">
                              <img src="newuser.webp" class="user-avatar-xs" alt="User" />
                              <div class="sugg-info">
                                <span class="sugg-name">{{ u.name }}, <span class="sugg-email-text">{{ u.email }}</span></span>
                              </div>
                              <span class="sugg-role">{{ u.role }}</span>
                            </div>
                          }
                        </div>
                      }
                    </div>
                    <button type="submit" [disabled]="submittingMember" class="btn-primary">
                      ➕ Add Member
                    </button>
                  </div>
                </form>
              </div>

              @if (memberError) {
                <div class="alert-error">⚠️ {{ memberError }}</div>
              }

              <div class="members-table">
                @for (m of group.members; track m.userId) {
                  <div class="member-row">
                    <img src="newuser.webp" class="user-avatar-img" alt="User Avatar" />
                    <div class="member-info">
                      <span class="m-name">{{ m.name }}</span>
                      <span class="m-email">{{ m.email }}</span>
                    </div>
                    <span class="badge" [ngClass]="m.role === 'Admin' ? 'badge-amber' : 'badge-indigo'">
                      {{ m.role }}
                    </span>
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- ADD EXPENSE MODAL -->
        @if (showAddExpenseModal) {
          <div class="modal-overlay" (click)="showAddExpenseModal = false">
            <div class="modal-content" (click)="$event.stopPropagation()">
              <h2>➕ Add Expense</h2>
              <p class="modal-subtitle">Track a new bill or purchase in {{ group.name }}.</p>

              <form (ngSubmit)="onSubmitExpense()" class="modal-form">
                <div class="form-group">
                  <label class="form-label">Expense Title</label>
                  <input type="text" [(ngModel)]="expenseInput.title" name="title" class="form-input" placeholder="e.g. Villa Rental" required />
                </div>

                <div class="form-row">
                  <div class="form-group col">
                    <label class="form-label">Amount (₹)</label>
                    <input type="number" step="0.01" [(ngModel)]="expenseInput.amount" (input)="onAmountInputChange()" name="amount" class="form-input" placeholder="0.00" required />
                  </div>
                  <div class="form-group col">
                    <label class="form-label">Category</label>
                    <select [(ngModel)]="expenseInput.category" name="category" class="form-select">
                      <option value="General">📦 General</option>
                      <option value="Food">🍕 Food & Dining</option>
                      <option value="Accommodation">🏨 Accommodation</option>
                      <option value="Travel">🚗 Travel & Transport</option>
                      <option value="Entertainment">🎟️ Entertainment</option>
                      <option value="Rent">🏠 Rent & Utilities</option>
                    </select>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Split Method</label>
                  <select [(ngModel)]="expenseInput.splitType" (change)="onSplitTypeChange()" name="splitType" class="form-select">
                    <option value="Equal">⚖️ Equal Split (Split evenly among members)</option>
                    <option value="Exact">💲 Exact Amounts per Person</option>
                    <option value="Percentage">📊 Percentage Split (%)</option>
                  </select>
                </div>

                <!-- DYNAMIC MEMBER SPLIT SECTION -->
                @if (expenseInput.splitType === 'Equal') {
                  <div class="split-info-box">
                    <span>💡 Each of the {{ group.members.length }} members will owe <strong>{{ getEqualSplitAmount() | currency:'INR':'symbol':'1.2-2' }}</strong>.</span>
                  </div>
                } @else if (expenseInput.splitType === 'Exact') {
                  <div class="split-members-container">
                    <div class="split-header-row">
                      <span class="split-title">Enter exact amount for each member:</span>
                      <span class="split-status-badge" [ngClass]="isExactSplitValid ? 'valid' : 'invalid'">
                        Sum: {{ getExactSplitTotal() | currency:'INR':'symbol':'1.2-2' }} / {{ (expenseInput.amount || 0) | currency:'INR':'symbol':'1.2-2' }}
                      </span>
                    </div>

                    <div class="member-splits-list">
                      @for (ms of memberSplits; track ms.userId) {
                        <div class="member-split-row">
                          <img src="newuser.webp" class="user-avatar-xs" alt="User" />
                          <span class="ms-name">{{ ms.name }}</span>
                          <div class="ms-input-wrapper">
                            <span class="currency-symbol">₹</span>
                            <input 
                              type="number" 
                              step="0.01" 
                              [(ngModel)]="ms.amount" 
                              [name]="'exact_' + ms.userId" 
                              class="form-input ms-input" 
                              placeholder="0.00" 
                              required
                            />
                          </div>
                        </div>
                      }
                    </div>

                    @if (!isExactSplitValid) {
                      <div class="split-warning-msg">
                        ⚠️ Total exact split (₹{{ getExactSplitTotal().toFixed(2) }}) must equal total amount (₹{{ (expenseInput.amount || 0).toFixed(2) }}). Difference: ₹{{ getExactSplitDiff().toFixed(2) }}.
                      </div>
                    }
                  </div>
                } @else if (expenseInput.splitType === 'Percentage') {
                  <div class="split-members-container">
                    <div class="split-header-row">
                      <span class="split-title">Enter percentage for each member:</span>
                      <span class="split-status-badge" [ngClass]="isPercentageSplitValid ? 'valid' : 'invalid'">
                        Total: {{ getPercentageSplitTotal().toFixed(1) }}% / 100%
                      </span>
                    </div>

                    <div class="member-splits-list">
                      @for (ms of memberSplits; track ms.userId) {
                        <div class="member-split-row">
                          <img src="newuser.webp" class="user-avatar-xs" alt="User" />
                          <span class="ms-name">{{ ms.name }}</span>
                          <div class="ms-input-wrapper">
                            <input 
                              type="number" 
                              step="0.1" 
                              [(ngModel)]="ms.percentage" 
                              [name]="'percent_' + ms.userId" 
                              class="form-input ms-input" 
                              placeholder="0" 
                              required
                            />
                            <span class="percent-symbol">%</span>
                            <span class="calculated-amt">({{ getCalculatedMemberAmount(ms.percentage) | currency:'INR':'symbol':'1.2-2' }})</span>
                          </div>
                        </div>
                      }
                    </div>

                    @if (!isPercentageSplitValid) {
                      <div class="split-warning-msg">
                        ⚠️ Total percentages ({{ getPercentageSplitTotal().toFixed(1) }}%) must equal 100%. Remaining: {{ (100 - getPercentageSplitTotal()).toFixed(1) }}%.
                      </div>
                    }
                  </div>
                }

                @if (splitFormError) {
                  <div class="alert-error margin-bottom">⚠️ {{ splitFormError }}</div>
                }

                <div class="form-group">
                  <label class="form-label">Notes (Optional)</label>
                  <input type="text" [(ngModel)]="expenseInput.notes" name="notes" class="form-input" placeholder="Add extra detail..." />
                </div>

                <div class="modal-actions">
                  <button type="button" (click)="showAddExpenseModal = false" class="btn-secondary">Cancel</button>
                  <button type="submit" [disabled]="submitting" class="btn-primary">Save Expense</button>
                </div>
              </form>
            </div>
          </div>
        }

        <!-- SETTLE UP MODAL -->
        @if (showSettleUpModal) {
          <div class="modal-overlay" (click)="showSettleUpModal = false">
            <div class="modal-content" (click)="$event.stopPropagation()">
              <h2>🤝 Settle Up Payment</h2>
              <p class="modal-subtitle">Record a payment made to clear a debt.</p>

              <form (ngSubmit)="onSubmitSettlement()" class="modal-form">
                <div class="form-group">
                  <label class="form-label">Pay To (Payee)</label>
                  <select [(ngModel)]="settlePayeeId" name="payeeId" class="form-select">
                    @for (m of otherMembers; track m.userId) {
                      <option [value]="m.userId">{{ m.name }} ({{ m.email }})</option>
                    }
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Amount Paid (₹)</label>
                  <input type="number" step="0.01" [(ngModel)]="settleAmount" name="amount" class="form-input" placeholder="0.00" required />
                </div>

                <div class="form-group">
                  <label class="form-label">Payment Note (Optional)</label>
                  <input type="text" [(ngModel)]="settleNotes" name="notes" class="form-input" placeholder="e.g. Paid via UPI / Venmo" />
                </div>

                <div class="modal-actions">
                  <button type="button" (click)="showSettleUpModal = false" class="btn-secondary">Cancel</button>
                  <button type="submit" [disabled]="submitting" class="btn-success">Record Payment</button>
                </div>
              </form>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .detail-container { max-width: 1280px; margin: 2rem auto; padding: 0 1.5rem; }
    .loading-panel, .empty-panel { padding: 4rem; text-align: center; color: #55606e; background: #ffffff; }
    .back-link { color: #55606e; text-decoration: none; font-size: 0.88rem; font-weight: 700; display: inline-block; margin-bottom: 0.75rem; }
    .back-link:hover { color: #04AA6D; }
    .group-header { padding: 1.75rem 2rem; margin-bottom: 1.5rem; background: #ffffff; }
    .title-row { display: flex; align-items: center; gap: 0.75rem; }
    .title-row h2 { font-size: 1.8rem; color: #1d2a35; }
    .group-type-badge { font-size: 0.8rem; font-weight: 700; background: #e7f9f0; color: #04AA6D; padding: 0.2rem 0.6rem; border-radius: 6px; }
    .desc { color: #55606e; margin-top: 0.3rem; margin-bottom: 1.25rem; }
    .group-meta { display: flex; gap: 2.5rem; border-top: 1px solid #e2e8f0; padding-top: 1rem; flex-wrap: wrap; }
    .meta-item { display: flex; flex-direction: column; }
    .meta-label { font-size: 0.75rem; color: #55606e; text-transform: uppercase; font-weight: 700; }
    .meta-val { font-family: 'Outfit', sans-serif; font-size: 1.2rem; font-weight: 800; color: #1d2a35; }
    .text-green { color: #04AA6D; }
    .code-copy { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.2rem; }
    .code-copy code { background: #f1f5f9; padding: 0.2rem 0.6rem; border-radius: 6px; font-weight: 700; color: #04AA6D; border: 1px solid #cbd5e1; }
    .btn-copy { background: transparent; border: none; color: #55606e; font-size: 0.8rem; cursor: pointer; font-weight: 700; }
    .tab-bar { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; }
    .tab-bar button { background: transparent; border: none; color: #55606e; font-weight: 700; font-size: 0.95rem; padding: 0.6rem 1.2rem; border-radius: 8px; cursor: pointer; transition: all 0.2s ease; }
    .tab-bar button.active { background: #04AA6D; color: #ffffff; }
    .content-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
    .content-header h3 { color: #1d2a35; }
    .expenses-list { display: flex; flex-direction: column; gap: 1rem; }
    .expense-card { padding: 1.25rem 1.5rem; display: flex; align-items: center; gap: 1.25rem; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; }
    .exp-icon-col { width: 44px; height: 44px; background: #e7f9f0; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; }
    .exp-info-col { flex: 1; }
    .exp-title-row { display: flex; align-items: center; gap: 0.5rem; }
    .exp-title { font-weight: 700; font-size: 1.05rem; color: #1d2a35; }
    .exp-sub { font-size: 0.82rem; color: #55606e; margin-top: 0.2rem; }
    .dot { margin: 0 0.3rem; }
    .exp-notes { font-size: 0.82rem; color: #8896a6; font-style: italic; margin-top: 0.2rem; }
    .exp-amount-col { display: flex; flex-direction: column; align-items: flex-end; }
    .exp-amount { font-family: 'Outfit', sans-serif; font-size: 1.3rem; font-weight: 800; color: #1d2a35; }
    .split-preview { display: flex; gap: 0.3rem; margin-top: 0.3rem; flex-wrap: wrap; }
    .split-chip { font-size: 0.72rem; background: #f1f5f9; padding: 0.15rem 0.5rem; border-radius: 4px; color: #55606e; font-weight: 600; border: 1px solid #e2e8f0; }
    .debt-simplified-panel { padding: 1.75rem; background: #ffffff; }
    .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .panel-header h3 { color: #1d2a35; }
    .panel-sub { font-size: 0.85rem; color: #55606e; }
    .net-balances-section h4, .simplified-plan-section h4 { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: #55606e; margin-bottom: 0.75rem; font-weight: 700; }
    .balances-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .balance-card { padding: 1rem; display: flex; flex-direction: column; text-align: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; }
    .balance-card.pos { border-color: #04AA6D; background: #e7f9f0; }
    .balance-card.neg { border-color: #e53935; background: #fce8e6; }
    .member-header-row { display: flex; align-items: center; justify-content: center; gap: 0.4rem; margin-bottom: 0.3rem; }
    .user-avatar-img { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 2px solid #04AA6D; background: #ffffff; flex-shrink: 0; }
    .user-avatar-xs { width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 1.5px solid #04AA6D; background: #ffffff; flex-shrink: 0; vertical-align: middle; }
    .member-name { font-weight: 700; font-size: 0.9rem; color: #1d2a35; }
    .net-val { font-family: 'Outfit', sans-serif; font-size: 1.3rem; font-weight: 800; margin: 0.2rem 0; }
    .balance-card.pos .net-val { color: #04AA6D; }
    .balance-card.neg .net-val { color: #c5221f; }
    .net-status { font-size: 0.75rem; color: #55606e; text-transform: uppercase; font-weight: 700; }
    .all-settled-box { padding: 2rem; text-align: center; color: #04AA6D; font-weight: 700; background: #e7f9f0; border-radius: 10px; }
    .transactions-flow { display: flex; flex-direction: column; gap: 0.75rem; }
    .tx-card { padding: 1rem 1.25rem; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; }
    .user-pill { font-weight: 700; font-size: 0.95rem; color: #1d2a35; }
    .flow-arrow { color: #04AA6D; font-size: 0.85rem; font-weight: 700; margin: 0 0.75rem; }
    .tx-desc { font-size: 0.85rem; color: #55606e; font-style: italic; font-weight: 600; margin-left: 0.5rem; }
    .tx-amount { font-family: 'Outfit', sans-serif; font-size: 1.2rem; font-weight: 800; color: #04AA6D; margin-right: 1rem; }
    .member-panel { padding: 1.5rem; background: #ffffff; }
    .add-member-wrapper { display: flex; gap: 0.5rem; align-items: center; position: relative; }
    .input-dropdown-container { position: relative; min-width: 300px; }
    .user-suggestions-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: #ffffff;
      border: 1px solid #04AA6D;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      z-index: 100;
      max-height: 240px;
      overflow-y: auto;
      margin-top: 4px;
    }
    .dropdown-header { font-size: 0.7rem; text-transform: uppercase; font-weight: 700; color: #55606e; padding: 0.4rem 0.8rem; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .suggestion-item { display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem 0.8rem; cursor: pointer; transition: background 0.15s; }
    .suggestion-item:hover { background: #e7f9f0; }
    .avatar-sm { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
    .sugg-info { flex: 1; display: flex; flex-direction: column; }
    .sugg-name { font-size: 0.85rem; font-weight: 700; color: #1d2a35; }
    .sugg-email-text { font-size: 0.78rem; color: #55606e; font-weight: 400; }
    .sugg-role { font-size: 0.7rem; font-weight: 700; color: #04AA6D; background: #e7f9f0; padding: 0.1rem 0.4rem; border-radius: 4px; }
    .members-table { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem; }
    .member-row { display: flex; align-items: center; gap: 1rem; padding: 0.85rem 1.2rem; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
    .avatar-lg { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
    .member-info { flex: 1; display: flex; flex-direction: column; justify-content: center; }
    .m-name { font-weight: 700; font-size: 0.98rem; color: #1d2a35; }
    .m-email { font-size: 0.82rem; color: #55606e; margin-top: 0.15rem; }
    .badge { padding: 0.35rem 0.85rem; border-radius: 20px; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
    .badge-amber { background: #fef3c7; color: #b45309; }
    .badge-indigo { background: #e7f9f0; color: #04AA6D; }
    .alert-error { background: #fce8e6; border: 1px solid #c5221f; color: #c5221f; padding: 0.6rem 0.8rem; border-radius: 8px; font-size: 0.85rem; margin-top: 0.5rem; }
    .split-info-box { background: #e7f9f0; border: 1px solid #04AA6D; border-radius: 8px; padding: 0.75rem 1rem; font-size: 0.88rem; color: #1d2a35; margin-bottom: 1.25rem; }
    .split-members-container { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 1rem; margin-bottom: 1.25rem; }
    .split-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
    .split-title { font-size: 0.82rem; font-weight: 700; color: #55606e; text-transform: uppercase; }
    .split-status-badge { font-size: 0.78rem; font-weight: 800; padding: 0.2rem 0.6rem; border-radius: 6px; }
    .split-status-badge.valid { background: #e7f9f0; color: #04AA6D; border: 1px solid #04AA6D; }
    .split-status-badge.invalid { background: #fce8e6; color: #c5221f; border: 1px solid #c5221f; }
    .member-splits-list { display: flex; flex-direction: column; gap: 0.6rem; max-height: 200px; overflow-y: auto; padding-right: 0.3rem; }
    .member-split-row { display: flex; justify-content: space-between; align-items: center; background: #ffffff; padding: 0.5rem 0.8rem; border-radius: 8px; border: 1px solid #e2e8f0; }
    .ms-name { font-weight: 700; font-size: 0.9rem; color: #1d2a35; }
    .ms-input-wrapper { display: flex; align-items: center; gap: 0.3rem; }
    .currency-symbol, .percent-symbol { font-weight: 700; color: #55606e; font-size: 0.9rem; }
    .ms-input { width: 90px !important; padding: 0.35rem 0.5rem !important; text-align: right; font-weight: 700; font-size: 0.9rem !important; }
    .calculated-amt { font-size: 0.78rem; color: #04AA6D; font-weight: 700; margin-left: 0.3rem; }
    .split-warning-msg { margin-top: 0.75rem; background: #fce8e6; border: 1px solid #c5221f; color: #c5221f; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.82rem; font-weight: 600; }
    .margin-bottom { margin-bottom: 1.25rem; }
    .spinner { display: inline-block; width: 24px; height: 24px; border: 3px solid #e2e8f0; border-radius: 50%; border-top-color: #04AA6D; animation: spin 0.8s linear infinite; margin-right: 0.5rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class GroupDetailComponent implements OnInit {
  route = inject(ActivatedRoute);
  groupService = inject(GroupService);
  expenseService = inject(ExpenseService);
  settlementService = inject(SettlementService);
  authService = inject(AuthService);

  groupId = 0;
  group: Group | null = null;
  expenses: Expense[] = [];
  balanceSummary: GroupBalanceSummary | null = null;
  loading = true;
  activeTab: 'expenses' | 'debts' | 'members' = 'expenses';
  copiedCode = false;

  showAddExpenseModal = false;
  showSettleUpModal = false;
  submitting = false;

  expenseInput = {
    title: '',
    amount: null as number | null,
    category: 'General',
    splitType: 'Equal',
    notes: ''
  };

  settlePayeeId: number = 0;
  settleAmount: number | null = null;
  settleNotes: string = '';

  newMemberEmail = '';
  submittingMember = false;
  memberError = '';

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.groupId = +params['id'];
      this.loadGroupData();
    });
  }

  loadGroupData(): void {
    this.loading = true;
    this.groupService.getGroupById(this.groupId).subscribe({
      next: data => {
        this.group = data;
        this.loadExpenses();
        this.loadBalances();
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  loadExpenses(): void {
    this.expenseService.getExpenses(this.groupId).subscribe({
      next: data => this.expenses = data
    });
  }

  loadBalances(): void {
    this.settlementService.getGroupBalances(this.groupId).subscribe({
      next: data => this.balanceSummary = data
    });
  }

  copyInviteCode(): void {
    if (this.group?.inviteCode) {
      navigator.clipboard.writeText(this.group.inviteCode);
      this.copiedCode = true;
      setTimeout(() => this.copiedCode = false, 2000);
    }
  }

  memberSplits: { userId: number; name: string; amount: number | null; percentage: number | null }[] = [];
  splitFormError = '';

  initMemberSplits(): void {
    if (!this.group || !this.group.members) return;
    const count = this.group.members.length || 1;
    const totalAmt = this.expenseInput.amount || 0;

    const baseExact = totalAmt > 0 ? Math.floor((totalAmt / count) * 100) / 100 : 0;
    let exactRemainder = totalAmt > 0 ? Math.round((totalAmt - (baseExact * count)) * 100) / 100 : 0;

    const basePercent = Math.floor((100 / count) * 10) / 10;
    let percentRemainder = Math.round((100 - (basePercent * count)) * 10) / 10;

    this.memberSplits = this.group.members.map((m, idx) => {
      let amt = baseExact;
      if (idx === 0 && exactRemainder > 0) {
        amt = Math.round((amt + exactRemainder) * 100) / 100;
      }
      let pct = basePercent;
      if (idx === 0 && percentRemainder > 0) {
        pct = Math.round((pct + percentRemainder) * 10) / 10;
      }
      return {
        userId: m.userId,
        name: m.name,
        amount: amt,
        percentage: pct
      };
    });
  }

  onSplitTypeChange(): void {
    this.initMemberSplits();
  }

  onAmountInputChange(): void {
    if (this.expenseInput.splitType === 'Equal') return;
    if (this.expenseInput.splitType === 'Exact' && this.group?.members) {
      const count = this.group.members.length || 1;
      const totalAmt = this.expenseInput.amount || 0;
      const baseExact = totalAmt > 0 ? Math.floor((totalAmt / count) * 100) / 100 : 0;
      let exactRemainder = totalAmt > 0 ? Math.round((totalAmt - (baseExact * count)) * 100) / 100 : 0;

      this.memberSplits.forEach((s, idx) => {
        let amt = baseExact;
        if (idx === 0 && exactRemainder > 0) {
          amt = Math.round((amt + exactRemainder) * 100) / 100;
        }
        s.amount = amt;
      });
    }
  }

  getExactSplitTotal(): number {
    return Math.round(this.memberSplits.reduce((acc, curr) => acc + (curr.amount || 0), 0) * 100) / 100;
  }

  getExactSplitDiff(): number {
    return Math.abs((this.expenseInput.amount || 0) - this.getExactSplitTotal());
  }

  get isExactSplitValid(): boolean {
    if (!this.expenseInput.amount || this.expenseInput.amount <= 0) return true;
    return this.getExactSplitDiff() <= 0.1;
  }

  getPercentageSplitTotal(): number {
    return Math.round(this.memberSplits.reduce((acc, curr) => acc + (curr.percentage || 0), 0) * 10) / 10;
  }

  get isPercentageSplitValid(): boolean {
    return Math.abs(100 - this.getPercentageSplitTotal()) <= 0.2;
  }

  getCalculatedMemberAmount(percentage: number | null): number {
    const pct = percentage || 0;
    const total = this.expenseInput.amount || 0;
    return (total * pct) / 100;
  }

  getEqualSplitAmount(): number {
    const count = this.group?.members.length || 1;
    return (this.expenseInput.amount || 0) / count;
  }

  openAddExpenseModal(): void {
    this.expenseInput = { title: '', amount: null, category: 'General', splitType: 'Equal', notes: '' };
    this.splitFormError = '';
    this.initMemberSplits();
    this.showAddExpenseModal = true;
  }

  onSubmitExpense(): void {
    this.splitFormError = '';
    if (!this.expenseInput.title || !this.expenseInput.amount || this.expenseInput.amount <= 0) return;

    if (this.expenseInput.splitType === 'Exact' && !this.isExactSplitValid) {
      this.splitFormError = `Sum of exact amounts (₹${this.getExactSplitTotal().toFixed(2)}) must equal total amount (₹${(this.expenseInput.amount || 0).toFixed(2)}).`;
      return;
    }

    if (this.expenseInput.splitType === 'Percentage' && !this.isPercentageSplitValid) {
      this.splitFormError = `Sum of percentages (${this.getPercentageSplitTotal().toFixed(1)}%) must equal 100%.`;
      return;
    }

    this.submitting = true;

    const splitsPayload = this.memberSplits.map(s => ({
      userId: s.userId,
      amount: Number(s.amount || 0),
      percentage: Number(s.percentage || 0)
    }));

    this.expenseService.addExpense(this.groupId, {
      title: this.expenseInput.title,
      amount: this.expenseInput.amount,
      category: this.expenseInput.category,
      splitType: this.expenseInput.splitType,
      notes: this.expenseInput.notes,
      splits: splitsPayload
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.showAddExpenseModal = false;
        this.loadGroupData();
      },
      error: err => {
        this.submitting = false;
        this.splitFormError = err.error?.message || 'Failed to add expense.';
      }
    });
  }

  openSettleUpModal(): void {
    if (this.otherMembers.length > 0) {
      this.settlePayeeId = this.otherMembers[0].userId;
    }
    this.settleAmount = null;
    this.settleNotes = '';
    this.showSettleUpModal = true;
  }

  settleDebtAction(tx: any): void {
    this.settlePayeeId = tx.toUserId;
    this.settleAmount = tx.amount;
    this.settleNotes = `Payment to settle debt of ₹${tx.amount}`;
    this.showSettleUpModal = true;
  }

  onSubmitSettlement(): void {
    if (!this.settlePayeeId || !this.settleAmount || this.settleAmount <= 0) return;
    this.submitting = true;

    this.settlementService.createSettlement(this.groupId, {
      payeeId: Number(this.settlePayeeId),
      amount: this.settleAmount,
      notes: this.settleNotes
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.showSettleUpModal = false;
        this.loadGroupData();
      },
      error: () => this.submitting = false
    });
  }

  availableUsers: User[] = [];
  showUserDropdown = false;

  onMemberInputFocus(): void {
    this.fetchAvailableUsers();
  }

  onMemberInputChange(): void {
    this.fetchAvailableUsers();
  }

  onMemberInputBlur(): void {
    setTimeout(() => this.showUserDropdown = false, 200);
  }

  fetchAvailableUsers(): void {
    this.groupService.searchAvailableUsers(this.newMemberEmail, this.groupId).subscribe({
      next: users => {
        this.availableUsers = users;
        this.showUserDropdown = users.length > 0;
      },
      error: () => this.availableUsers = []
    });
  }

  selectUserToMemberInput(user: User): void {
    this.newMemberEmail = user.email;
    this.showUserDropdown = false;
  }

  onAddMember(): void {
    if (!this.newMemberEmail) return;
    this.submittingMember = true;
    this.memberError = '';

    this.groupService.addMember(this.groupId, this.newMemberEmail).subscribe({
      next: updated => {
        this.group = updated;
        this.newMemberEmail = '';
        this.showUserDropdown = false;
        this.submittingMember = false;
        this.loadBalances();
      },
      error: err => {
        this.submittingMember = false;
        this.memberError = err.error?.message || 'Failed to add member.';
      }
    });
  }

  get currentUserId(): number | undefined {
    return this.authService.currentUserSignal()?.id;
  }

  canSettleTx(tx: any): boolean {
    return tx.fromUserId === this.currentUserId;
  }

  get userHasPendingDebt(): boolean {
    const curId = this.currentUserId;
    if (!curId || !this.balanceSummary?.simplifiedDebts) return false;
    return this.balanceSummary.simplifiedDebts.some(tx => tx.fromUserId === curId);
  }

  get isGroupAdmin(): boolean {
    const curId = this.authService.currentUserSignal()?.id;
    if (!curId || !this.group) return false;
    const curMember = this.group.members.find(m => m.userId === curId);
    return curMember?.role?.toLowerCase() === 'admin' || this.group.createdById === curId;
  }

  get otherMembers() {
    const curId = this.authService.currentUserSignal()?.id;
    return this.group?.members.filter(m => m.userId !== curId) || [];
  }

  getCategoryEmoji(cat: string): string {
    switch (cat.toLowerCase()) {
      case 'food': return '🍕';
      case 'accommodation': return '🏨';
      case 'travel': return '🚗';
      case 'entertainment': return '🎟️';
      case 'rent': return '🏠';
      default: return '📦';
    }
  }
}
