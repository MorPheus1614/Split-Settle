export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface GroupMember {
  userId: number;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

export interface Group {
  id: number;
  name: string;
  description: string;
  groupType: string;
  inviteCode: string;
  createdById: number;
  createdAt: string;
  memberCount: number;
  totalExpenses: number;
  members: GroupMember[];
}

export interface CreateGroupInput {
  name: string;
  description: string;
  groupType: string;
}

export interface ExpenseSplitInput {
  userId: number;
  amount: number;
  percentage: number;
}

export interface CreateExpenseInput {
  title: string;
  amount: number;
  category: string;
  splitType: string; // 'Equal', 'Exact', 'Percentage'
  date?: string;
  notes?: string;
  splits?: ExpenseSplitInput[];
}

export interface ExpenseSplitResponse {
  userId: number;
  userName: string;
  userEmail: string;
  amount: number;
  percentage: number;
}

export interface Expense {
  id: number;
  groupId: number;
  paidById: number;
  paidByName: string;
  title: string;
  amount: number;
  category: string;
  splitType: string;
  date: string;
  notes?: string;
  createdAt: string;
  splits: ExpenseSplitResponse[];
}

export interface CreateSettlementInput {
  payeeId: number;
  amount: number;
  notes?: string;
}

export interface Settlement {
  id: number;
  groupId: number;
  payerId: number;
  payerName: string;
  payeeId: number;
  payeeName: string;
  amount: number;
  settlementDate: string;
  notes?: string;
}

export interface DebtTransaction {
  fromUserId: number;
  fromUserName: string;
  toUserId: number;
  toUserName: string;
  amount: number;
  description?: string;
}

export interface UserBalance {
  userId: number;
  userName: string;
  userEmail: string;
  netBalance: number;
}

export interface GroupBalanceSummary {
  groupId: number;
  groupName: string;
  totalGroupExpenses: number;
  memberBalances: UserBalance[];
  simplifiedDebts: DebtTransaction[];
}

export interface CategorySpending {
  category: string;
  totalAmount: number;
  percentage: number;
}

export interface RecentActivity {
  id: number;
  type: string;
  title: string;
  amount: number;
  userFullName: string;
  groupName: string;
  date: string;
}

export interface DashboardSummary {
  netBalance: number;
  youAreOwedTotal: number;
  youOweTotal: number;
  activeGroupsCount: number;
  categoryBreakdown: CategorySpending[];
  recentActivities: RecentActivity[];
  pendingActionableSettlements: DebtTransaction[];
}
