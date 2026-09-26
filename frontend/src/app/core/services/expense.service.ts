import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateExpenseInput, Expense } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
  private baseUrl = 'http://localhost:5000/api/groups';

  constructor(private http: HttpClient) {}

  getExpenses(groupId: number): Observable<Expense[]> {
    return this.http.get<Expense[]>(`${this.baseUrl}/${groupId}/expenses`);
  }

  addExpense(groupId: number, expense: CreateExpenseInput): Observable<Expense> {
    return this.http.post<Expense>(`${this.baseUrl}/${groupId}/expenses`, expense);
  }

  deleteExpense(groupId: number, expenseId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${groupId}/expenses/${expenseId}`);
  }
}
