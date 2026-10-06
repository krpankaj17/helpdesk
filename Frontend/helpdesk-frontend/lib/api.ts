import { 
  User, 
  Ticket, 
  TicketCategory, 
  Priority, 
  SlaPolicy, 
  DashboardMetrics, 
  TicketStatus, 
  UserRole, 
  CreateTicketRequest, 
  CreateUserRequest, 
  TicketComment, 
  TicketNote, 
  TicketActivity,
  TicketAssignment,
  NotificationItem,
  Role,
  Permission,
  PaginatedResponse,
  AttachmentResponse
} from '@/types';

// Connect to Spring Boot backend directly, or through Next.js reverse proxy (/backend-api)
const BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : (typeof window !== 'undefined'
      ? '/backend-api'
      : (process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8080'));

export class ApiError extends Error {
  status: number;
  error: string;
  details?: Record<string, string>;

  constructor(status: number, error: string, message: string, details?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.error = error;
    this.details = details;
  }
}

class TokenStorage {
  private isBrowser = typeof window !== 'undefined';

  getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem('helpdesk_access_token');
  }

  setToken(token: string) {
    if (this.isBrowser) {
      localStorage.setItem('helpdesk_access_token', token);
    }
  }

  getRefreshToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem('helpdesk_refresh_token');
  }

  setRefreshToken(token: string) {
    if (this.isBrowser) {
      localStorage.setItem('helpdesk_refresh_token', token);
    }
  }

  clear() {
    if (this.isBrowser) {
      localStorage.removeItem('helpdesk_access_token');
      localStorage.removeItem('helpdesk_refresh_token');
      localStorage.removeItem('helpdesk_current_user');
    }
  }
}

export const tokenStorage = new TokenStorage();

