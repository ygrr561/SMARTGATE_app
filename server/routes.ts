import express, { Request, Response } from 'express';
import { db } from './db.js';
import { broadcastEvent } from './ws.js';
import {
  calculateVisitorRiskScore,
  runSecurityAnomalyCheck,
  getPredictiveTrafficData,
  classifyComplaintNLP,
  getPredictiveMaintenanceData,
  queryAIAdminAssistant
} from './ai.js';
import type { Visitor, Delivery, Complaint, EmergencyIncident, AuditLog } from './types.js';

export const apiRouter = express.Router();

// ==========================================
// 1. AUTH & USER PROFILE
// ==========================================
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, password, roleSwitchUserId } = req.body;
  const data = db.get();

  // Instant role switch support
  if (roleSwitchUserId) {
    const matchedUser = data.users.find(u => u.id === roleSwitchUserId);
    if (matchedUser) {
      db.addAuditLog('ROLE_SWITCH', 'AUTH', matchedUser.name, matchedUser.role, `Switched session to ${matchedUser.name} (${matchedUser.role})`);
      return res.json({ token: `jwt-token-${matchedUser.id}`, user: matchedUser });
    }
  }

  // Standard login match
  const user = data.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase().trim());
  if (!user) {
    // Demo fallback for any email: create/match resident or return demo
    const defaultUser = data.users[1]; // Rahul Sharma
    return res.json({ token: `jwt-token-${defaultUser.id}`, user: defaultUser });
  }

  db.addAuditLog('USER_LOGIN', 'AUTH', user.name, user.role, `User logged in successfully`);
  return res.json({ token: `jwt-token-${user.id}`, user });
});

apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string || 'usr-res-1';
  const data = db.get();
  const user = data.users.find(u => u.id === userId) || data.users[1];
  res.json({ user });
});

apiRouter.post('/auth/register', (req: Request, res: Response) => {
  const { name, email, phone, flatNumber, wing, floor } = req.body;
  const data = db.get();
  const newUser = {
    id: `usr-res-${Date.now()}`,
    name,
    email,
    phone,
    role: 'RESIDENT' as const,
    flatNumber,
    floor: Number(floor) || 1,
    wing: wing || 'Wing A',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  db.update(d => {
    d.users.push(newUser);
  });
  db.addAuditLog('RESIDENT_REGISTER', 'AUTH', name, 'RESIDENT', `New resident registered for Flat ${flatNumber}`);
  res.status(201).json({ user: newUser, token: `jwt-token-${newUser.id}` });
});

apiRouter.post('/auth/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body;
  res.json({ success: true, message: `Password reset verification link dispatched to ${email || 'your email address'}.` });
});

// ==========================================
// 2. FLATS & RESIDENTS
// ==========================================
apiRouter.get('/flats', (req: Request, res: Response) => {
  res.json(db.get().flats);
});

apiRouter.get('/family-members', (req: Request, res: Response) => {
  const flatNumber = req.query.flatNumber as string;
  let members = db.get().familyMembers;
  if (flatNumber) {
    members = members.filter(m => m.flatNumber === flatNumber);
  }
  res.json(members);
});

apiRouter.post('/family-members', (req: Request, res: Response) => {
  const { residentId, flatNumber, name, relation, phone, isEmergencyContact } = req.body;
  const newMember = {
    id: `fam-${Date.now()}`,
    residentId: residentId || 'usr-res-1',
    flatNumber: flatNumber || 'A-402',
    name,
    relation,
    phone,
    isEmergencyContact: Boolean(isEmergencyContact),
  };
  db.update(d => {
    d.familyMembers.push(newMember);
  });
  res.status(201).json(newMember);
});

// ==========================================
// 3. VISITOR MANAGEMENT (The Core Feature)
// ==========================================
apiRouter.get('/visitors', (req: Request, res: Response) => {
  const { flatNumber, status, isInside } = req.query;
  let list = db.get().visitors;

  if (flatNumber) {
    list = list.filter(v => v.flatNumber === flatNumber);
  }
  if (status) {
    list = list.filter(v => v.status === status);
  }
  if (isInside === 'true') {
    list = list.filter(v => v.status === 'INSIDE' || v.status === 'OVERSTAY');
  }

  res.json(list);
});

// Resident creates pre-approved pass
apiRouter.post('/visitors/pre-approve', (req: Request, res: Response) => {
  const { name, phone, flatNumber, residentName, purpose, vehicleNumber, vehicleType, numberOfVisitors, expectedTime } = req.body;
  const passCode = `SG-${Math.floor(1000 + Math.random() * 9000)}`;

  // Run AI risk scoring
  const riskAnalysis = calculateVisitorRiskScore({
    name,
    phone,
    flatNumber,
    isPreApproved: true,
    purpose: purpose || 'Guest Visit',
    vehicleNumber,
  });

  const newVisitor: Visitor = {
    id: `vis-${Date.now()}`,
    name,
    phone,
    flatNumber: flatNumber || 'A-402',
    residentName: residentName || 'Rahul Sharma',
    purpose: purpose || 'Guest Visit',
    type: 'GUEST',
    isPreApproved: true,
    passCode,
    vehicleNumber,
    vehicleType: vehicleType || 'CAR',
    numberOfVisitors: Number(numberOfVisitors) || 1,
    status: 'APPROVED',
    createdTime: new Date().toISOString(),
    expectedTime: expectedTime || 'Today',
    riskScore: riskAnalysis.riskScore,
    riskLevel: riskAnalysis.riskLevel,
    riskFactors: riskAnalysis.factors,
  };

  db.update(d => {
    d.visitors.unshift(newVisitor);
  });

  db.addAuditLog('VISITOR_PRE_APPROVED', 'VISITOR', newVisitor.residentName, 'RESIDENT', `Created pass ${passCode} for visitor ${name} to ${newVisitor.flatNumber}`);

  // Broadcast event to Guards
  broadcastEvent({
    type: 'VISITOR_PASS_CREATED',
    payload: newVisitor,
    targetRoles: ['GUARD', 'ADMIN'],
  });

  res.status(201).json(newVisitor);
});

