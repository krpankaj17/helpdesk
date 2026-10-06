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
  AttachmentResponse,
  UserSummary
} from '@/types';
import { apiCache, CACHE_TTL, CacheOptions } from './cache';

export { apiCache, CACHE_TTL };
export type { CacheOptions };

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
      apiCache.clear();
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
      apiCache.clear();
      const res = await request<{ accessToken: string; refreshToken: string; tokenType: string; expiresIn: number }>('/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      tokenStorage.setToken(res.accessToken);
      tokenStorage.setRefreshToken(res.refreshToken);

      // Fetch authenticated user profile from /users/me
      const user = await api.users.getMe({ forceRefresh: true });
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
      apiCache.clear();
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
    }, options?: CacheOptions | { forceRefresh?: boolean }): Promise<PaginatedResponse<Ticket>> {
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

      const cacheKey = `tickets:paginated:${query.toString()}`;
      return apiCache.fetchWithCache(
        cacheKey,
        async () => {
          const data = await request<PaginatedResponse<Ticket>>(`/ticket?${query.toString()}`);
          const ticketList = data?.content || [];

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
        {
          ttl: CACHE_TTL.TICKETS,
          tag: 'tickets',
          ...(typeof options === 'object' ? options : {}),
        }
      );
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
    }, options?: CacheOptions | { forceRefresh?: boolean }): Promise<Ticket[]> {
      const pageData = await this.getPaginated({
        ...params,
        size: params?.size ?? 10,
      }, options);
      return pageData.content;
    },

    async getById(publicId: string, options?: CacheOptions | { forceRefresh?: boolean }): Promise<Ticket> {
      return apiCache.fetchWithCache(
        `tickets:${publicId}`,
        () => request<Ticket>(`/ticket/${publicId}`),
        {
          ttl: CACHE_TTL.TICKETS,
          tag: 'tickets',
          ...(typeof options === 'object' ? options : {}),
        }
      );
    },

    async create(ticketReq: CreateTicketRequest): Promise<Ticket> {
      const res = await request<Ticket>('/ticket', {
        method: 'POST',
        body: JSON.stringify(ticketReq),
      });
      apiCache.invalidateTags(['tickets', 'dashboard', 'categories']);
      return res;
    },

    async updateStatus(publicId: string, status: TicketStatus, resolutionNote?: string): Promise<Ticket> {
      const res = await request<Ticket>(`/ticket/${publicId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          status, 
          resolutionNote: resolutionNote || undefined 
        }),
      });
      apiCache.invalidateTags(['tickets', 'dashboard']);
      apiCache.delete(`tickets:${publicId}`);
      return res;
    },

    async updateCategory(publicId: string, categoryId: number): Promise<Ticket> {
      const res = await request<Ticket>(`/ticket/${publicId}/category`, {
        method: 'PATCH',
        body: JSON.stringify({ categoryId }),
      });
      apiCache.invalidateTags(['tickets', 'dashboard', 'categories']);
      apiCache.delete(`tickets:${publicId}`);
      return res;
    },

    async assign(publicId: string, agentEmail: string): Promise<TicketAssignment> {
      const res = await request<TicketAssignment>(`/ticket/${publicId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ agentEmail }),
      });
      apiCache.invalidateTags(['tickets', 'dashboard', 'users']);
      apiCache.delete(`tickets:${publicId}`);
      apiCache.delete(`tickets:${publicId}:assignments`);
      return res;
    },

    async getAssignments(publicId: string, options?: CacheOptions | { forceRefresh?: boolean }): Promise<TicketAssignment[]> {
      return apiCache.fetchWithCache(
        `tickets:${publicId}:assignments`,
        () => request<TicketAssignment[]>(`/ticket/${publicId}/assignments`),
        {
          ttl: CACHE_TTL.TICKETS,
          tag: 'tickets',
          ...(typeof options === 'object' ? options : {}),
        }
      );
    },

    async getDashboardMetrics(options?: CacheOptions | { forceRefresh?: boolean }): Promise<DashboardMetrics> {
      return apiCache.fetchWithCache(
        'dashboard:metrics',
        () => request<DashboardMetrics>('/ticket/dashboard'),
        {
          ttl: CACHE_TTL.METRICS,
          tag: 'dashboard',
          ...(typeof options === 'object' ? options : {}),
        }
      );
    },

    async getActivities(publicId: string, options?: CacheOptions | { forceRefresh?: boolean }): Promise<TicketActivity[]> {
      return apiCache.fetchWithCache(
        `tickets:${publicId}:activities`,
        () => request<TicketActivity[]>(`/ticket/${publicId}/activities`),
        {
          ttl: CACHE_TTL.TICKETS,
          tag: 'tickets',
          ...(typeof options === 'object' ? options : {}),
        }
      );
    },

    async getComments(publicId: string, options?: CacheOptions | { forceRefresh?: boolean }): Promise<TicketComment[]> {
      return apiCache.fetchWithCache(
        `tickets:${publicId}:comments`,
        () => request<TicketComment[]>(`/ticket/${publicId}/comments`),
        {
          ttl: CACHE_TTL.TICKETS,
          tag: 'tickets',
          ...(typeof options === 'object' ? options : {}),
        }
      );
    },

    async addComment(publicId: string, description: string, attachments: any[] = []): Promise<TicketComment> {
      const res = await request<TicketComment>(`/ticket/${publicId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ description, attachments }),
      });
      apiCache.invalidateTags(['tickets', 'dashboard']);
      apiCache.delete(`tickets:${publicId}:comments`);
      apiCache.delete(`tickets:${publicId}:activities`);
      return res;
    },

    async getNotes(publicId: string, options?: CacheOptions | { forceRefresh?: boolean }): Promise<TicketNote[]> {
      return apiCache.fetchWithCache(
        `tickets:${publicId}:notes`,
        () => request<TicketNote[]>(`/ticket/${publicId}/notes`),
        {
          ttl: CACHE_TTL.TICKETS,
          tag: 'tickets',
          ...(typeof options === 'object' ? options : {}),
        }
      );
    },

    async addNote(publicId: string, description: string, attachments: any[] = []): Promise<TicketNote> {
      const res = await request<TicketNote>(`/ticket/${publicId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ description, attachments }),
      });
      apiCache.invalidateTags(['tickets', 'dashboard']);
      apiCache.delete(`tickets:${publicId}:notes`);
      apiCache.delete(`tickets:${publicId}:activities`);
      return res;
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
    async getAll(unreadOnly = false, page = 0, size = 30, options?: CacheOptions | { forceRefresh?: boolean }): Promise<{ content: NotificationItem[]; totalElements: number }> {
      const query = new URLSearchParams();
      if (unreadOnly) query.append('unreadOnly', 'true');
      query.append('page', page.toString());
      query.append('size', size.toString());

      return apiCache.fetchWithCache(
        `notifications:${unreadOnly}:${page}:${size}`,
        async () => {
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
        {
          ttl: CACHE_TTL.NOTIFICATIONS,
          tag: 'notifications',
          ...(typeof options === 'object' ? options : {}),
        }
      );
    },

    async getUnreadCount(options?: CacheOptions | { forceRefresh?: boolean }): Promise<{ unreadCount: number }> {
      return apiCache.fetchWithCache(
        'notifications:unreadCount',
        async () => {
          const res = await request<{ unreadCount: number }>('/notifications/unread-count');
          return { unreadCount: res?.unreadCount || 0 };
        },
        {
          ttl: CACHE_TTL.NOTIFICATIONS,
          tag: 'notifications',
          ...(typeof options === 'object' ? options : {}),
        }
      );
    },

    async markAsRead(id: number): Promise<NotificationItem> {
      const res = await request<NotificationItem>(`/notifications/${id}/read`, {
        method: 'PATCH',
      });
      apiCache.invalidateTag('notifications');
      return res;
    },

    async markAllAsRead(): Promise<{ message: string }> {
      const res = await request<{ message: string }>('/notifications/read-all', {
        method: 'PATCH',
      });
      apiCache.invalidateTag('notifications');
      return res;
    },

    async delete(id: number): Promise<void> {
      await request<void>(`/notifications/${id}`, {
        method: 'DELETE',
      });
      apiCache.invalidateTag('notifications');
    },

    async clearAll(): Promise<{ message: string }> {
      const res = await request<{ message: string }>('/notifications/clear-all', {
        method: 'DELETE',
      });
      apiCache.invalidateTag('notifications');
      return res;
    }
  },

  users: {
    async getSummary(options?: CacheOptions | { forceRefresh?: boolean }): Promise<UserSummary> {
      return apiCache.fetchWithCache(
        'users:summary',
        () => request<UserSummary>('/users/summary'),
        {
          ttl: CACHE_TTL.USERS,
          tag: 'users',
          ...(typeof options === 'object' ? options : {}),
        }
      );
    },

    async getPaginated(
      page = 0, 
      size = 10, 
      searchOrOptions?: string | CacheOptions | { forceRefresh?: boolean }, 
      sort = 'createdAt,desc', 
      filtersOrOptions?: { role?: string; isActive?: boolean; isSupportStaff?: boolean } | CacheOptions | { forceRefresh?: boolean },
      options?: CacheOptions | { forceRefresh?: boolean }
    ): Promise<PaginatedResponse<User>> {
      let search: string | undefined;
      let actualOptions = options;
      let filters: { role?: string; isActive?: boolean; isSupportStaff?: boolean } | undefined;

      if (typeof searchOrOptions === 'object' && searchOrOptions !== null) {
        actualOptions = searchOrOptions;
        search = undefined;
      } else {
        search = searchOrOptions;
      }

      if (filtersOrOptions) {
        if ('forceRefresh' in filtersOrOptions || 'ttl' in filtersOrOptions || 'tag' in filtersOrOptions) {
          actualOptions = filtersOrOptions as any;
        } else {
          filters = filtersOrOptions as any;
        }
      }

      const query = new URLSearchParams();
      query.append('page', page.toString());
      query.append('size', size.toString());
      if (search && search.trim()) query.append('search', search.trim());
      if (sort) query.append('sort', sort);
      if (filters?.role && filters.role !== 'ALL') query.append('role', filters.role);
      if (filters?.isActive !== undefined) query.append('isActive', filters.isActive.toString());
      if (filters?.isSupportStaff) query.append('isSupportStaff', 'true');

      return apiCache.fetchWithCache(
        `users:paginated:${query.toString()}`,
        async () => {
          const data = await request<PaginatedResponse<User>>(`/users?${query.toString()}`);
          return {
            content: data?.content || [],
            totalElements: data?.totalElements ?? (data?.content?.length || 0),
            totalPages: data?.totalPages ?? 1,
            number: data?.number ?? page,
            size: data?.size ?? size,
            first: data?.first ?? page === 0,
            last: data?.last ?? true,
            empty: (data?.content?.length || 0) === 0,
          };
        },
        {
          ttl: CACHE_TTL.USERS,
          tag: 'users',
          ...(typeof actualOptions === 'object' ? actualOptions : {}),
        }
      );
    },

    async getAll(
      page = 0, 
      size = 10, 
      searchOrOptions?: string | CacheOptions | { forceRefresh?: boolean }, 
      sort = 'createdAt,desc', 
      options?: CacheOptions | { forceRefresh?: boolean }
    ): Promise<User[]> {
      let search: string | undefined;
      let actualOptions = options;
      if (typeof searchOrOptions === 'object' && searchOrOptions !== null) {
        actualOptions = searchOrOptions;
        search = undefined;
      } else {
        search = searchOrOptions;
      }
      const pageData = await this.getPaginated(page, size, search, sort, actualOptions);
      return pageData.content;
    },

    async getMe(options?: CacheOptions | { forceRefresh?: boolean }): Promise<User> {
      return apiCache.fetchWithCache(
        'users:me',
        () => request<User>('/users/me'),
        {
          ttl: CACHE_TTL.USERS,
          tag: 'users',
          ...(typeof options === 'object' ? options : {}),
        }
      );
    },

    async create(userReq: CreateUserRequest): Promise<User> {
      const res = await request<User>('/users', {
        method: 'POST',
        body: JSON.stringify(userReq),
      });
      apiCache.invalidateTags(['users', 'tickets']);
      return res;
    },

    async update(publicId: string, userReq: { name?: string; email?: string; password?: string; roleId?: number }): Promise<User> {
      const payload: Record<string, any> = {};
      if (userReq.name !== undefined && userReq.name.trim() !== '') payload.name = userReq.name.trim();
      if (userReq.email !== undefined && userReq.email.trim() !== '') payload.email = userReq.email.trim();
      if (userReq.password !== undefined && userReq.password !== '') payload.password = userReq.password;
      if (userReq.roleId !== undefined) payload.roleId = userReq.roleId;

      const res = await request<User>(`/users/${publicId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      apiCache.invalidateTags(['users', 'tickets']);
      apiCache.delete('users:me');
      return res;
    },

    async updateStatus(publicId: string, isActive: boolean): Promise<User> {
      const res = await request<User>(`/users/${publicId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      });
      apiCache.invalidateTags(['users', 'tickets']);
      return res;
    },

    async delete(publicId: string): Promise<void> {
      await request(`/users/${publicId}`, {
        method: 'DELETE',
      });
      apiCache.invalidateTags(['users', 'tickets']);
    }
  },

  roles: {
    async getAll(options?: CacheOptions | { forceRefresh?: boolean }): Promise<Role[]> {
      return apiCache.fetchWithCache(
        'roles:all',
        async () => {
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
        {
          ttl: CACHE_TTL.STATIC,
          tag: 'roles',
          persist: true,
          ...(typeof options === 'object' ? options : {}),
        }
      );
    },

    async getById(id: number, options?: CacheOptions | { forceRefresh?: boolean }): Promise<Role> {
      return apiCache.fetchWithCache(
        `roles:${id}`,
        async () => {
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
        {
          ttl: CACHE_TTL.STATIC,
          tag: 'roles',
          persist: true,
          ...(typeof options === 'object' ? options : {}),
        }
      );
    },

    async getPermissions(roleId: number, options?: CacheOptions | { forceRefresh?: boolean }): Promise<Permission[]> {
      return apiCache.fetchWithCache(
        `roles:${roleId}:permissions`,
        async () => {
          const data = await request<any>(`/roles/${roleId}/permissions`);
          const items = Array.isArray(data) ? data : (data?.content || []);
          return items.map((p: any) => ({
            permissionId: p.permissionId ?? p.id,
            id: p.id ?? p.permissionId,
            name: p.name,
            description: p.description,
          }));
        },
        {
          ttl: CACHE_TTL.STATIC,
          tag: 'roles',
          persist: true,
          ...(typeof options === 'object' ? options : {}),
        }
      );
    },

    async create(roleData: { name: string; description?: string }): Promise<Role> {
      const r = await request<any>('/roles', {
        method: 'POST',
        body: JSON.stringify(roleData),
      });
      apiCache.invalidateTag('roles');
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
      apiCache.invalidateTag('roles');
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
      apiCache.invalidateTag('roles');
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
      apiCache.invalidateTag('roles');
    }
  },

  permissions: {
    async getAll(options?: CacheOptions | { forceRefresh?: boolean }): Promise<Permission[]> {
      return apiCache.fetchWithCache(
        'permissions:all',
        async () => {
          const data = await request<any>('/permissions?size=100');
          const items = Array.isArray(data) ? data : (data?.content || []);
          return items.map((p: any) => ({
            permissionId: p.permissionId ?? p.id,
            id: p.id ?? p.permissionId,
            name: p.name,
            description: p.description,
          }));
        },
        {
          ttl: CACHE_TTL.STATIC,
          tag: 'permissions',
          persist: true,
          ...(typeof options === 'object' ? options : {}),
        }
      );
    },

    async getAllDetailed(options?: CacheOptions | { forceRefresh?: boolean }): Promise<Permission[]> {
      return apiCache.fetchWithCache(
        'permissions:detailed',
        async () => {
          const data = await request<any>('/permissions/all');
          const items = Array.isArray(data) ? data : (data?.content || []);
          return items.map((p: any) => ({
            permissionId: p.permissionId ?? p.id,
            id: p.id ?? p.permissionId,
            name: p.name,
            description: p.description,
          }));
        },
        {
          ttl: CACHE_TTL.STATIC,
          tag: 'permissions',
          persist: true,
          ...(typeof options === 'object' ? options : {}),
        }
      );
    },

    async create(permData: { name: string; description?: string }): Promise<Permission> {
      const p = await request<any>('/permissions', {
        method: 'POST',
        body: JSON.stringify(permData),
      });
      apiCache.invalidateTags(['permissions', 'roles']);
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
      apiCache.invalidateTags(['permissions', 'roles']);
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
      apiCache.invalidateTags(['permissions', 'roles']);
    }
  },

  categories: {
    async getAll(options?: CacheOptions | { forceRefresh?: boolean }): Promise<TicketCategory[]> {
      return apiCache.fetchWithCache(
        'categories:all',
        async () => {
          const data = await request<{ content: any[] }>('/category?size=50');
          return (data?.content || []).map((c: any) => ({
            categoryId: c.categoryId ?? c.id,
            name: c.name,
            description: c.description,
            ticketCount: c.ticketCount,
          }));
        },
        {
          ttl: CACHE_TTL.STATIC,
          tag: 'categories',
          persist: true,
          ...(typeof options === 'object' ? options : {}),
        }
      );
    },

    async create(catData: { name: string; description: string }): Promise<TicketCategory> {
      const c = await request<any>('/category', {
        method: 'POST',
        body: JSON.stringify(catData),
      });
      apiCache.invalidateTags(['categories', 'tickets', 'dashboard']);
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
      apiCache.invalidateTags(['categories', 'tickets', 'dashboard']);
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
      apiCache.invalidateTags(['categories', 'tickets', 'dashboard']);
    },

    async assignTickets(categoryId: number, ticketPublicIds: string[]): Promise<Ticket[]> {
      const res = await Promise.all(
        ticketPublicIds.map(publicId =>
          request<Ticket>(`/ticket/${publicId}/category`, {
            method: 'PATCH',
            body: JSON.stringify({ categoryId }),
          })
        )
      );
      apiCache.invalidateTags(['categories', 'tickets', 'dashboard']);
      return res;
    }
  },

  priorities: {
    async getAll(options?: CacheOptions | { forceRefresh?: boolean }): Promise<Priority[]> {
      return apiCache.fetchWithCache(
        'priorities:all',
        async () => {
          const data = await request<{ content: any[] }>('/priority?size=50');
          return (data?.content || []).map((p: any) => ({
            priorityId: p.priorityId ?? p.id,
            name: p.name,
            description: p.description,
          }));
        },
        {
          ttl: CACHE_TTL.STATIC,
          tag: 'priorities',
          persist: true,
          ...(typeof options === 'object' ? options : {}),
        }
      );
    }
  },

  slaPolicies: {
    async getAll(options?: CacheOptions | { forceRefresh?: boolean }): Promise<SlaPolicy[]> {
      return apiCache.fetchWithCache(
        'sla:all',
        async () => {
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
        {
          ttl: CACHE_TTL.STATIC,
          tag: 'sla',
          persist: true,
          ...(typeof options === 'object' ? options : {}),
        }
      );
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
      apiCache.invalidateTag('sla');
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
      apiCache.invalidateTag('sla');
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
      apiCache.invalidateTag('sla');
    }
  },

  cache: {
    get<T>(key: string, allowStale = false): T | null {
      return apiCache.get<T>(key, allowStale);
    },
    set<T>(key: string, data: T, ttlMs: number, tag?: string, persist = false): void {
      apiCache.set(key, data, ttlMs, tag, persist);
    },
    has(key: string): boolean {
      return apiCache.has(key);
    },
    delete(key: string): boolean {
      return apiCache.delete(key);
    },
    invalidate(tag: string): void {
      apiCache.invalidateTag(tag);
    },
    invalidateTags(tags: string[]): void {
      apiCache.invalidateTags(tags);
    },
    invalidateKey(key: string): boolean {
      return apiCache.invalidateKey(key);
    },
    invalidatePrefix(prefix: string): void {
      apiCache.invalidatePrefix(prefix);
    },
    mutate<T>(key: string, updater: T | ((current: T | null) => T), ttlMs?: number, tag?: string): T {
      return apiCache.mutate(key, updater, ttlMs, tag);
    },
    pruneExpired(): number {
      return apiCache.pruneExpired();
    },
    getStats() {
      return apiCache.getStats();
    },
    clearAll(): void {
      apiCache.clear();
    }
  }
};

