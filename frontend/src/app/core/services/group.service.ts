import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateGroupInput, Group, User } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  private apiUrl = 'http://localhost:5000/api/groups';

  constructor(private http: HttpClient) {}

  getMyGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(this.apiUrl);
  }

  getGroupById(id: number): Observable<Group> {
    return this.http.get<Group>(`${this.apiUrl}/${id}`);
  }

  createGroup(group: CreateGroupInput): Observable<Group> {
    return this.http.post<Group>(this.apiUrl, group);
  }

  joinGroup(inviteCode: string): Observable<Group> {
    return this.http.post<Group>(`${this.apiUrl}/join`, { inviteCode });
  }

  addMember(groupId: number, email: string): Observable<Group> {
    return this.http.post<Group>(`${this.apiUrl}/${groupId}/members`, { email });
  }

  searchAvailableUsers(query: string = '', excludeGroupId?: number): Observable<User[]> {
    let url = `http://localhost:5000/api/users?query=${encodeURIComponent(query)}`;
    if (excludeGroupId) {
      url += `&excludeGroupId=${excludeGroupId}`;
    }
    return this.http.get<User[]>(url);
  }
}