// Guard registers walk-in visitor -> Triggers Real-Time Notification to Resident!
apiRouter.post('/visitors/walk-in', (req: Request, res: Response) => {
  const { name, phone, flatNumber, purpose, type, vehicleNumber, vehicleType, numberOfVisitors, guardName, gateEntered } = req.body;
  const data = db.get();

  const flat = data.flats.find(f => f.number === flatNumber);
  const residentName = flat ? flat.residentName : `Resident of ${flatNumber}`;
  const passCode = `SG-${Math.floor(1000 + Math.random() * 9000)}`;

  // Check blacklist
  const isBlacklisted = data.blacklist.some(b => b.phone.replace(/\D/g, '') === (phone || '').replace(/\D/g, ''));

  // Run AI Risk Scoring
  const riskAnalysis = calculateVisitorRiskScore({
    name,
    phone,
    flatNumber,
    isPreApproved: false,
    purpose: purpose || 'Walk-in Visit',
    vehicleNumber,
    isBlacklisted,
  });

  const newVisitor: Visitor = {
    id: `vis-${Date.now()}`,
    name,
    phone,
    flatNumber,
    residentName,
    purpose: purpose || 'Visit',
    type: type || 'GUEST',
    isPreApproved: false,
    passCode,
    vehicleNumber,
    vehicleType: vehicleType || 'NONE',
    numberOfVisitors: Number(numberOfVisitors) || 1,
    status: 'PENDING_APPROVAL',
    createdTime: new Date().toISOString(),
    gateEntered: gateEntered || 'Gate 1 - Main Gate',
    guardName: guardName || 'Vikram Singh',
    riskScore: riskAnalysis.riskScore,
    riskLevel: riskAnalysis.riskLevel,
    riskFactors: riskAnalysis.factors,
  };

  db.update(d => {
    d.visitors.unshift(newVisitor);
  });

  db.addAuditLog('WALK_IN_VISITOR_REGISTERED', 'VISITOR', newVisitor.guardName || 'Security Guard', 'GUARD', `Registered walk-in visitor ${name} for ${flatNumber}. AI Risk: ${riskAnalysis.riskLevel} (${riskAnalysis.riskScore}/100)`);

  // REAL-TIME BROADCAST TO RESIDENT FLAT!
  broadcastEvent({
    type: 'VISITOR_APPROVAL_REQUEST',
    payload: newVisitor,
    targetFlat: flatNumber,
  });

  res.status(201).json(newVisitor);
});

// Resident or Guard approves visitor
apiRouter.post('/visitors/:id/approve', (req: Request, res: Response) => {
  const { id } = req.params;
  const { approvedBy } = req.body;
  let updatedVisitor: Visitor | null = null;

  db.update(d => {
    const visitor = d.visitors.find(v => v.id === id);
    if (visitor) {
      visitor.status = 'APPROVED';
      updatedVisitor = visitor;
    }
  });

  if (!updatedVisitor) {
    return res.status(404).json({ error: 'Visitor not found' });
  }

  const v = updatedVisitor as Visitor;
  db.addAuditLog('VISITOR_APPROVED', 'VISITOR', approvedBy || v.residentName, 'RESIDENT', `Visitor ${v.name} approved for entry to ${v.flatNumber}`);

  // Broadcast to Guard in real-time
  broadcastEvent({
    type: 'VISITOR_STATUS_UPDATE',
    payload: v,
  });

  res.json(v);
});

// Resident or Guard rejects visitor
apiRouter.post('/visitors/:id/reject', (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason, rejectedBy } = req.body;
  let updatedVisitor: Visitor | null = null;

  db.update(d => {
    const visitor = d.visitors.find(v => v.id === id);
    if (visitor) {
      visitor.status = 'REJECTED';
      visitor.rejectionReason = reason || 'Resident declined entry';
      updatedVisitor = visitor;
    }
  });

  if (!updatedVisitor) {
    return res.status(404).json({ error: 'Visitor not found' });
  }

  const v = updatedVisitor as Visitor;
  db.addAuditLog('VISITOR_REJECTED', 'VISITOR', rejectedBy || v.residentName, 'RESIDENT', `Visitor ${v.name} denied entry: ${v.rejectionReason}`);

  // Broadcast status update to Guard
  broadcastEvent({
    type: 'VISITOR_STATUS_UPDATE',
    payload: v,
  });

  res.json(v);
});

