import fs from 'fs';
import path from 'path';
import {
  User, Flat, FamilyMember, Visitor, Delivery, Vehicle, ParkingSlot,
  DomesticHelper, MaintenanceBill, Complaint, Amenity, AmenityBooking,
  Announcement, Poll, DocumentItem, EmergencyIncident, GuardPatrolCheckpoint,
  MaterialGatepass, AuditLog, SecurityAnomaly
} from './types.js';
import { calculateVisitorRiskScore } from './ai.js';

interface DatabaseSchema {
  users: User[];
  flats: Flat[];
  familyMembers: FamilyMember[];
  visitors: Visitor[];
  deliveries: Delivery[];
  vehicles: Vehicle[];
  parkingSlots: ParkingSlot[];
  domesticHelpers: DomesticHelper[];
  maintenanceBills: MaintenanceBill[];
  complaints: Complaint[];
  amenities: Amenity[];
  amenityBookings: AmenityBooking[];
  announcements: Announcement[];
  polls: Poll[];
  documents: DocumentItem[];
  emergencyIncidents: EmergencyIncident[];
  patrolCheckpoints: GuardPatrolCheckpoint[];
  materialGatepasses: MaterialGatepass[];
  auditLogs: AuditLog[];
  anomalies: SecurityAnomaly[];
  blacklist: { phone: string; name: string; reason: string; addedAt: string }[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'smartgate_db.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function generateInitialData(): DatabaseSchema {
  const users: User[] = [
    {
      id: 'usr-admin-1',
      name: 'Col. R. K. Nair',
      email: 'admin@smartgate.local',
      phone: '+91 98201 11223',
      role: 'ADMIN',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      flatNumber: 'A-601',
      floor: 6,
      wing: 'Wing A',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'usr-res-1',
      name: 'Rahul Sharma',
      email: 'rahul.sharma@example.com',
      phone: '+91 98450 12345',
      role: 'RESIDENT',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      flatNumber: 'A-402',
      floor: 4,
      wing: 'Wing A',
      isActive: true,
      createdAt: '2026-01-15T00:00:00Z',
    },
    {
      id: 'usr-res-2',
      name: 'Priya Patel',
      email: 'priya.patel@example.com',
      phone: '+91 98765 43210',
      role: 'RESIDENT',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      flatNumber: 'B-201',
      floor: 2,
      wing: 'Wing B',
      isActive: true,
      createdAt: '2026-02-10T00:00:00Z',
    },
    {
      id: 'usr-guard-1',
      name: 'Vikram Singh',
      email: 'guard1@smartgate.local',
      phone: '+91 91234 56789',
      role: 'GUARD',
      avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
      guardGate: 'Gate 1 - Main Gate',
      isActive: true,
      createdAt: '2026-01-10T00:00:00Z',
    },
    {
      id: 'usr-guard-2',
      name: 'Ramesh Kumar',
      email: 'guard2@smartgate.local',
      phone: '+91 91234 98765',
      role: 'GUARD',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      guardGate: 'Gate 2 - Service Gate',
      isActive: true,
      createdAt: '2026-01-12T00:00:00Z',
    }
  ];

  // Flats in Greenwood Heights
  const flats: Flat[] = [];
  const wings = ['Wing A', 'Wing B'];
  for (const wing of wings) {
    const prefix = wing === 'Wing A' ? 'A' : 'B';
    for (let floor = 1; floor <= 6; floor++) {
      for (let unit = 1; unit <= 4; unit++) {
        const flatNum = `${prefix}-${floor}0${unit}`;
        const isOccupied = !(floor === 6 && unit === 4); // one vacant
        flats.push({
          id: `flt-${flatNum}`,
          number: flatNum,
          wing,
          floor,
          residentName: flatNum === 'A-402' ? 'Rahul Sharma' : flatNum === 'B-201' ? 'Priya Patel' : flatNum === 'A-601' ? 'Col. R. K. Nair' : `Resident ${flatNum}`,
          residentPhone: flatNum === 'A-402' ? '+91 98450 12345' : flatNum === 'B-201' ? '+91 98765 43210' : '+91 98000 00' + unit + floor,
          residentId: flatNum === 'A-402' ? 'usr-res-1' : flatNum === 'B-201' ? 'usr-res-2' : 'usr-generic',
          intercomNumber: `1${prefix === 'A' ? '1' : '2'}${floor}0${unit}`,
          parkingSlot: `P-${flatNum}`,
          status: isOccupied ? 'OCCUPIED' : 'VACANT',
          familyMembersCount: flatNum === 'A-402' ? 3 : 2,
          vehiclesCount: flatNum === 'A-402' ? 2 : 1,
        });
      }
    }
  }

  const familyMembers: FamilyMember[] = [
    { id: 'fam-1', residentId: 'usr-res-1', flatNumber: 'A-402', name: 'Sunita Sharma', relation: 'Spouse', phone: '+91 98450 12346', isEmergencyContact: true },
    { id: 'fam-2', residentId: 'usr-res-1', flatNumber: 'A-402', name: 'Aarav Sharma', relation: 'Son', phone: '+91 98450 12347', isEmergencyContact: false },
    { id: 'fam-3', residentId: 'usr-res-2', flatNumber: 'B-201', name: 'Karan Patel', relation: 'Spouse', phone: '+91 98765 43211', isEmergencyContact: true }
  ];

  const blacklist = [
    { phone: '+91 99999 88888', name: 'Deepak Verma', reason: 'Repeated unauthorized aggressive solicitation & harassment', addedAt: '2026-06-12' },
    { phone: '+91 98888 77777', name: 'Rajesh Khanna', reason: 'Suspected property damage near Basement P2', addedAt: '2026-07-22' }
  ];

  // Realistic seed visitors with risk scoring applied
  const initialVisitorsRaw = [
    {
      id: 'vis-1',
      name: 'Mohit Agarwal',
      phone: '+91 98111 22334',
      flatNumber: 'A-402',
      residentName: 'Rahul Sharma',
      purpose: 'Friend visiting for lunch',
      type: 'GUEST' as const,
      isPreApproved: true,
      passCode: 'SG-4920',
      vehicleNumber: 'KA-01-MH-4421',
      vehicleType: 'CAR' as const,
      numberOfVisitors: 2,
      status: 'INSIDE' as const,
      entryTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      createdTime: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      gateEntered: 'Gate 1 - Main Gate',
      guardName: 'Vikram Singh',
    },
    {
      id: 'vis-2',
      name: 'Santosh Kumar',
      phone: '+91 98222 33445',
      flatNumber: 'A-402',
      residentName: 'Rahul Sharma',
      purpose: 'Urban Company AC repair technician',
      type: 'SERVICE' as const,
      isPreApproved: false,
      passCode: 'SG-9012',
      vehicleNumber: 'KA-05-EX-9912',
      vehicleType: 'BIKE' as const,
      numberOfVisitors: 1,
      status: 'PENDING_APPROVAL' as const,
      createdTime: new Date().toISOString(),
      gateEntered: 'Gate 1 - Main Gate',
      guardName: 'Vikram Singh',
    },
    {
      id: 'vis-3',
      name: 'Ananya Roy',
      phone: '+91 98333 44556',
      flatNumber: 'B-201',
      residentName: 'Priya Patel',
      purpose: 'Colleague project discussion',
      type: 'GUEST' as const,
      isPreApproved: true,
      passCode: 'SG-7731',
      vehicleNumber: 'KA-03-AA-1200',
      vehicleType: 'CAR' as const,
      numberOfVisitors: 1,
      status: 'APPROVED' as const,
      createdTime: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
      expectedTime: '15:30',
    },
    {
      id: 'vis-4',
      name: 'Gopal Soni',
      phone: '+91 98444 55667',
      flatNumber: 'A-102',
      residentName: 'Amitav Roy',
      purpose: 'Fast courier drop',
      type: 'DELIVERY' as const,
      isPreApproved: false,
      vehicleNumber: 'KA-02-DL-8821',
      vehicleType: 'BIKE' as const,
      numberOfVisitors: 1,
      status: 'OVERSTAY' as const,
      entryTime: new Date(Date.now() - 4.5 * 3600 * 1000).toISOString(),
      createdTime: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      gateEntered: 'Gate 2 - Service Gate',
      guardName: 'Ramesh Kumar',
      isOverstay: true,
    },
    {
      id: 'vis-5',
      name: 'Ravi Teja',
      phone: '+91 98555 66778',
      flatNumber: 'A-402',
      residentName: 'Rahul Sharma',
      purpose: 'Carpentry quote',
      type: 'SERVICE' as const,
      isPreApproved: false,
      vehicleType: 'BIKE' as const,
      numberOfVisitors: 1,
      status: 'EXITED' as const,
      entryTime: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      exitTime: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      createdTime: new Date(Date.now() - 7 * 3600 * 1000).toISOString(),
      gateEntered: 'Gate 1 - Main Gate',
      gateExited: 'Gate 1 - Main Gate',
      guardName: 'Vikram Singh',
    }
  ];

  const visitors: Visitor[] = initialVisitorsRaw.map(v => {
    const risk = calculateVisitorRiskScore({
      name: v.name,
      phone: v.phone,
      flatNumber: v.flatNumber,
      isPreApproved: v.isPreApproved,
      purpose: v.purpose,
      vehicleNumber: v.vehicleNumber,
    });
    return {
      ...v,
      riskScore: risk.riskScore,
      riskLevel: risk.riskLevel,
      riskFactors: risk.factors,
    };
  });

  const deliveries: Delivery[] = [
    {
      id: 'del-1',
      company: 'Amazon',
      deliveryPersonName: 'Imran Khan',
      phone: '+91 97111 22334',
      flatNumber: 'A-402',
      residentName: 'Rahul Sharma',
      packageCount: 2,
      trackingNumber: 'TBA90821942',
      entryTime: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      status: 'KEPT_AT_GATE',
      leaveAtGateOtp: '5842',
      gateEntered: 'Gate 1 - Main Gate',
      guardName: 'Vikram Singh',
    },
    {
      id: 'del-2',
      company: 'Swiggy',
      deliveryPersonName: 'Manoj Kumar',
      phone: '+91 97222 33445',
      flatNumber: 'B-201',
      residentName: 'Priya Patel',
      packageCount: 1,
      entryTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      status: 'DELIVERED_TO_DOOR',
      gateEntered: 'Gate 2 - Service Gate',
      guardName: 'Ramesh Kumar',
    },
    {
      id: 'del-3',
      company: 'Blinkit',
      deliveryPersonName: 'Rohan Joshi',
      phone: '+91 97333 44556',
      flatNumber: 'A-402',
      residentName: 'Rahul Sharma',
      packageCount: 1,
      entryTime: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      status: 'AT_GATE',
      leaveAtGateOtp: '9120',
      gateEntered: 'Gate 1 - Main Gate',
      guardName: 'Vikram Singh',
    }
  ];

  const vehicles: Vehicle[] = [
    {
      id: 'veh-1',
      registrationNumber: 'KA-01-MJ-8822',
      type: 'CAR',
      brandModel: 'Hyundai Creta SX',
      color: 'Phantom Black',
      flatNumber: 'A-402',
      residentName: 'Rahul Sharma',
      residentPhone: '+91 98450 12345',
      parkingSlot: 'P-A402',
      isElectric: false,
      status: 'INSIDE',
      lastMovementTime: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    },
    {
      id: 'veh-2',
      registrationNumber: 'KA-01-EV-1904',
      type: 'EV',
      brandModel: 'Ather 450X Gen 3',
      color: 'Space Grey',
      flatNumber: 'A-402',
      residentName: 'Rahul Sharma',
      residentPhone: '+91 98450 12345',
      parkingSlot: 'P-A402-B',
      isElectric: true,
      status: 'INSIDE',
      lastMovementTime: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    },
    {
      id: 'veh-3',
      registrationNumber: 'KA-03-NC-5544',
      type: 'CAR',
      brandModel: 'Tata Nexon EV Max',
      color: 'Teal Blue',
      flatNumber: 'B-201',
      residentName: 'Priya Patel',
      residentPhone: '+91 98765 43210',
      parkingSlot: 'P-B201',
      isElectric: true,
      status: 'OUTSIDE',
      lastMovementTime: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    }
  ];

  const parkingSlots: ParkingSlot[] = [
    { slotId: 'P-A402', type: 'RESIDENT', wing: 'Wing A', level: 'B1', assignedFlat: 'A-402', currentVehicleNumber: 'KA-01-MJ-8822', isOccupied: true },
    { slotId: 'P-A402-B', type: 'RESIDENT', wing: 'Wing A', level: 'B1', assignedFlat: 'A-402', currentVehicleNumber: 'KA-01-EV-1904', isOccupied: true },
    { slotId: 'P-B201', type: 'RESIDENT', wing: 'Wing B', level: 'B1', assignedFlat: 'B-201', isOccupied: false },
    { slotId: 'P-VIS-01', type: 'VISITOR', wing: 'Wing A', level: 'Ground', currentVehicleNumber: 'KA-01-MH-4421', isOccupied: true },
    { slotId: 'P-VIS-02', type: 'VISITOR', wing: 'Wing A', level: 'Ground', isOccupied: false },
    { slotId: 'P-EV-01', type: 'EV_CHARGING', wing: 'Wing B', level: 'B2', currentVehicleNumber: 'KA-05-EV-7001', isOccupied: true },
    { slotId: 'P-EV-02', type: 'EV_CHARGING', wing: 'Wing B', level: 'B2', isOccupied: false },
  ];

  const domesticHelpers: DomesticHelper[] = [
    {
      id: 'dh-1',
      badgeNumber: 'DH-104',
      name: 'Meena Devi',
      role: 'MAID',
      phone: '+91 96111 22334',
      assignedFlats: ['A-402', 'A-501', 'A-302'],
      rating: 4.9,
      policeVerified: true,
      allowedTimings: '07:30 - 18:30',
      status: 'INSIDE',
      lastEntryTime: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
    },
    {
      id: 'dh-2',
      badgeNumber: 'DH-108',
      name: 'Raju Yadav',
      role: 'COOK',
      phone: '+91 96222 33445',
      assignedFlats: ['A-402', 'B-201'],
      rating: 4.8,
      policeVerified: true,
      allowedTimings: '06:30 - 21:00',
      status: 'OUTSIDE',
      lastExitTime: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    },
    {
      id: 'dh-3',
      badgeNumber: 'DH-115',
      name: 'Ashok Somani',
      role: 'DRIVER',
      phone: '+91 96333 44556',
      assignedFlats: ['A-601'],
      rating: 4.7,
      policeVerified: true,
      allowedTimings: '08:00 - 20:00',
      status: 'INSIDE',
      lastEntryTime: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    }
  ];

  const maintenanceBills: MaintenanceBill[] = [
    {
      id: 'bill-sep-a402',
      billNumber: 'BILL-2026-09-A402',
      flatNumber: 'A-402',
      residentName: 'Rahul Sharma',
      month: 'September 2026',
      baseMaintenance: 4200,
      parkingCharges: 600,
      waterCharges: 450,
      utilityCharges: 350,
      lateFee: 0,
      totalAmount: 5600,
      dueDate: '2026-09-20',
      status: 'PAID',
      paidAt: '2026-09-08T11:22:00Z',
      paymentMethod: 'UPI',
      transactionId: 'UPI/9842109281/HDFC',
      receiptUrl: '#receipt-sep-a402',
    },
    {
      id: 'bill-aug-a402',
      billNumber: 'BILL-2026-08-A402',
      flatNumber: 'A-402',
      residentName: 'Rahul Sharma',
      month: 'August 2026',
      baseMaintenance: 4200,
      parkingCharges: 600,
      waterCharges: 420,
      utilityCharges: 380,
      lateFee: 0,
      totalAmount: 5600,
      dueDate: '2026-08-20',
      status: 'PAID',
      paidAt: '2026-08-14T09:15:00Z',
      paymentMethod: 'NET_BANKING',
      transactionId: 'NETB-8831092',
      receiptUrl: '#receipt-aug-a402',
    },
    {
      id: 'bill-sep-b201',
      billNumber: 'BILL-2026-09-B201',
      flatNumber: 'B-201',
      residentName: 'Priya Patel',
      month: 'September 2026',
      baseMaintenance: 3800,
      parkingCharges: 600,
      waterCharges: 400,
      utilityCharges: 300,
      lateFee: 0,
      totalAmount: 5100,
      dueDate: '2026-09-20',
      status: 'PENDING',
    },
    {
      id: 'bill-sep-a502',
      billNumber: 'BILL-2026-09-A502',
      flatNumber: 'A-502',
      residentName: 'R. K. Gupta',
      month: 'September 2026',
      baseMaintenance: 4200,
      parkingCharges: 600,
      waterCharges: 450,
      utilityCharges: 350,
      lateFee: 250,
      totalAmount: 5850,
      dueDate: '2026-09-05',
      status: 'OVERDUE',
    }
  ];

  const complaints: Complaint[] = [
    {
      id: 'cmp-1',
      ticketNumber: 'TKT-892',
      flatNumber: 'A-402',
      residentName: 'Rahul Sharma',
      category: 'ELEVATOR',
      title: 'Wing A Passenger Elevator jerking between 4th and 5th floor',
      description: 'The lift produced a loud metal grinding noise and suddenly shuddered when descending past the 4th floor.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      reportedAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
      assignedTo: 'Vikram Naik (Facility Engg)',
      assignedVendor: 'Schindler Express Elevator AMC',
      targetResolutionDate: '2026-09-13',
      aiSuggestedCategory: 'ELEVATOR',
      aiSuggestedPriority: 'HIGH',
      aiSuggestedVendor: 'Schindler Express Elevator AMC',
      comments: [
        {
          id: 'cm-1',
          authorName: 'SmartGate AI Classifier',
          authorRole: 'ADMIN',
          text: 'AI NLP detected critical mechanical guide-rail vibration anomaly. High priority AMC dispatch triggered.',
          createdAt: new Date(Date.now() - 19.8 * 3600 * 1000).toISOString(),
        },
        {
          id: 'cm-2',
          authorName: 'Col. R. K. Nair',
          authorRole: 'ADMIN',
          text: 'AMC technician Mr. D’Souza scheduled for onsite inspection at 11:00 AM.',
          createdAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
        }
      ]
    },
    {
      id: 'cmp-2',
      ticketNumber: 'TKT-895',
      flatNumber: 'B-201',
      residentName: 'Priya Patel',
      category: 'PLUMBING',
      title: 'Low water pressure in kitchen utility line',
      description: 'Since yesterday evening, kitchen tap flow has dropped to a trickle.',
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      reportedAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
      assignedTo: 'Suresh (Society Plumber)',
      aiSuggestedCategory: 'PLUMBING',
      aiSuggestedPriority: 'MEDIUM',
      comments: []
    }
  ];

  const amenities: Amenity[] = [
    {
      id: 'am-1',
      name: 'Clubhouse Banquet & Lounge',
      description: 'Air-conditioned multi-purpose banquet hall with AV system, projector, and pantry seating 80 guests.',
      location: 'Ground Floor, Central Block',
      capacity: 80,
      pricingType: 'HOURLY',
      ratePerHour: 500,
      openingTime: '09:00',
      closingTime: '23:00',
      rules: ['No loud music post 22:00', 'Clean up after event', 'Deposit required for decoration'],
      imageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&auto=format&fit=crop&q=80',
      isAvailable: true,
    },
    {
      id: 'am-2',
      name: 'Rooftop Infinity Swimming Pool',
      description: 'Temperature-regulated infinity pool with separate children’s splash pool and poolside sundeck.',
      location: '7th Floor Terrace',
      capacity: 25,
      pricingType: 'FREE',
      ratePerHour: 0,
      openingTime: '06:00',
      closingTime: '21:00',
      rules: ['Proper nylon/lycra swimwear mandatory', 'Children must be accompanied by adults', 'No glassware'],
      imageUrl: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=600&auto=format&fit=crop&q=80',
      isAvailable: true,
    },
    {
      id: 'am-3',
      name: 'Fitness Center & Gym',
      description: 'Fully equipped modern gymnasium with cardio equipment, free weights, kettlebells, and stretching zone.',
      location: '1st Floor, Wing A Club Area',
      capacity: 20,
      pricingType: 'FREE',
      ratePerHour: 0,
      openingTime: '05:30',
      closingTime: '22:30',
      rules: ['Carry clean gym shoes and hand towel', 'Wipe equipment after use'],
      imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80',
      isAvailable: true,
    },
    {
      id: 'am-4',
      name: 'Indoor Badminton Court',
      description: 'Synthetic rubberized double court with professional LED lighting and spectator viewing gallery.',
      location: 'Basement P1 Sports Block',
      capacity: 8,
      pricingType: 'FREE',
      ratePerHour: 0,
      openingTime: '06:00',
      closingTime: '22:00',
      rules: ['Non-marking shoes only', 'Max 60 min session booking per flat per day'],
      imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&auto=format&fit=crop&q=80',
      isAvailable: true,
    }
  ];

  const amenityBookings: AmenityBooking[] = [
    {
      id: 'bk-1',
      amenityId: 'am-1',
      amenityName: 'Clubhouse Banquet & Lounge',
      flatNumber: 'A-402',
      residentName: 'Rahul Sharma',
      bookingDate: '2026-09-18',
      timeSlot: '18:00 - 21:00',
      totalGuests: 25,
      amount: 1500,
      status: 'CONFIRMED',
      createdAt: '2026-09-10T10:00:00Z',
    },
    {
      id: 'bk-2',
      amenityId: 'am-4',
      amenityName: 'Indoor Badminton Court',
      flatNumber: 'B-201',
      residentName: 'Priya Patel',
      bookingDate: '2026-09-14',
      timeSlot: '07:00 - 08:00',
      totalGuests: 4,
      amount: 0,
      status: 'CONFIRMED',
      createdAt: '2026-09-11T16:00:00Z',
    }
  ];

  const announcements: Announcement[] = [
    {
      id: 'anc-1',
      title: 'Scheduled Water Tank Cleaning — Wing A & B',
      category: 'MAINTENANCE',
      content: 'Please be informed that overhead water tanks will undergo deep antimicrobial scrub cleaning this Thursday from 10:00 AM to 02:00 PM. Water supply will be temporarily restricted during this window.',
      isUrgent: true,
      publishedBy: 'Managing Committee',
      createdAt: '2026-09-11T08:00:00Z',
    },
    {
      id: 'anc-2',
      title: 'Apartment Autumn Cultural Festival & Food Fiesta',
      category: 'EVENT',
      content: 'Join us for an evening of live music, games, and home chef food stalls at the Central Garden on Saturday, 26th September at 6:00 PM. Stalls registration open at management desk.',
      isUrgent: false,
      publishedBy: 'Cultural Committee',
      createdAt: '2026-09-09T14:30:00Z',
    },
    {
      id: 'anc-3',
      title: 'Strict Speed Limit (15 km/h) Inside Compound & Basement',
      category: 'SECURITY',
      content: 'CCTV cameras have captured multiple overspeeding incidents in the basement driveways. Please observe the strict 15 km/h limit for resident safety.',
      isUrgent: false,
      publishedBy: 'Head of Security',
      createdAt: '2026-09-06T11:00:00Z',
    }
  ];

  const polls: Poll[] = [
    {
      id: 'pol-1',
      question: 'Should Greenwood Heights install a 50kW Rooftop Solar Panel array to offset common area electricity bills?',
      description: 'Estimated capital investment: $18,000 (projected ROI in 3.2 years). Will reduce common grid electricity bill by ~45%.',
      options: [
        { id: 'opt-1', text: 'Yes, proceed with installation', votes: 34 },
        { id: 'opt-2', text: 'No, explore other energy efficiency measures', votes: 6 },
        { id: 'opt-3', text: 'Need more financial documentation first', votes: 5 },
      ],
      expiresAt: '2026-09-25T23:59:59Z',
      votedUserIds: ['usr-res-1'],
      createdAt: '2026-09-08T10:00:00Z',
      status: 'ACTIVE',
    }
  ];

  const documents: DocumentItem[] = [
    {
      id: 'doc-1',
      title: 'Greenwood Heights Apartment Registered Bye-Laws (2026 Edition)',
      category: 'BYELAWS',
      uploadedBy: 'Col. R. K. Nair',
      fileSize: '2.4 MB',
      uploadDate: '2026-01-15',
      accessRole: 'ALL',
      downloadUrl: '#doc-byelaws-pdf',
    },
    {
      id: 'doc-2',
      title: 'Annual Statutory Fire Safety Audit & Pressure Test Certificate',
      category: 'FIRE_SAFETY',
      uploadedBy: 'Safety Officer',
      fileSize: '1.1 MB',
      uploadDate: '2026-05-20',
      accessRole: 'ALL',
      downloadUrl: '#doc-fire-safety-pdf',
    },
    {
      id: 'doc-3',
      title: 'Audited Financial Accounts & Balance Sheet Q1 2026',
      category: 'FINANCIAL',
      uploadedBy: 'Treasurer',
      fileSize: '3.8 MB',
      uploadDate: '2026-07-31',
      accessRole: 'ALL',
      downloadUrl: '#doc-financials-pdf',
    }
  ];

  const emergencyIncidents: EmergencyIncident[] = [
    {
      id: 'emg-1',
      type: 'MEDICAL',
      flatNumber: 'B-201',
      residentName: 'Priya Patel',
      phone: '+91 98765 43210',
      triggeredAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      status: 'RESOLVED',
      assignedGuardName: 'Vikram Singh',
      acknowledgedAt: new Date(Date.now() - (3 * 24 * 3600 - 45) * 1000).toISOString(),
      resolvedAt: new Date(Date.now() - (3 * 24 * 3600 - 300) * 1000).toISOString(),
      resolutionNotes: 'Resident elderly parent experienced dizziness. Security attended with first aid kit, family doctor arrived at 14:15.',
      gateAlerted: 'Gate 1 - Main Gate',
    }
  ];

  const patrolCheckpoints: GuardPatrolCheckpoint[] = [
    { id: 'cp-1', name: 'Main Gate 1 Perimeter & Pedestrian Turnstile', zone: 'Zone A', qrCode: 'SG-CP-001', lastScannedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(), lastScannedBy: 'Vikram Singh', status: 'OK' },
    { id: 'cp-2', name: 'Basement P1 & P2 EV Charging Cluster', zone: 'Zone B', qrCode: 'SG-CP-002', lastScannedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(), lastScannedBy: 'Ramesh Kumar', status: 'OK' },
    { id: 'cp-3', name: 'Terrace Infinity Pool & DG Exhaust Area', zone: 'Zone C', qrCode: 'SG-CP-003', lastScannedAt: new Date(Date.now() - 85 * 60 * 1000).toISOString(), lastScannedBy: 'Mahendra Patil', status: 'PENDING' },
    { id: 'cp-4', name: 'Rear Boundary Fence & DG Generator Shed', zone: 'Zone D', qrCode: 'SG-CP-004', lastScannedAt: new Date(Date.now() - 110 * 60 * 1000).toISOString(), lastScannedBy: 'Ramesh Kumar', status: 'OK' },
  ];

  const materialGatepasses: MaterialGatepass[] = [
    {
      id: 'mgp-1',
      passNumber: 'MGP-109',
      flatNumber: 'A-402',
      residentName: 'Rahul Sharma',
      itemDescription: 'Samsung 55-inch OLED TV (for warranty panel repair)',
      quantity: '1 unit (Boxed)',
      reason: 'Authorised service center repair pickup',
      carrierPerson: 'Naveen Services Logistics',
      date: '2026-09-12',
      status: 'APPROVED',
      approvedBy: 'Rahul Sharma',
    }
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'aud-1',
      action: 'LOGIN_SUCCESS',
      category: 'AUTH',
      userName: 'Vikram Singh',
      userRole: 'GUARD',
      details: 'Gate 1 Security terminal session authenticated.',
      timestamp: new Date(Date.now() - 7 * 3600 * 1000).toISOString(),
    },
    {
      id: 'aud-2',
      action: 'VISITOR_PRE_APPROVED',
      category: 'VISITOR',
      userName: 'Rahul Sharma',
      userRole: 'RESIDENT',
      details: 'Generated digital pass SG-4920 for guest Mohit Agarwal.',
      timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    },
    {
      id: 'aud-3',
      action: 'VISITOR_ENTRY_RECORDED',
      category: 'VISITOR',
      userName: 'Vikram Singh',
      userRole: 'GUARD',
      details: 'Guest Mohit Agarwal scanned and admitted to Flat A-402.',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    },
    {
      id: 'aud-4',
      action: 'MAINTENANCE_PAYMENT_VERIFIED',
      category: 'PAYMENT',
      userName: 'Rahul Sharma',
      userRole: 'RESIDENT',
      details: 'Received $5,600 for September 2026 maintenance bill via UPI.',
      timestamp: '2026-09-08T11:22:00Z',
    }
  ];

