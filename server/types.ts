export type UserRole = 'RESIDENT' | 'GUARD' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  flatNumber?: string; // e.g. "A-402"
  floor?: number;
  wing?: string;
  guardGate?: string; // e.g. "Gate 1 - Main"
  isActive: boolean;
  createdAt: string;
}

export interface Flat {
  id: string;
  number: string; // "A-402"
  wing: string; // "Wing A"
  floor: number;
  residentName: string;
  residentPhone: string;
  residentId: string;
  intercomNumber: string;
  parkingSlot: string; // "P-A402"
  status: 'OCCUPIED' | 'VACANT';
  familyMembersCount: number;
  vehiclesCount: number;
}

export interface FamilyMember {
  id: string;
  residentId: string;
  flatNumber: string;
  name: string;
  relation: string;
  phone: string;
  isEmergencyContact: boolean;
}

export type VisitorType = 'GUEST' | 'DELIVERY' | 'CAB' | 'SERVICE' | 'DOMESTIC_HELP';
export type VisitorStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'INSIDE' | 'EXITED' | 'OVERSTAY' | 'CANCELLED';

export interface Visitor {
  id: string;
  name: string;
  phone: string;
  photoUrl?: string;
  flatNumber: string;
  residentName: string;
  purpose: string;
  type: VisitorType;
  isPreApproved: boolean;
  passCode?: string; // e.g. "SG-8421"
  vehicleNumber?: string;
  vehicleType?: 'CAR' | 'BIKE' | 'CAB' | 'AUTO' | 'TRUCK' | 'NONE';
  numberOfVisitors: number;
  status: VisitorStatus;
  entryTime?: string;
  exitTime?: string;
  expectedTime?: string;
  createdTime: string;
  gateEntered?: string;
  gateExited?: string;
  guardId?: string;
  guardName?: string;
  rejectionReason?: string;
  isOverstay?: boolean;
  riskScore: number; // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskFactors: string[];
  overrideReason?: string;
  overrideBy?: string;
}

export interface Delivery {
  id: string;
  company: 'Amazon' | 'Flipkart' | 'Swiggy' | 'Zomato' | 'Blinkit' | 'Zepto' | 'Courier' | 'Other';
  deliveryPersonName: string;
  phone: string;
  flatNumber: string;
  residentName: string;
  trackingNumber?: string;
  packageCount: number;
  entryTime: string;
  status: 'AT_GATE' | 'DELIVERED_TO_DOOR' | 'KEPT_AT_GATE' | 'COLLECTED' | 'RETURNED';
  leaveAtGateOtp?: string;
  gateEntered: string;
  guardName: string;
  photoUrl?: string;
}

export interface Vehicle {
  id: string;
  registrationNumber: string;
  type: 'CAR' | 'BIKE' | 'EV' | 'OTHER';
  brandModel: string;
  color: string;
  flatNumber: string;
  residentName: string;
  residentPhone: string;
  parkingSlot: string;
  isElectric: boolean;
  status: 'INSIDE' | 'OUTSIDE';
  lastMovementTime: string;
}

export interface ParkingSlot {
  slotId: string;
  type: 'RESIDENT' | 'VISITOR' | 'EV_CHARGING';
  wing: string;
  level: string; // "B1", "B2", "Ground"
  assignedFlat?: string;
  currentVehicleNumber?: string;
  isOccupied: boolean;
}

export interface DomesticHelper {
  id: string;
  badgeNumber: string; // e.g. "DH-104"
  name: string;
  role: 'MAID' | 'COOK' | 'DRIVER' | 'TUTOR' | 'CLEANER' | 'CARPET_SERVICE';
  phone: string;
  assignedFlats: string[]; // ["A-402", "A-501"]
  rating: number; // 4.8
  photoUrl?: string;
  policeVerified: boolean;
  allowedTimings: string; // "07:00 - 19:00"
  status: 'INSIDE' | 'OUTSIDE';
  lastEntryTime?: string;
  lastExitTime?: string;
}

export interface MaintenanceBill {
  id: string;
  billNumber: string; // "BILL-2026-09-A402"
  flatNumber: string;
  residentName: string;
  month: string; // "September 2026"
  baseMaintenance: number;
  parkingCharges: number;
  waterCharges: number;
  utilityCharges: number;
  lateFee: number;
  totalAmount: number;
  dueDate: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  paidAt?: string;
  paymentMethod?: 'UPI' | 'NET_BANKING' | 'CARD' | 'CHEQUE';
  transactionId?: string;
  receiptUrl?: string;
}