// Guard records visitor Entry
apiRouter.post('/visitors/:id/record-entry', (req: Request, res: Response) => {
  const { id } = req.params;
  const { gateEntered, guardName } = req.body;
  let updatedVisitor: Visitor | null = null;

  db.update(d => {
    const visitor = d.visitors.find(v => v.id === id);
    if (visitor) {
      visitor.status = 'INSIDE';
      visitor.entryTime = new Date().toISOString();
      if (gateEntered) visitor.gateEntered = gateEntered;
      if (guardName) visitor.guardName = guardName;
      updatedVisitor = visitor;
    }
  });

  if (!updatedVisitor) {
    return res.status(404).json({ error: 'Visitor not found' });
  }

  const v = updatedVisitor as Visitor;
  db.addAuditLog('VISITOR_ENTRY_RECORDED', 'SECURITY', guardName || 'Guard', 'GUARD', `Admitted visitor ${v.name} into compound towards ${v.flatNumber}`);

  // Broadcast to Resident: "Your visitor has entered the gate!"
  broadcastEvent({
    type: 'VISITOR_ENTRY_ALERT',
    payload: v,
    targetFlat: v.flatNumber,
  });

  res.json(v);
});

// Guard records visitor Exit
apiRouter.post('/visitors/:id/record-exit', (req: Request, res: Response) => {
  const { id } = req.params;
  const { gateExited, guardName } = req.body;
  let updatedVisitor: Visitor | null = null;

  db.update(d => {
    const visitor = d.visitors.find(v => v.id === id);
    if (visitor) {
      visitor.status = 'EXITED';
      visitor.exitTime = new Date().toISOString();
      visitor.gateExited = gateExited || 'Gate 1 - Main Gate';
      visitor.isOverstay = false;
      updatedVisitor = visitor;
    }
  });

  if (!updatedVisitor) {
    return res.status(404).json({ error: 'Visitor not found' });
  }

  const v = updatedVisitor as Visitor;
  db.addAuditLog('VISITOR_EXIT_RECORDED', 'SECURITY', guardName || 'Guard', 'GUARD', `Visitor ${v.name} exited premises through ${v.gateExited}`);

  broadcastEvent({
    type: 'VISITOR_EXIT_ALERT',
    payload: v,
    targetFlat: v.flatNumber,
  });

  res.json(v);
});

// Verify Pass Code / QR Code
apiRouter.post('/visitors/verify-code', (req: Request, res: Response) => {
  const { code } = req.body;
  const cleanCode = (code || '').toUpperCase().trim();
  const visitor = db.get().visitors.find(v => v.passCode === cleanCode || v.id === cleanCode);

  if (!visitor) {
    return res.status(404).json({ valid: false, message: 'Invalid or expired QR pass code.' });
  }

  res.json({
    valid: true,
    visitor,
    message: `Pass verified for ${visitor.name} (${visitor.flatNumber})`,
  });
});

// Manual Guard Override
apiRouter.post('/visitors/:id/override', (req: Request, res: Response) => {
  const { id } = req.params;
  const { overrideReason, guardName } = req.body;
  let updated: Visitor | null = null;

  db.update(d => {
    const visitor = d.visitors.find(v => v.id === id);
    if (visitor) {
      visitor.status = 'INSIDE';
      visitor.entryTime = new Date().toISOString();
      visitor.overrideReason = overrideReason || 'Guard manual security override';
      visitor.overrideBy = guardName || 'Vikram Singh';
      updated = visitor;
    }
  });

  if (!updated) return res.status(404).json({ error: 'Visitor not found' });
  const v = updated as Visitor;
  db.addAuditLog('GUARD_OVERRIDE', 'SECURITY', guardName || 'Guard', 'GUARD', `Manual gate override granted to visitor ${v.name} (${v.flatNumber}): ${overrideReason}`);

  broadcastEvent({
    type: 'VISITOR_STATUS_UPDATE',
    payload: v,
  });

  res.json(v);
});

// Blacklist
apiRouter.get('/visitors/blacklist', (req: Request, res: Response) => {
  res.json(db.get().blacklist);
});

apiRouter.post('/visitors/blacklist', (req: Request, res: Response) => {
  const { phone, name, reason } = req.body;
  const entry = { phone, name, reason, addedAt: new Date().toISOString() };
  db.update(d => {
    d.blacklist.push(entry);
  });
  db.addAuditLog('BLACKLIST_ADDED', 'SECURITY', 'Admin', 'ADMIN', `Blacklisted ${name} (${phone}): ${reason}`);
  res.status(201).json(entry);
});

// ==========================================
// 4. DELIVERIES
// ==========================================
apiRouter.get('/deliveries', (req: Request, res: Response) => {
  const { flatNumber } = req.query;
  let list = db.get().deliveries;
  if (flatNumber) {
    list = list.filter(d => d.flatNumber === flatNumber);
  }
  res.json(list);
});

