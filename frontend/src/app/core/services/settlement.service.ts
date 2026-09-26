import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateSettlementInput, GroupBalanceSummary, Settlement } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class SettlementService {
  private baseUrl = 'http://localhost:5000/api/groups';

  constructor(private http: HttpClient) {}

  getGroupBalances(groupId: number): Observable<GroupBalanceSummary> {
    return this.http.get<GroupBalanceSummary>(`${this.baseUrl}/${groupId}/balances`);
  }

  getSettlements(groupId: number): Observable<Settlement[]> {
    return this.http.get<Settlement[]>(`${this.baseUrl}/${groupId}/settlements`);
  }

  createSettlement(groupId: number, settlement: CreateSettlementInput): Observable<Settlement> {
    return this.http.post<Settlement>(`${this.baseUrl}/${groupId}/settlements`, settlement);
  }
}
