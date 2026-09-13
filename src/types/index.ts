export type UserRole = 'RESIDENT' | 'GUARD' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  flatNumber?: string;
  floor?: number;
  wing?: string;
  guardGate?: string;
  isActive: boolean;
}

export interface Flat {
  id: string;
  number: string;
  wing: string;
  floor: number;
  residentName: string;
  residentPhone: string;
  residentId: string;
  intercomNumber: string;
  parkingSlot: string;
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
  passCode?: string;
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
  riskScore: number;
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
  level: string;
  assignedFlat?: string;
  currentVehicleNumber?: string;
  isOccupied: boolean;
}

export interface DomesticHelper {
  id: string;
  badgeNumber: string;
  name: string;
  role: 'MAID' | 'COOK' | 'DRIVER' | 'TUTOR' | 'CLEANER' | 'CARPET_SERVICE';
  phone: string;
  assignedFlats: string[];
  rating: number;
  policeVerified: boolean;
  allowedTimings: string;
  status: 'INSIDE' | 'OUTSIDE';
  lastEntryTime?: string;
  lastExitTime?: string;
}

export interface MaintenanceBill {
  id: string;
  billNumber: string;
  flatNumber: string;
  residentName: string;
  month: string;
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

export interface ComplaintComment {
  id: string;
  authorName: string;
  authorRole: UserRole;
  text: string;
  createdAt: string;
}

export interface Complaint {
  id: string;
  ticketNumber: string;
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

export interface Amenity {
  id: string;
  name: string;
  description: string;
  location: string;
  capacity: number;
  pricingType: 'FREE' | 'HOURLY';
  ratePerHour: number;
  openingTime: string;
  closingTime: string;
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
  bookingDate: string;
  timeSlot: string;
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
  passNumber: string;
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
}

export interface SecurityAnomaly {
  id: string;
  title: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  detectedAt: string;
  category: string;
  status?: string;
}