apiRouter.post('/deliveries', (req: Request, res: Response) => {
  const { company, deliveryPersonName, phone, flatNumber, packageCount, trackingNumber, guardName, gateEntered } = req.body;
  const data = db.get();
  const flat = data.flats.find(f => f.number === flatNumber);
  const residentName = flat ? flat.residentName : `Resident of ${flatNumber}`;
  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  const newDelivery: Delivery = {
    id: `del-${Date.now()}`,
    company: company || 'Amazon',
    deliveryPersonName: deliveryPersonName || 'Delivery Associate',
    phone: phone || '+91 99000 11223',
    flatNumber,
    residentName,
    packageCount: Number(packageCount) || 1,
    trackingNumber: trackingNumber || `TRK${Math.floor(100000 + Math.random() * 900000)}`,
    entryTime: new Date().toISOString(),
    status: 'AT_GATE',
    leaveAtGateOtp: otp,
    gateEntered: gateEntered || 'Gate 1 - Main Gate',
    guardName: guardName || 'Vikram Singh',
  };

  db.update(d => {
    d.deliveries.unshift(newDelivery);
  });

  db.addAuditLog('DELIVERY_LOGGED', 'VISITOR', newDelivery.guardName, 'GUARD', `${newDelivery.company} parcel logged for ${flatNumber} (OTP: ${otp})`);

  broadcastEvent({
    type: 'DELIVERY_NOTIFICATION',
    payload: newDelivery,
    targetFlat: flatNumber,
  });

  res.status(201).json(newDelivery);
});

apiRouter.put('/deliveries/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  let updated: Delivery | null = null;

  db.update(d => {
    const item = d.deliveries.find(del => del.id === id);
    if (item) {
      item.status = status;
      updated = item;
    }
  });

  if (!updated) return res.status(404).json({ error: 'Delivery not found' });
  const del = updated as Delivery;
  db.addAuditLog('DELIVERY_STATUS_CHANGED', 'VISITOR', 'System', 'GUARD', `Delivery ${del.id} marked ${status} for ${del.flatNumber}`);

  broadcastEvent({
    type: 'DELIVERY_UPDATE',
    payload: del,
    targetFlat: del.flatNumber,
  });

  res.json(del);
});

// ==========================================
// 5. VEHICLES & PARKING
// ==========================================
apiRouter.get('/vehicles', (req: Request, res: Response) => {
  const { flatNumber } = req.query;
  let list = db.get().vehicles;
  if (flatNumber) {
    list = list.filter(v => v.flatNumber === flatNumber);
  }
  res.json(list);
});

apiRouter.post('/vehicles', (req: Request, res: Response) => {
  const { registrationNumber, type, brandModel, color, flatNumber, residentName, isElectric } = req.body;
  const cleanReg = registrationNumber.toUpperCase().trim();
  const newVeh = {
    id: `veh-${Date.now()}`,
    registrationNumber: cleanReg,
    type: type || 'CAR',
    brandModel: brandModel || 'Sedan',
    color: color || 'Silver',
    flatNumber: flatNumber || 'A-402',
    residentName: residentName || 'Rahul Sharma',
    residentPhone: '+91 98450 12345',
    parkingSlot: `P-${flatNumber}`,
    isElectric: Boolean(isElectric),
    status: 'INSIDE' as const,
    lastMovementTime: new Date().toISOString(),
  };

  db.update(d => {
    d.vehicles.unshift(newVeh);
  });
  db.addAuditLog('VEHICLE_REGISTERED', 'SECURITY', residentName, 'RESIDENT', `Registered vehicle ${cleanReg} for ${flatNumber}`);
  res.status(201).json(newVeh);
});

apiRouter.get('/parking/slots', (req: Request, res: Response) => {
  res.json(db.get().parkingSlots);
});

// ==========================================
// 6. DOMESTIC HELP
// ==========================================
apiRouter.get('/domestic-help', (req: Request, res: Response) => {
  const { flatNumber } = req.query;
  let list = db.get().domesticHelpers;
  if (flatNumber) {
    list = list.filter(dh => dh.assignedFlats.includes(flatNumber as string));
  }
  res.json(list);
});

apiRouter.post('/domestic-help/:id/toggle-attendance', (req: Request, res: Response) => {
  const { id } = req.params;
  const { guardName } = req.body;
  let updatedHelper: any = null;

  db.update(d => {
    const helper = d.domesticHelpers.find(dh => dh.id === id || dh.badgeNumber === id);
    if (helper) {
      if (helper.status === 'OUTSIDE') {
        helper.status = 'INSIDE';
        helper.lastEntryTime = new Date().toISOString();
      } else {
        helper.status = 'OUTSIDE';
        helper.lastExitTime = new Date().toISOString();
      }
      updatedHelper = helper;
    }
  });

  if (!updatedHelper) return res.status(404).json({ error: 'Helper not found' });
  db.addAuditLog('HELPER_ATTENDANCE', 'SECURITY', guardName || 'Gate Guard', 'GUARD', `${updatedHelper.name} (${updatedHelper.badgeNumber}) status toggled to ${updatedHelper.status}`);
  res.json(updatedHelper);
});

// ==========================================
// 7. MAINTENANCE & PAYMENTS
// ==========================================
apiRouter.get('/maintenance/bills', (req: Request, res: Response) => {
  const { flatNumber } = req.query;
  let bills = db.get().maintenanceBills;
  if (flatNumber) {
    bills = bills.filter(b => b.flatNumber === flatNumber);
  }
  res.json(bills);
});