export type ComplaintCategory = 'ELEVATOR' | 'PLUMBING' | 'ELECTRICAL' | 'CLEANING' | 'SECURITY' | 'PARKING' | 'WATER' | 'COMMON_AREA' | 'OTHER';
export type ComplaintPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ComplaintStatus = 'REPORTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface Complaint {
  id: string;
  ticketNumber: string; // "TKT-892"
  flatNumber: string;
  residentName: string;
  category: ComplaintCategory;
  title: string;
  description: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  reportedAt: string;
  assignedTo?: string;
  assignedVendor?: string;
  targetResolutionDate?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  aiSuggestedCategory?: ComplaintCategory;
  aiSuggestedPriority?: ComplaintPriority;
  aiSuggestedVendor?: string;
  comments: ComplaintComment[];
}

export interface ComplaintComment {
  id: string;
  authorName: string;
  authorRole: UserRole;
  text: string;
  createdAt: string;
}

export interface Amenity {
  id: string;
  name: string;
  description: string;
  location: string;
  capacity: number;
  pricingType: 'FREE' | 'HOURLY';
  ratePerHour: number;
  openingTime: string; // "06:00"
  closingTime: string; // "22:00"
  rules: string[];
  imageUrl: string;
  isAvailable: boolean;
}

export interface AmenityBooking {
  id: string;
  amenityId: string;
  amenityName: string;
  flatNumber: string;
  residentName: string;
  bookingDate: string; // "2026-09-15"
  timeSlot: string; // "18:00 - 20:00"
  totalGuests: number;
  amount: number;
  status: 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  category: 'MAINTENANCE' | 'SECURITY' | 'EVENT' | 'GENERAL' | 'EMERGENCY';
  content: string;
  isUrgent: boolean;
  publishedBy: string;
  createdAt: string;
}

export interface Poll {
  id: string;
  question: string;
  description: string;
  options: { id: string; text: string; votes: number }[];
  expiresAt: string;
  votedUserIds: string[];
  createdAt: string;
  status: 'ACTIVE' | 'CLOSED';
}

export interface DocumentItem {
  id: string;
  title: string;
  category: 'BYELAWS' | 'FINANCIAL' | 'MEETING_MINUTES' | 'FIRE_SAFETY' | 'VENDOR_CONTRACTS';
  uploadedBy: string;
  fileSize: string;
  uploadDate: string;
  accessRole: 'ALL' | 'ADMIN_ONLY';
  downloadUrl: string;
}

export type EmergencyType = 'MEDICAL' | 'FIRE' | 'SECURITY' | 'LIFT_EMERGENCY' | 'ACCIDENT' | 'OTHER';
export type EmergencyStatus = 'TRIGGERED' | 'ACKNOWLEDGED' | 'RESPONDING' | 'RESOLVED';

export interface EmergencyIncident {
  id: string;
  type: EmergencyType;
  flatNumber: string;
  residentName: string;
  phone: string;
  triggeredAt: string;
  status: EmergencyStatus;
  assignedGuardName?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  gateAlerted: string;
}

export interface GuardPatrolCheckpoint {
  id: string;
  name: string;
  zone: string;
  qrCode: string;
  lastScannedAt?: string;
  lastScannedBy?: string;
  status: 'OK' | 'MISSED' | 'PENDING';
}

export interface MaterialGatepass {
  id: string;
  passNumber: string; // "MGP-109"
  flatNumber: string;
  residentName: string;
  itemDescription: string;
  quantity: string;
  reason: string;
  carrierPerson: string;
  date: string;
  status: 'REQUESTED' | 'APPROVED' | 'VERIFIED_EXIT';
  approvedBy?: string;
  verifiedAt?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  category: 'AUTH' | 'VISITOR' | 'SECURITY' | 'PAYMENT' | 'COMPLAINT' | 'EMERGENCY' | 'SETTINGS';
  userName: string;
  userRole: UserRole;
  details: string;
  timestamp: string;
  ipAddress?: string;
}

export interface SecurityAnomaly {
  id: string;
  title: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  detectedAt: string;
  category: 'VISITOR_SPIKE' | 'OVERSTAY' | 'REJECTED_ATTEMPT' | 'UNAUTHORIZED_VEHICLE' | 'LATE_NIGHT_ENTRY' | 'PATROL_GAP';
  status: 'INVESTIGATING' | 'DISMISSED' | 'ACTION_TAKEN';
}