  const anomalies: SecurityAnomaly[] = [
    {
      id: 'anom-1',
      title: 'Visitor Overstay Detected: Delivery Driver #vis-4',
      description: 'Visitor Gopal Soni (Service Gate, visiting A-102) has remained inside compound for 4.5 hours exceeding the 60-min delivery threshold.',
      severity: 'HIGH',
      detectedAt: new Date(Date.now() - 30 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      category: 'OVERSTAY',
      status: 'INVESTIGATING',
    },
    {
      id: 'anom-2',
      title: 'Elevator Ride Vibration Warning in Wing A',
      description: 'Elevator #1 accelerometer sensors recorded peak 18% current draw anomaly during 4th-5th floor transit.',
      severity: 'MEDIUM',
      detectedAt: new Date(Date.now() - 2 * 3600 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      category: 'PATROL_GAP',
      status: 'INVESTIGATING',
    }
  ];

  return {
    users,
    flats,
    familyMembers,
    visitors,
    deliveries,
    vehicles,
    parkingSlots,
    domesticHelpers,
    maintenanceBills,
    complaints,
    amenities,
    amenityBookings,
    announcements,
    polls,
    documents,
    emergencyIncidents,
    patrolCheckpoints,
    materialGatepasses,
    auditLogs,
    anomalies,
    blacklist,
  };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } catch (e) {
        console.warn('Error reading stored DB, initializing fresh seed data:', e);
        this.data = generateInitialData();
        this.persist();
      }
    } else {
      this.data = generateInitialData();
      this.persist();
    }
  }

  private persist() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database to disk:', err);
    }
  }

  // Generic accessors
  get() {
    return this.data;
  }

  update(mutator: (data: DatabaseSchema) => void) {
    mutator(this.data);
    this.persist();
  }

  addAuditLog(action: string, category: AuditLog['category'], userName: string, userRole: AuditLog['userRole'], details: string) {
    const log: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      action,
      category,
      userName,
      userRole,
      details,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(log);
    if (this.data.auditLogs.length > 200) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 200);
    }
    this.persist();
  }
}

export const db = new Database();