apiRouter.post('/maintenance/pay', (req: Request, res: Response) => {
  const { billId, paymentMethod } = req.body;
  let updatedBill: any = null;

  db.update(d => {
    const bill = d.maintenanceBills.find(b => b.id === billId);
    if (bill) {
      bill.status = 'PAID';
      bill.paidAt = new Date().toISOString();
      bill.paymentMethod = paymentMethod || 'UPI';
      bill.transactionId = `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`;
      bill.receiptUrl = `#receipt-${bill.id}`;
      updatedBill = bill;
    }
  });

  if (!updatedBill) return res.status(404).json({ error: 'Bill not found' });
  db.addAuditLog('MAINTENANCE_PAYMENT', 'PAYMENT', updatedBill.residentName, 'RESIDENT', `Paid $${updatedBill.totalAmount} for ${updatedBill.month} via ${updatedBill.paymentMethod}`);
  res.json(updatedBill);
});

apiRouter.get('/maintenance/summary', (req: Request, res: Response) => {
  const bills = db.get().maintenanceBills;
  const totalBills = bills.length;
  const paidBills = bills.filter(b => b.status === 'PAID');
  const collected = paidBills.reduce((acc, b) => acc + b.totalAmount, 0);
  const pendingBills = bills.filter(b => b.status !== 'PAID');
  const pending = pendingBills.reduce((acc, b) => acc + b.totalAmount, 0);
  const totalExpected = collected + pending;
  const collectionPct = totalExpected > 0 ? Math.round((collected / totalExpected) * 100) : 100;

  res.json({
    totalBills,
    collectedAmount: collected,
    pendingAmount: pending,
    expectedAmount: totalExpected,
    collectionPercentage: collectionPct,
    defaultersCount: pendingBills.length,
    defaultersList: pendingBills.map(b => ({
      flatNumber: b.flatNumber,
      residentName: b.residentName,
      month: b.month,
      amount: b.totalAmount,
      dueDate: b.dueDate,
      isOverdue: b.status === 'OVERDUE',
    })),
  });
});

// ==========================================
// 8. COMPLAINTS & HELPDESK
// ==========================================
apiRouter.get('/complaints', (req: Request, res: Response) => {
  const { flatNumber } = req.query;
  let list = db.get().complaints;
  if (flatNumber) {
    list = list.filter(c => c.flatNumber === flatNumber);
  }
  res.json(list);
});

apiRouter.post('/complaints', (req: Request, res: Response) => {
  const { flatNumber, residentName, title, description } = req.body;

  // Run AI NLP classification
  const nlpResult = classifyComplaintNLP(`${title} ${description}`);

  const ticketNumber = `TKT-${Math.floor(800 + Math.random() * 200)}`;
  const newComplaint: Complaint = {
    id: `cmp-${Date.now()}`,
    ticketNumber,
    flatNumber: flatNumber || 'A-402',
    residentName: residentName || 'Rahul Sharma',
    category: nlpResult.category,
    title,
    description,
    priority: nlpResult.priority,
    status: 'REPORTED',
    reportedAt: new Date().toISOString(),
    assignedVendor: nlpResult.suggestedVendor,
    aiSuggestedCategory: nlpResult.category,
    aiSuggestedPriority: nlpResult.priority,
    aiSuggestedVendor: nlpResult.suggestedVendor,
    comments: [
      {
        id: `cm-${Date.now()}`,
        authorName: 'SmartGate AI NLP Engine',
        authorRole: 'ADMIN',
        text: `Automated Ticket Triage: Categorized as ${nlpResult.category} with ${nlpResult.priority} priority. Root cause: ${nlpResult.detectedIssue}. Estimated resolution: ${nlpResult.estimatedResolutionHours} hours.`,
        createdAt: new Date().toISOString(),
      }
    ],
  };

  db.update(d => {
    d.complaints.unshift(newComplaint);
  });

  db.addAuditLog('COMPLAINT_LOGGED', 'COMPLAINT', newComplaint.residentName, 'RESIDENT', `Logged ticket ${ticketNumber}: ${title} (${nlpResult.category})`);

  broadcastEvent({
    type: 'COMPLAINT_CREATED',
    payload: newComplaint,
  });

  res.status(201).json(newComplaint);
});

apiRouter.post('/complaints/:id/comment', (req: Request, res: Response) => {
  const { id } = req.params;
  const { authorName, authorRole, text } = req.body;
  let updated: Complaint | null = null;

  db.update(d => {
    const comp = d.complaints.find(c => c.id === id);
    if (comp) {
      comp.comments.push({
        id: `cm-${Date.now()}`,
        authorName: authorName || 'Support Desk',
        authorRole: authorRole || 'ADMIN',
        text,
        createdAt: new Date().toISOString(),
      });
      updated = comp;
    }
  });

  if (!updated) return res.status(404).json({ error: 'Complaint not found' });
  res.json(updated);
});