export function isTokenExpiring(token: string | null, bufferSeconds = 60): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return true;
    return (payload.exp * 1000 - Date.now()) < (bufferSeconds * 1000);
  } catch {
    return true;
  }
}

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  const currentRefresh = tokenStorage.getRefreshToken();
  if (!currentRefresh) return null;

  try {
    const res = await fetch(`${BASE_URL}/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ refreshToken: currentRefresh }),
    });

    if (!res.ok) {
      tokenStorage.clear();
      return null;
    }

    const data = await res.json().catch(() => null);
    if (data?.accessToken) {
      tokenStorage.setToken(data.accessToken);
      if (data.refreshToken) {
        tokenStorage.setRefreshToken(data.refreshToken);
      }
      return data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const isAuthEndpoint = endpoint === '/login' || endpoint === '/refresh-token' || endpoint === '/refresh';

  // Proactive silent refresh: if token has expired or is expiring in < 60s, refresh before sending
  if (!isAuthEndpoint) {
    const currentTok = tokenStorage.getToken();
    if (currentTok && isTokenExpiring(currentTok, 60)) {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      await refreshPromise;
    }
  }

  const token = tokenStorage.getToken();
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    throw new ApiError(
      500,
      'Internal Server Error',
      'Internal Server Error'
    );
  }

  // Handle empty successful responses (204 No Content)
  if (response.status === 204) {
    return {} as T;
  }

  // Parse response body
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const errorTitle = data?.error || `HTTP ${response.status}`;
    const errorMessage = data?.message || (data?.error ? data.error : response.statusText);
    const details = data?.details as Record<string, string> | undefined;

    if (response.status === 401) {
      // Attempt silent auto-refresh if not already retried and not on auth endpoints
      if (!isRetry && endpoint !== '/login' && endpoint !== '/refresh-token' && endpoint !== '/refresh') {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }
        const newToken = await refreshPromise;
        if (newToken) {
          // Retry the original request with the new access token
          return request<T>(endpoint, options, true);
        }
      }

      tokenStorage.clear();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
      throw new ApiError(401, 'Unauthorized', errorMessage || 'Session expired. Please log in again.');
    }

    if (response.status === 403) {
      throw new ApiError(403, 'Forbidden', errorMessage || 'You do not have permission to perform this action.');
    }

    throw new ApiError(response.status, errorTitle, errorMessage || 'Request failed', details);
  }

  return data as T;
}

export const api = {
  auth: {
    async login(email: string, password: string): Promise<{ accessToken: string; refreshToken: string; user: User }> {
      const res = await request<{ accessToken: string; refreshToken: string; tokenType: string; expiresIn: number }>('/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      tokenStorage.setToken(res.accessToken);
      tokenStorage.setRefreshToken(res.refreshToken);

      // Fetch authenticated user profile from /users/me
      const user = await api.users.getMe();
      if (typeof window !== 'undefined') {
        localStorage.setItem('helpdesk_current_user', JSON.stringify(user));
      }

      return {
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        user,
      };
    },

    async refreshToken(): Promise<{ accessToken: string; refreshToken: string }> {
      const newToken = await refreshAccessToken();
      const currentRefresh = tokenStorage.getRefreshToken();
      if (!newToken || !currentRefresh) {
        throw new ApiError(401, 'Unauthorized', 'Session expired. Please log in again.');
      }
      return {
        accessToken: newToken,
        refreshToken: currentRefresh,
      };
    },

    logout() {
      tokenStorage.clear();
    }
  },

  tickets: {
    async getPaginated(params?: {
      search?: string;
      status?: TicketStatus;
      priorityId?: number;
      categoryId?: number;
      unassigned?: boolean;
      agentEmail?: string;
      page?: number;
      size?: number;
      sort?: string;
    }): Promise<PaginatedResponse<Ticket>> {
      const query = new URLSearchParams();
      if (params?.search) query.append('search', params.search);
      if (params?.status) query.append('status', params.status);
      if (params?.priorityId) query.append('priorityId', params.priorityId.toString());
      if (params?.categoryId) query.append('categoryId', params.categoryId.toString());
      if (params?.unassigned) query.append('unassigned', 'true');
      if (params?.agentEmail) query.append('agentEmail', params.agentEmail);
      if (params?.sort) query.append('sort', params.sort);
      query.append('page', (params?.page ?? 0).toString());
      query.append('size', (params?.size ?? 10).toString());

      const data = await request<PaginatedResponse<Ticket>>(`/ticket?${query.toString()}`);
      let ticketList = data?.content || [];

      // If backend hasn't populated assignedAgentName directly, enrich active assignments
      const needsEnrichment = ticketList.some(t => !t.assignedAgentName && !t.assignedAgentEmail);
      if (needsEnrichment && ticketList.length > 0) {
        try {
          const enrichPromises = ticketList.map(async (t) => {
            if (t.assignedAgentName) return t;
            try {
              const assignments = await request<TicketAssignment[]>(`/ticket/${t.ticketPublicId}/assignments`).catch(() => []);
              const active = assignments?.find(a => a.isActive);
              if (active) {
                return {
                  ...t,
                  assignedAgentPublicId: active.assignedToPublicId,
                  assignedAgentName: active.assignedToName,
                  assignedAgentEmail: active.assignedToEmail,
                };
              }
            } catch {
              // Ignore individual lookup errors
            }
            return t;
          });
          ticketList = await Promise.all(enrichPromises);
        } catch {
          // If bulk enrichment fails, return base tickets
        }
      }

      return {
        content: ticketList,
        totalElements: data?.totalElements ?? ticketList.length,
        totalPages: data?.totalPages ?? 1,
        number: data?.number ?? (params?.page ?? 0),
        size: data?.size ?? (params?.size ?? 10),
        first: data?.first ?? true,
        last: data?.last ?? true,
        empty: data?.empty ?? ticketList.length === 0,
      };
    },

    async getAll(params?: {
      search?: string;
      status?: TicketStatus;
      priorityId?: number;
      categoryId?: number;
      unassigned?: boolean;
      agentEmail?: string;
      page?: number;
      size?: number;
    }): Promise<Ticket[]> {
      const pageData = await this.getPaginated({
        ...params,
        size: params?.size ?? 100,
      });
      return pageData.content;
    },

    async getById(publicId: string): Promise<Ticket> {
      return await request<Ticket>(`/ticket/${publicId}`);
    },

    async create(ticketReq: CreateTicketRequest): Promise<Ticket> {
      return await request<Ticket>('/ticket', {
        method: 'POST',
        body: JSON.stringify(ticketReq),
      });
    },


    async updateStatus(publicId: string, status: TicketStatus, resolutionNote?: string): Promise<Ticket> {
      return await request<Ticket>(`/ticket/${publicId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          status, 
          resolutionNote: resolutionNote || undefined 
        }),
      });
    },

    async updateCategory(publicId: string, categoryId: number): Promise<Ticket> {
      return await request<Ticket>(`/ticket/${publicId}/category`, {
        method: 'PATCH',
        body: JSON.stringify({ categoryId }),
      });
    },

    async assign(publicId: string, agentEmail: string): Promise<TicketAssignment> {
      return await request<TicketAssignment>(`/ticket/${publicId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ agentEmail }),
      });
    },

    async getAssignments(publicId: string): Promise<TicketAssignment[]> {
      return await request<TicketAssignment[]>(`/ticket/${publicId}/assignments`);
    },

    async getDashboardMetrics(): Promise<DashboardMetrics> {
      return await request<DashboardMetrics>('/ticket/dashboard');
    },

    async getActivities(publicId: string): Promise<TicketActivity[]> {
      return await request<TicketActivity[]>(`/ticket/${publicId}/activities`);
    },

    async getComments(publicId: string): Promise<TicketComment[]> {
      return await request<TicketComment[]>(`/ticket/${publicId}/comments`);
    },

    async addComment(publicId: string, description: string, attachments: any[] = []): Promise<TicketComment> {
      return await request<TicketComment>(`/ticket/${publicId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ description, attachments }),
      });
    },

    async getNotes(publicId: string): Promise<TicketNote[]> {
      return await request<TicketNote[]>(`/ticket/${publicId}/notes`);
    },

    async addNote(publicId: string, description: string, attachments: any[] = []): Promise<TicketNote> {
      return await request<TicketNote>(`/ticket/${publicId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ description, attachments }),
      });
    },

    async upload(file: File): Promise<AttachmentResponse> {
      const formData = new FormData();
      formData.append('file', file);
      return await request<AttachmentResponse>('/ticket/upload', {
        method: 'POST',
        body: formData,
      });
    }
  },

  notifications: {
    async getAll(unreadOnly = false, page = 0, size = 30): Promise<{ content: NotificationItem[]; totalElements: number }> {
      const query = new URLSearchParams();
      if (unreadOnly) query.append('unreadOnly', 'true');
      query.append('page', page.toString());
      query.append('size', size.toString());

      const data = await request<any>(`/notifications?${query.toString()}`);
      const content = Array.isArray(data) ? data : (data?.content || []);
      return {
        content: content.map((n: any) => ({
          notificationId: n.notificationId ?? n.id,
          ticketId: n.ticketId,
          ticketPublicId: n.ticketPublicId ? n.ticketPublicId.toString() : undefined,
          title: n.title,
          message: n.message,
          type: n.type,
          isRead: Boolean(n.isRead),
          createdAt: n.createdAt,
        })),
        totalElements: data?.totalElements ?? content.length,
      };
    },

    async getUnreadCount(): Promise<{ unreadCount: number }> {
      const res = await request<{ unreadCount: number }>('/notifications/unread-count');
      return { unreadCount: res?.unreadCount || 0 };
    },

    async markAsRead(id: number): Promise<NotificationItem> {
      return await request<NotificationItem>(`/notifications/${id}/read`, {
        method: 'PATCH',
      });
    },

    async markAllAsRead(): Promise<{ message: string }> {
      return await request<{ message: string }>('/notifications/read-all', {
        method: 'PATCH',
      });
    },

    async delete(id: number): Promise<void> {
      await request<void>(`/notifications/${id}`, {
        method: 'DELETE',
      });
    },

    async clearAll(): Promise<{ message: string }> {
      return await request<{ message: string }>('/notifications/clear-all', {
        method: 'DELETE',
      });
    }
  },

  users: {
    async getAll(page = 0, size = 50): Promise<User[]> {
      const data = await request<{ content: User[] }>(`/users?page=${page}&size=${size}`);
      return data?.content || [];
    },

    async getMe(): Promise<User> {
      return await request<User>('/users/me');
    },

    async create(userReq: CreateUserRequest): Promise<User> {
      return await request<User>('/users', {
        method: 'POST',
        body: JSON.stringify(userReq),
      });
    },

    async update(publicId: string, userReq: { name?: string; email?: string; password?: string; roleId?: number }): Promise<User> {
      const payload: Record<string, any> = {};
      if (userReq.name !== undefined && userReq.name.trim() !== '') payload.name = userReq.name.trim();
      if (userReq.email !== undefined && userReq.email.trim() !== '') payload.email = userReq.email.trim();
      if (userReq.password !== undefined && userReq.password !== '') payload.password = userReq.password;
      if (userReq.roleId !== undefined) payload.roleId = userReq.roleId;

      return await request<User>(`/users/${publicId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    async updateStatus(publicId: string, isActive: boolean): Promise<User> {
      return await request<User>(`/users/${publicId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      });
    },

    async delete(publicId: string): Promise<void> {
      await request(`/users/${publicId}`, {
        method: 'DELETE',
      });
    }
  },

  roles: {
    async getAll(): Promise<Role[]> {
      const data = await request<any>('/roles?size=50');
      const items = Array.isArray(data) ? data : (data?.content || []);
      return items.map((r: any) => ({
        roleId: r.roleId ?? r.id,
        roleName: r.roleName ?? r.name,
        id: r.id ?? r.roleId,
        name: r.name ?? r.roleName,
        description: r.description,
        permissions: r.permissions,
      }));
    },

    async getById(id: number): Promise<Role> {
      const r = await request<any>(`/roles/${id}`);
      return {
        roleId: r.roleId ?? r.id,
        roleName: r.roleName ?? r.name,
        id: r.id ?? r.roleId,
        name: r.name ?? r.roleName,
        description: r.description,
        permissions: r.permissions,
      };
    },

    async getPermissions(roleId: number): Promise<Permission[]> {
      const data = await request<any>(`/roles/${roleId}/permissions`);
      const items = Array.isArray(data) ? data : (data?.content || []);
      return items.map((p: any) => ({
        permissionId: p.permissionId ?? p.id,
        id: p.id ?? p.permissionId,
        name: p.name,
        description: p.description,
      }));
    },

    async create(roleData: { name: string; description?: string }): Promise<Role> {
      const r = await request<any>('/roles', {
        method: 'POST',
        body: JSON.stringify(roleData),
      });
      return {
        roleId: r.roleId ?? r.id,
        roleName: r.roleName ?? r.name,
        id: r.id ?? r.roleId,
        name: r.name ?? r.roleName,
        description: r.description,
        permissions: r.permissions,
      };
    },

    async assignPermissions(roleId: number, permissionIds: number[]): Promise<Role> {
      const r = await request<any>(`/roles/${roleId}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permissionIds }),
      });
      return {
        roleId: r.roleId ?? r.id,
        roleName: r.roleName ?? r.name,
        id: r.id ?? r.roleId,
        name: r.name ?? r.roleName,
        description: r.description,
        permissions: r.permissions,
      };
    },

    async update(id: number, roleData: { name: string; description?: string; permissionIds?: number[] }): Promise<Role> {
      const r = await request<any>(`/roles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(roleData),
      });
      return {
        roleId: r.roleId ?? r.id,
        roleName: r.roleName ?? r.name,
        id: r.id ?? r.roleId,
        name: r.name ?? r.roleName,
        description: r.description,
        permissions: r.permissions,
      };
    },

    async delete(id: number): Promise<void> {
      await request<void>(`/roles/${id}`, {
        method: 'DELETE',
      });
    }
  },

  permissions: {
    async getAll(): Promise<Permission[]> {
      const data = await request<any>('/permissions?size=100');
      const items = Array.isArray(data) ? data : (data?.content || []);
      return items.map((p: any) => ({
        permissionId: p.permissionId ?? p.id,
        id: p.id ?? p.permissionId,
        name: p.name,
        description: p.description,
      }));
    },

    async getAllDetailed(): Promise<Permission[]> {
      const data = await request<any>('/permissions/all');
      const items = Array.isArray(data) ? data : (data?.content || []);
      return items.map((p: any) => ({
        permissionId: p.permissionId ?? p.id,
        id: p.id ?? p.permissionId,
        name: p.name,
        description: p.description,
      }));
    },

    async create(permData: { name: string; description?: string }): Promise<Permission> {
      const p = await request<any>('/permissions', {
        method: 'POST',
        body: JSON.stringify(permData),
      });
      return {
        permissionId: p.permissionId ?? p.id,
        id: p.id ?? p.permissionId,
        name: p.name,
        description: p.description,
      };
    },

    async update(id: number, permData: { name: string; description?: string }): Promise<Permission> {
      const p = await request<any>(`/permissions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(permData),
      });
      return {
        permissionId: p.permissionId ?? p.id,
        id: p.id ?? p.permissionId,
        name: p.name,
        description: p.description,
      };
    },

    async delete(id: number): Promise<void> {
      await request<void>(`/permissions/${id}`, {
        method: 'DELETE',
      });
    }
  },

  categories: {
    async getAll(): Promise<TicketCategory[]> {
      const data = await request<{ content: any[] }>('/category?size=50');
      return (data?.content || []).map((c: any) => ({
        categoryId: c.categoryId ?? c.id,
        name: c.name,
        description: c.description,
        ticketCount: c.ticketCount,
      }));
    },

    async create(catData: { name: string; description: string }): Promise<TicketCategory> {
      const c = await request<any>('/category', {
        method: 'POST',
        body: JSON.stringify(catData),
      });
      return {
        categoryId: c.categoryId ?? c.id,
        name: c.name,
        description: c.description,
        ticketCount: c.ticketCount,
      };
    },

    async update(id: number, catData: { name: string; description?: string }): Promise<TicketCategory> {
      const c = await request<any>(`/category/${id}`, {
        method: 'PUT',
        body: JSON.stringify(catData),
      });
      return {
        categoryId: c.categoryId ?? c.id,
        name: c.name,
        description: c.description,
        ticketCount: c.ticketCount,
      };
    },

    async delete(id: number): Promise<void> {
      await request<void>(`/category/${id}`, {
        method: 'DELETE',
      });
    },

    async assignTickets(categoryId: number, ticketPublicIds: string[]): Promise<Ticket[]> {
      return await Promise.all(
        ticketPublicIds.map(publicId =>
          request<Ticket>(`/ticket/${publicId}/category`, {
            method: 'PATCH',
            body: JSON.stringify({ categoryId }),
          })
        )
      );
    }
  },

  priorities: {
    async getAll(): Promise<Priority[]> {
      const data = await request<{ content: any[] }>('/priority?size=50');
      return (data?.content || []).map((p: any) => ({
        priorityId: p.priorityId ?? p.id,
        name: p.name,
        description: p.description,
      }));
    }
  },

  slaPolicies: {
    async getAll(): Promise<SlaPolicy[]> {
      const data = await request<any[]>('/sla-policies');
      return (data || []).map((p: any) => ({
        slaPolicyId: p.slaPolicyId ?? p.policyId ?? p.id,
        priorityId: p.priorityId,
        priorityName: p.priorityName,
        description: p.description,
        responseTimeMinutes: p.responseTimeMinutes,
        resolutionTimeMinutes: p.resolutionTimeMinutes,
      }));
    },

    async create(policyReq: {
      priorityId: number;
      description?: string;
      responseTimeMinutes: number;
      resolutionTimeMinutes: number;
    }): Promise<SlaPolicy> {
      const p = await request<any>('/sla-policies', {
        method: 'POST',
        body: JSON.stringify(policyReq),
      });
      return {
        slaPolicyId: p.slaPolicyId ?? p.policyId ?? p.id,
        priorityId: p.priorityId,
        priorityName: p.priorityName,
        description: p.description,
        responseTimeMinutes: p.responseTimeMinutes,
        resolutionTimeMinutes: p.resolutionTimeMinutes,
      };
    },

    async update(id: number, policyReq: {
      priorityId?: number;
      description?: string;
      responseTimeMinutes: number;
      resolutionTimeMinutes: number;
    }): Promise<SlaPolicy> {
      const p = await request<any>(`/sla-policies/${id}`, {
        method: 'PUT',
        body: JSON.stringify(policyReq),
      });
      return {
        slaPolicyId: p.slaPolicyId ?? p.policyId ?? p.id,
        priorityId: p.priorityId,
        priorityName: p.priorityName,
        description: p.description,
        responseTimeMinutes: p.responseTimeMinutes,
        resolutionTimeMinutes: p.resolutionTimeMinutes,
      };
    },

    async delete(id: number): Promise<void> {
      await request<void>(`/sla-policies/${id}`, {
        method: 'DELETE',
      });
    }
  }
};

