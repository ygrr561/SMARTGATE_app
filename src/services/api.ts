import type {
  User, Flat, FamilyMember, Visitor, Delivery, Vehicle, ParkingSlot,
  DomesticHelper, MaintenanceBill, Complaint, Amenity, AmenityBooking,
  Announcement, Poll, DocumentItem, EmergencyIncident, GuardPatrolCheckpoint,
  MaterialGatepass, AuditLog, SecurityAnomaly
} from '../types/index.js';

const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || errorBody.error || `HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

export const api = {
  // Auth
  login: (credentials: { email?: string; password?: string; roleSwitchUserId?: string }) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  getMe: (userId?: string) =>
    request<{ user: User }>('/auth/me', {
      headers: userId ? { 'x-user-id': userId } : {},
    }),
  register: (data: Partial<User>) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Flats & Residents
  getFlats: () => request<Flat[]>('/flats'),
  getFamilyMembers: (flatNumber?: string) =>
    request<FamilyMember[]>(`/family-members${flatNumber ? `?flatNumber=${flatNumber}` : ''}`),
  addFamilyMember: (data: Partial<FamilyMember>) =>
    request<FamilyMember>('/family-members', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Visitors
  getVisitors: (params?: { flatNumber?: string; status?: string; isInside?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.flatNumber) q.set('flatNumber', params.flatNumber);
    if (params?.status) q.set('status', params.status);
    if (params?.isInside) q.set('isInside', 'true');
    return request<Visitor[]>(`/visitors?${q.toString()}`);
  },
  preApproveVisitor: (data: any) =>
    request<Visitor>('/visitors/pre-approve', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  registerWalkIn: (data: any) =>
    request<Visitor>('/visitors/walk-in', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  approveVisitor: (id: string, approvedBy?: string) =>
    request<Visitor>(`/visitors/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approvedBy }),
    }),
  rejectVisitor: (id: string, reason?: string, rejectedBy?: string) =>
    request<Visitor>(`/visitors/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason, rejectedBy }),
    }),
  recordVisitorEntry: (id: string, gateEntered?: string, guardName?: string) =>
    request<Visitor>(`/visitors/${id}/record-entry`, {
      method: 'POST',
      body: JSON.stringify({ gateEntered, guardName }),
    }),
  recordVisitorExit: (id: string, gateExited?: string, guardName?: string) =>
    request<Visitor>(`/visitors/${id}/record-exit`, {
      method: 'POST',
      body: JSON.stringify({ gateExited, guardName }),
    }),
  verifyVisitorCode: (code: string) =>
    request<{ valid: boolean; visitor: Visitor; message: string }>('/visitors/verify-code', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  overrideVisitor: (id: string, overrideReason: string, guardName?: string) =>
    request<Visitor>(`/visitors/${id}/override`, {
      method: 'POST',
      body: JSON.stringify({ overrideReason, guardName }),
    }),
  getBlacklist: () => request<any[]>('/visitors/blacklist'),
  addToBlacklist: (data: { phone: string; name: string; reason: string }) =>
    request<any>('/visitors/blacklist', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Deliveries
  getDeliveries: (flatNumber?: string) =>
    request<Delivery[]>(`/deliveries${flatNumber ? `?flatNumber=${flatNumber}` : ''}`),
  logDelivery: (data: any) =>
    request<Delivery>('/deliveries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateDeliveryStatus: (id: string, status: Delivery['status']) =>
    request<Delivery>(`/deliveries/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  // Vehicles & Parking
  getVehicles: (flatNumber?: string) =>
    request<Vehicle[]>(`/vehicles${flatNumber ? `?flatNumber=${flatNumber}` : ''}`),
  registerVehicle: (data: any) =>
    request<Vehicle>('/vehicles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getParkingSlots: () => request<ParkingSlot[]>('/parking/slots'),

  // Domestic Help
  getDomesticHelp: (flatNumber?: string) =>
    request<DomesticHelper[]>(`/domestic-help${flatNumber ? `?flatNumber=${flatNumber}` : ''}`),
  toggleHelperAttendance: (id: string, guardName?: string) =>
    request<DomesticHelper>(`/domestic-help/${id}/toggle-attendance`, {
      method: 'POST',
      body: JSON.stringify({ guardName }),
    }),

  // Maintenance & Billing
  getMaintenanceBills: (flatNumber?: string) =>
    request<MaintenanceBill[]>(`/maintenance/bills${flatNumber ? `?flatNumber=${flatNumber}` : ''}`),
  payMaintenanceBill: (billId: string, paymentMethod?: string) =>
    request<MaintenanceBill>('/maintenance/pay', {
      method: 'POST',
      body: JSON.stringify({ billId, paymentMethod }),
    }),
  getMaintenanceSummary: () => request<any>('/maintenance/summary'),

  // Complaints
  getComplaints: (flatNumber?: string) =>
    request<Complaint[]>(`/complaints${flatNumber ? `?flatNumber=${flatNumber}` : ''}`),
  createComplaint: (data: any) =>
    request<Complaint>('/complaints', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  addComplaintComment: (id: string, text: string, authorName?: string, authorRole?: string) =>
    request<Complaint>(`/complaints/${id}/comment`, {
      method: 'POST',
      body: JSON.stringify({ text, authorName, authorRole }),
    }),
  updateComplaintStatus: (id: string, data: any) =>
    request<Complaint>(`/complaints/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Amenities
  getAmenities: () => request<Amenity[]>('/amenities'),
  getAmenityBookings: (flatNumber?: string) =>
    request<AmenityBooking[]>(`/amenities/bookings${flatNumber ? `?flatNumber=${flatNumber}` : ''}`),
  bookAmenity: (data: any) =>
    request<AmenityBooking>('/amenities/book', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Community
  getAnnouncements: () => request<Announcement[]>('/announcements'),
  createAnnouncement: (data: any) =>
    request<Announcement>('/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getPolls: () => request<Poll[]>('/polls'),
  votePoll: (id: string, optionId: string, userId: string) =>
    request<Poll>(`/polls/${id}/vote`, {
      method: 'POST',
      body: JSON.stringify({ optionId, userId }),
    }),
  getDocuments: () => request<DocumentItem[]>('/documents'),

  // Emergency SOS
  getEmergencyIncidents: () => request<EmergencyIncident[]>('/emergency/incidents'),
  triggerSOS: (data: { type: string; flatNumber: string; residentName: string; phone: string }) =>
    request<EmergencyIncident>('/emergency/trigger', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  acknowledgeEmergency: (id: string, guardName?: string) =>
    request<EmergencyIncident>(`/emergency/${id}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ guardName }),
    }),
  resolveEmergency: (id: string, resolutionNotes?: string, resolvedBy?: string) =>
    request<EmergencyIncident>(`/emergency/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolutionNotes, resolvedBy }),
    }),

  // Patrol & Gatepasses
  getPatrolCheckpoints: () => request<GuardPatrolCheckpoint[]>('/patrol/checkpoints'),
  scanCheckpoint: (qrCode: string, guardName?: string) =>
    request<GuardPatrolCheckpoint>('/patrol/scan', {
      method: 'POST',
      body: JSON.stringify({ qrCode, guardName }),
    }),
  getGatepasses: (flatNumber?: string) =>
    request<MaterialGatepass[]>(`/gatepasses${flatNumber ? `?flatNumber=${flatNumber}` : ''}`),
  createGatepass: (data: any) =>
    request<MaterialGatepass>('/gatepasses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  verifyGatepass: (id: string, guardName?: string) =>
    request<MaterialGatepass>(`/gatepasses/${id}/verify`, {
      method: 'PUT',
      body: JSON.stringify({ guardName }),
    }),

  // AI Services
  getVisitorRiskScore: (data: any) =>
    request<any>('/ai/risk-score', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getAnomalies: () => request<SecurityAnomaly[]>('/ai/anomalies'),
  getTrafficPredictions: () => request<any[]>('/ai/traffic-predictions'),
  classifyComplaint: (text: string) =>
    request<any>('/ai/classify-complaint', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  getPredictiveMaintenance: () => request<any[]>('/ai/predictive-maintenance'),
  queryAIAssistant: (question: string) =>
    request<{ answer: string }>('/ai/assistant', {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),

  // Audit & System
  getAuditLogs: () => request<AuditLog[]>('/audit/logs'),
  getSystemStats: () => request<any>('/system/stats'),
};