apiRouter.put('/complaints/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, assignedTo, assignedVendor, resolutionNotes } = req.body;
  let updated: Complaint | null = null;

  db.update(d => {
    const comp = d.complaints.find(c => c.id === id);
    if (comp) {
      comp.status = status;
      if (assignedTo) comp.assignedTo = assignedTo;
      if (assignedVendor) comp.assignedVendor = assignedVendor;
      if (resolutionNotes) comp.resolutionNotes = resolutionNotes;
      if (status === 'RESOLVED' || status === 'CLOSED') {
        comp.resolvedAt = new Date().toISOString();
      }
      updated = comp;
    }
  });

  if (!updated) return res.status(404).json({ error: 'Complaint not found' });
  res.json(updated);
});

// ==========================================
// 9. AMENITIES
// ==========================================
apiRouter.get('/amenities', (req: Request, res: Response) => {
  res.json(db.get().amenities);
});

apiRouter.get('/amenities/bookings', (req: Request, res: Response) => {
  const { flatNumber } = req.query;
  let list = db.get().amenityBookings;
  if (flatNumber) {
    list = list.filter(b => b.flatNumber === flatNumber);
  }
  res.json(list);
});

apiRouter.post('/amenities/book', (req: Request, res: Response) => {
  const { amenityId, bookingDate, timeSlot, totalGuests, flatNumber, residentName } = req.body;
  const data = db.get();
  const amenity = data.amenities.find(a => a.id === amenityId);
  if (!amenity) return res.status(404).json({ error: 'Amenity not found' });

  const hours = 2; // default slot length
  const amount = amenity.pricingType === 'HOURLY' ? amenity.ratePerHour * hours : 0;

  const newBooking = {
    id: `bk-${Date.now()}`,
    amenityId,
    amenityName: amenity.name,
    flatNumber: flatNumber || 'A-402',
    residentName: residentName || 'Rahul Sharma',
    bookingDate,
    timeSlot,
    totalGuests: Number(totalGuests) || 1,
    amount,
    status: 'CONFIRMED' as const,
    createdAt: new Date().toISOString(),
  };

  db.update(d => {
    d.amenityBookings.unshift(newBooking);
  });

  db.addAuditLog('AMENITY_BOOKED', 'SETTINGS', newBooking.residentName, 'RESIDENT', `Booked ${amenity.name} for ${bookingDate} (${timeSlot})`);
  res.status(201).json(newBooking);
});

// ==========================================
// 10. ANNOUNCEMENTS, POLLS, DOCUMENTS
// ==========================================
apiRouter.get('/announcements', (req: Request, res: Response) => {
  res.json(db.get().announcements);
});

apiRouter.post('/announcements', (req: Request, res: Response) => {
  const { title, category, content, isUrgent, publishedBy } = req.body;
  const newAnc = {
    id: `anc-${Date.now()}`,
    title,
    category: category || 'GENERAL',
    content,
    isUrgent: Boolean(isUrgent),
    publishedBy: publishedBy || 'Managing Committee',
    createdAt: new Date().toISOString(),
  };
  db.update(d => {
    d.announcements.unshift(newAnc);
  });
  broadcastEvent({
    type: 'ANNOUNCEMENT_CREATED',
    payload: newAnc,
  });
  res.status(201).json(newAnc);
});

apiRouter.get('/polls', (req: Request, res: Response) => {
  res.json(db.get().polls);
});

apiRouter.post('/polls/:id/vote', (req: Request, res: Response) => {
  const { id } = req.params;
  const { optionId, userId } = req.body;
  let updatedPoll: any = null;

  db.update(d => {
    const poll = d.polls.find(p => p.id === id);
    if (poll) {
      if (!poll.votedUserIds.includes(userId)) {
        poll.votedUserIds.push(userId);
        const opt = poll.options.find(o => o.id === optionId);
        if (opt) opt.votes += 1;
      }
      updatedPoll = poll;
    }
  });

  if (!updatedPoll) return res.status(404).json({ error: 'Poll not found' });
  res.json(updatedPoll);
});

apiRouter.get('/documents', (req: Request, res: Response) => {
  res.json(db.get().documents);
});

// ==========================================
// 11. SOS & EMERGENCY SYSTEM
// ==========================================
apiRouter.get('/emergency/incidents', (req: Request, res: Response) => {
  res.json(db.get().emergencyIncidents);
});

// Resident presses SOS -> Triggers immediate siren and alerts Guards & Admin
apiRouter.post('/emergency/trigger', (req: Request, res: Response) => {
  const { type, flatNumber, residentName, phone } = req.body;
  const newIncident: EmergencyIncident = {
    id: `emg-${Date.now()}`,
    type: type || 'MEDICAL',
    flatNumber: flatNumber || 'A-402',
    residentName: residentName || 'Rahul Sharma',
    phone: phone || '+91 98450 12345',
    triggeredAt: new Date().toISOString(),
    status: 'TRIGGERED',
    gateAlerted: 'Gate 1 & Gate 2 Terminals',
  };

  db.update(d => {
    d.emergencyIncidents.unshift(newIncident);
  });

  db.addAuditLog('EMERGENCY_SOS_TRIGGERED', 'EMERGENCY', residentName || flatNumber, 'RESIDENT', `CRITICAL SOS ALARM: ${newIncident.type} emergency triggered at Flat ${newIncident.flatNumber}`);

  // High priority broadcast across all guard stations & admin
  broadcastEvent({
    type: 'EMERGENCY_SOS_ALERT',
    payload: newIncident,
    targetRoles: ['GUARD', 'ADMIN'],
  });

  res.status(201).json(newIncident);
});

