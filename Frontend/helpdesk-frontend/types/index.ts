export type UserRole = 'ADMIN' | 'SUPPORT_MANAGER' | 'SUPPORT_AGENT' | 'REQUESTER' | 'AGENT';

export type TicketStatus = 
  | 'OPEN' 
  | 'IN_PROGRESS' 
  | 'WAITING_ON_REQUESTOR' 
  | 'RESOLVED' 
  | 'CLOSED';

export type PriorityLevel = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface User {
  userPublicId: string;
  name: string;
  email: string;
  roleName: UserRole;
  isActive: boolean;
  department?: string;
  createdAt?: string;
  avatar?: string;
}

export interface CreateUserRequest {
  email: string;
  password?: string;
  name: string;
  roleId: number;
}

export interface AttachmentResponse {
  attachmentId?: number;
  title: string;
  description?: string;
  url: string;
  fileName?: string;
  fileUrl?: string;
  createdAt?: string;
}

export interface CreateAttachmentPayload {
  title: string;
  description?: string;
  url: string;
}

export interface Ticket {
  ticketPublicId: string;
  code?: string;
  title: string;
  description: string;
  categoryId: number;
  categoryName: string;
  priorityId: number;
  priorityName?: string;
  requestorPublicId: string;
  requestorName: string;
  requestorEmail: string;
  status: TicketStatus;
  assignedAgentPublicId?: string;
  assignedAgentName?: string;
  assignedAgentEmail?: string;
  responseDeadline?: string;
  resolutionDeadline?: string;
  isResponseOverdue?: boolean;
  isResponseAtRisk?: boolean;
  isResolutionOverdue?: boolean;
  isResolutionAtRisk?: boolean;
  attachments?: AttachmentResponse[];
  createdAt: string;
  tags?: string[];
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  category: number;
  priority: number;
  attachments?: CreateAttachmentPayload[];
}

export interface TicketCategory {
  categoryId: number;
  name: string;
  description?: string;
  ticketCount?: number;
}

export interface Priority {
  priorityId: number;
  name: PriorityLevel;
  description?: string;
}

export interface SlaPolicy {
  slaPolicyId: number;
  priorityId: number;
  priorityName: PriorityLevel;
  description?: string;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
}

export interface DashboardMetrics {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  waitingTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  overdueTickets: number;
  unassignedTickets: number;
  ticketsByPriority: Record<string, number>;
  agentWorkload: Record<string, number>;
}

export interface TicketActivity {
  activityId: number;
  ticketPublicId: string;
  description: string;
  userPublicId: string;
  userName: string;
  userRole: string;
  createdAt: string;
}

export interface TicketComment {
  commentId: number;
  ticketPublicId: string;
  userPublicId: string;
  userName: string;
  userRole: string;
  description: string;
  attachments?: AttachmentResponse[];
  createdAt: string;
}

export interface TicketNote {
  noteId: number;
  ticketPublicId: string;
  userPublicId: string;
  userName: string;
  userRole: string;
  description: string;
  attachments?: AttachmentResponse[];
  createdAt: string;
  updatedAt?: string;
}

export interface TicketAssignment {
  assignmentId: number;
  ticketPublicId: string;
  assignedToPublicId: string;
  assignedToName: string;
  assignedToEmail: string;
  assignedByPublicId: string;
  assignedByName: string;
  isActive: boolean;
  assignedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface NotificationItem {
  notificationId: number;
  ticketId?: number;
  ticketPublicId?: string;
  title: string;
  message: string;
  type?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Role {
  roleId: number;
  roleName: string;
  id?: number;
  name?: string;
  description?: string;
  permissions?: Permission[];
}

export interface Permission {
  permissionId: number;
  name: string;
  id?: number;
  description?: string;
}