apiRouter.post('/emergency/:id/acknowledge', (req: Request, res: Response) => {
  const { id } = req.params;
  const { guardName } = req.body;
  let updated: EmergencyIncident | null = null;

  db.update(d => {
    const inc = d.emergencyIncidents.find(e => e.id === id);
    if (inc) {
      inc.status = 'ACKNOWLEDGED';
      inc.assignedGuardName = guardName || 'Vikram Singh';
      inc.acknowledgedAt = new Date().toISOString();
      updated = inc;
    }
  });

  if (!updated) return res.status(404).json({ error: 'Incident not found' });
  const inc = updated as EmergencyIncident;
  db.addAuditLog('EMERGENCY_ACKNOWLEDGED', 'EMERGENCY', guardName || 'Guard', 'GUARD', `Guard ${guardName} acknowledged SOS from ${inc.flatNumber} and is responding`);

  broadcastEvent({
    type: 'EMERGENCY_STATUS_UPDATE',
    payload: inc,
  });

  res.json(inc);
});

apiRouter.post('/emergency/:id/resolve', (req: Request, res: Response) => {
  const { id } = req.params;
  const { resolutionNotes, resolvedBy } = req.body;
  let updated: EmergencyIncident | null = null;

  db.update(d => {
    const inc = d.emergencyIncidents.find(e => e.id === id);
    if (inc) {
      inc.status = 'RESOLVED';
      inc.resolvedAt = new Date().toISOString();
      inc.resolutionNotes = resolutionNotes || 'Assisted resident, situation under control.';
      updated = inc;
    }
  });

  if (!updated) return res.status(404).json({ error: 'Incident not found' });
  const inc = updated as EmergencyIncident;
  db.addAuditLog('EMERGENCY_RESOLVED', 'EMERGENCY', resolvedBy || 'Guard', 'GUARD', `SOS Incident at ${inc.flatNumber} resolved: ${inc.resolutionNotes}`);

  broadcastEvent({
    type: 'EMERGENCY_STATUS_UPDATE',
    payload: inc,
  });

  res.json(inc);
});

// ==========================================
// 12. GUARD PATROL & MATERIAL GATEPASS
// ==========================================
apiRouter.get('/patrol/checkpoints', (req: Request, res: Response) => {
  res.json(db.get().patrolCheckpoints);
});

apiRouter.post('/patrol/scan', (req: Request, res: Response) => {
  const { qrCode, guardName } = req.body;
  let updatedCp: any = null;

  db.update(d => {
    const cp = d.patrolCheckpoints.find(c => c.qrCode === qrCode || c.id === qrCode);
    if (cp) {
      cp.status = 'OK';
      cp.lastScannedAt = new Date().toISOString();
      cp.lastScannedBy = guardName || 'Vikram Singh';
      updatedCp = cp;
    }
  });

  if (!updatedCp) return res.status(404).json({ error: 'Checkpoint not found' });
  db.addAuditLog('PATROL_CHECKPOINT_SCANNED', 'SECURITY', guardName || 'Guard', 'GUARD', `Scanned patrol checkpoint: ${updatedCp.name}`);
  res.json(updatedCp);
});

apiRouter.get('/gatepasses', (req: Request, res: Response) => {
  const { flatNumber } = req.query;
  let list = db.get().materialGatepasses;
  if (flatNumber) {
    list = list.filter(g => g.flatNumber === flatNumber);
  }
  res.json(list);
});

apiRouter.post('/gatepasses', (req: Request, res: Response) => {
  const { flatNumber, residentName, itemDescription, quantity, reason, carrierPerson } = req.body;
  const passNumber = `MGP-${Math.floor(100 + Math.random() * 900)}`;
  const newPass = {
    id: `mgp-${Date.now()}`,
    passNumber,
    flatNumber: flatNumber || 'A-402',
    residentName: residentName || 'Rahul Sharma',
    itemDescription,
    quantity,
    reason,
    carrierPerson,
    date: new Date().toISOString().split('T')[0],
    status: 'APPROVED' as const,
    approvedBy: residentName || 'Rahul Sharma',
  };

  db.update(d => {
    d.materialGatepasses.unshift(newPass);
  });
  db.addAuditLog('GATEPASS_CREATED', 'SECURITY', residentName, 'RESIDENT', `Issued material gatepass ${passNumber} for: ${itemDescription}`);
  res.status(201).json(newPass);
});

apiRouter.put('/gatepasses/:id/verify', (req: Request, res: Response) => {
  const { id } = req.params;
  const { guardName } = req.body;
  let updated: any = null;

  db.update(d => {
    const gp = d.materialGatepasses.find(g => g.id === id || g.passNumber === id);
    if (gp) {
      gp.status = 'VERIFIED_EXIT';
      gp.verifiedAt = new Date().toISOString();
      updated = gp;
    }
  });

  if (!updated) return res.status(404).json({ error: 'Gatepass not found' });
  db.addAuditLog('GATEPASS_VERIFIED', 'SECURITY', guardName || 'Guard', 'GUARD', `Verified material gatepass ${updated.passNumber} for ${updated.flatNumber}`);
  res.json(updated);
});

// ==========================================
// 13. SMARTGATE AI INTELLIGENCE APIs
// ==========================================
apiRouter.post('/ai/risk-score', (req: Request, res: Response) => {
  const result = calculateVisitorRiskScore(req.body);
  res.json(result);
});

apiRouter.get('/ai/anomalies', (req: Request, res: Response) => {
  const data = db.get();
  const insideVisitors = data.visitors.filter(v => v.status === 'INSIDE' || v.status === 'OVERSTAY');
  const rejectedToday = data.visitors.filter(v => v.status === 'REJECTED').length;
  const overstayCount = data.visitors.filter(v => v.status === 'OVERSTAY').length;
  const activeEmergencies = data.emergencyIncidents.filter(e => e.status !== 'RESOLVED').length;

  const dynamicAnomalies = runSecurityAnomalyCheck({
    activeVisitorsCount: insideVisitors.length,
    rejectedVisitorsToday: rejectedToday,
    lateNightEntriesCount: 2,
    overstayVisitorsCount: overstayCount,
    openEmergenciesCount: activeEmergencies,
  });

  res.json([...dynamicAnomalies, ...data.anomalies]);
});

apiRouter.get('/ai/traffic-predictions', (req: Request, res: Response) => {
  res.json(getPredictiveTrafficData());
});

apiRouter.post('/ai/classify-complaint', (req: Request, res: Response) => {
  const { text } = req.body;
  const analysis = classifyComplaintNLP(text || '');
  res.json(analysis);
});

apiRouter.get('/ai/predictive-maintenance', (req: Request, res: Response) => {
  res.json(getPredictiveMaintenanceData());
});

apiRouter.post('/ai/assistant', async (req: Request, res: Response) => {
  const { question } = req.body;
  const data = db.get();

  const totalResidents = data.flats.filter(f => f.status === 'OCCUPIED').reduce((acc, f) => acc + f.familyMembersCount, 0);
  const occupiedFlats = data.flats.filter(f => f.status === 'OCCUPIED').length;
  const totalVisitorsToday = data.visitors.length;
  const activeVisitorsInside = data.visitors.filter(v => v.status === 'INSIDE' || v.status === 'OVERSTAY').length;
  const pendingApprovals = data.visitors.filter(v => v.status === 'PENDING_APPROVAL').length;
  const openComplaints = data.complaints.filter(c => c.status !== 'CLOSED' && c.status !== 'RESOLVED').length;
  const paidBills = data.maintenanceBills.filter(b => b.status === 'PAID');
  const pendingBills = data.maintenanceBills.filter(b => b.status !== 'PAID');
  const collectedMaintenanceAmount = paidBills.reduce((acc, b) => acc + b.totalAmount, 0);
  const pendingMaintenanceAmount = pendingBills.reduce((acc, b) => acc + b.totalAmount, 0);
  const activeEmergencies = data.emergencyIncidents.filter(e => e.status !== 'RESOLVED').length;

  const answer = await queryAIAdminAssistant(question || 'Give me a summary of today', {
    totalResidents,
    occupiedFlats,
    totalVisitorsToday,
    activeVisitorsInside,
    pendingApprovals,
    openComplaints,
    collectedMaintenanceAmount,
    pendingMaintenanceAmount,
    activeEmergencies,
    parkingOccupancyPct: 78,
    anomaliesCount: data.anomalies.length,
  });

  res.json({ answer });
});

// ==========================================
// 14. AUDIT LOGS & CONSOLIDATED DASHBOARD STATS
// ==========================================
apiRouter.get('/audit/logs', (req: Request, res: Response) => {
  res.json(db.get().auditLogs);
});

apiRouter.get('/system/stats', (req: Request, res: Response) => {
  const data = db.get();
  const occupiedFlats = data.flats.filter(f => f.status === 'OCCUPIED').length;
  const totalResidents = data.flats.filter(f => f.status === 'OCCUPIED').reduce((acc, f) => acc + f.familyMembersCount, 0);
  const totalVisitors = data.visitors.length;
  const activeVisitors = data.visitors.filter(v => v.status === 'INSIDE' || v.status === 'OVERSTAY').length;
  const pendingApprovals = data.visitors.filter(v => v.status === 'PENDING_APPROVAL').length;
  const totalVehicles = data.vehicles.length;
  const vehiclesInside = data.vehicles.filter(v => v.status === 'INSIDE').length;
  const openComplaints = data.complaints.filter(c => c.status !== 'CLOSED' && c.status !== 'RESOLVED').length;
  const activeEmergencies = data.emergencyIncidents.filter(e => e.status !== 'RESOLVED').length;
  const occupiedParking = data.parkingSlots.filter(p => p.isOccupied).length;

  res.json({
    totalFlats: data.flats.length,
    occupiedFlats,
    totalResidents,
    totalVisitors,
    activeVisitors,
    pendingApprovals,
    totalVehicles,
    vehiclesInside,
    openComplaints,
    activeEmergencies,
    occupiedParking,
    totalParkingSlots: data.parkingSlots.length,
    parkingOccupancyPct: Math.round((occupiedParking / data.parkingSlots.length) * 100),
    anomaliesCount: data.anomalies.length,
  });
});
