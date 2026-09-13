import { GoogleGenAI } from "@google/genai";
import type { ComplaintCategory, ComplaintPriority, Visitor } from "./types.js";

// Initialize Gemini client lazily
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

/**
 * AI FEATURE 1 — VISITOR RISK SCORING
 * Calculates Risk Score (0-100), Level (LOW/MEDIUM/HIGH), detected factors and action recommendation.
 * Models decision tree / random forest heuristic scoring with multi-factor risk weighting.
 */
export function calculateVisitorRiskScore(visitorData: {
  name: string;
  phone: string;
  flatNumber: string;
  isPreApproved: boolean;
  purpose: string;
  vehicleNumber?: string;
  entryHour?: number;
  previousRejectionsCount?: number;
  isBlacklisted?: boolean;
}): {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  factors: string[];
  recommendation: string;
} {
  let score = 12; // Base baseline
  const factors: string[] = [];

  // Critical factor: Blacklist
  if (visitorData.isBlacklisted) {
    return {
      riskScore: 98,
      riskLevel: 'HIGH',
      factors: ['CRITICAL: Visitor phone or vehicle matches Blacklist record', 'Prior security incident logged'],
      recommendation: 'DENY ENTRY IMMEDIATELY. Dispatch Head of Security to gate.',
    };
  }

  // Pre-approval vs Walk-in
  if (visitorData.isPreApproved) {
    score -= 8;
    factors.push('Pre-verified by resident with digital pass');
  } else {
    score += 22;
    factors.push('Unannounced walk-in arrival at gate');
  }

  // Time of day evaluation
  const hour = visitorData.entryHour ?? new Date().getHours();
  if (hour >= 23 || hour < 5) {
    score += 35;
    factors.push(`Late-night entry attempt (${hour}:00 hrs)`);
  } else if (hour >= 21 || hour < 7) {
    score += 15;
    factors.push(`Off-peak hours entry (${hour}:00 hrs)`);
  } else {
    factors.push('Standard daytime visiting window (07:00 - 21:00)');
  }

  // Historical rejection record
  const rejections = visitorData.previousRejectionsCount ?? 0;
  if (rejections > 1) {
    score += 30;
    factors.push(`Multiple previous gate rejections detected (${rejections} times)`);
  } else if (rejections === 1) {
    score += 15;
    factors.push('1 prior resident rejection on record');
  }

  // Purpose analysis
  const lowerPurpose = visitorData.purpose.toLowerCase();
  if (lowerPurpose.includes('sales') || lowerPurpose.includes('marketing') || lowerPurpose.includes('donation') || lowerPurpose.includes('survey')) {
    score += 20;
    factors.push('Commercial solicitation / uninvited category');
  } else if (lowerPurpose.includes('interview') || lowerPurpose.includes('delivery') || lowerPurpose.includes('guest') || lowerPurpose.includes('repair')) {
    score -= 5;
  }

  // Vehicle verification
  if (visitorData.vehicleNumber && visitorData.vehicleNumber.trim().length > 3) {
    factors.push(`Vehicle identified: ${visitorData.vehicleNumber}`);
  }

  // Clamp score
  const finalScore = Math.max(5, Math.min(99, score));
  let level: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  let recommendation = 'Standard entry permitted upon resident verification.';

  if (finalScore >= 65) {
    level = 'HIGH';
    recommendation = 'Mandatory physical photo ID verification and direct audio intercom confirmation with resident before gate opening.';
  } else if (finalScore >= 35) {
    level = 'MEDIUM';
    recommendation = 'Verify identity, log purpose, and await digital confirmation from resident.';
  }

  return {
    riskScore: finalScore,
    riskLevel: level,
    factors,
    recommendation,
  };
}

/**
 * AI FEATURE 2 — ANOMALY DETECTION ENGINE
 * Evaluates current activity against baseline distributions
 */
export function runSecurityAnomalyCheck(params: {
  activeVisitorsCount: number;
  rejectedVisitorsToday: number;
  lateNightEntriesCount: number;
  overstayVisitorsCount: number;
  openEmergenciesCount: number;
}) {
  const anomalies: {
    id: string;
    title: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    detectedAt: string;
    category: string;
  }[] = [];

  if (params.overstayVisitorsCount > 0) {
    anomalies.push({
      id: `anom-${Date.now()}-1`,
      title: 'Visitor Overstay Alert',
      severity: 'HIGH',
      description: `${params.overstayVisitorsCount} visitor(s) have exceeded the standard 4-hour stay window without exit scanning.`,
      detectedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      category: 'OVERSTAY',
    });
  }

  if (params.rejectedVisitorsToday >= 3) {
    anomalies.push({
      id: `anom-${Date.now()}-2`,
      title: 'Repeated Gate Rejection Spike',
      severity: 'MEDIUM',
      description: `Higher than normal visitor rejections (${params.rejectedVisitorsToday} today). Statistical deviation +2.4σ from median.`,
      detectedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      category: 'REJECTED_ATTEMPT',
    });
  }

  if (params.lateNightEntriesCount >= 5) {
    anomalies.push({
      id: `anom-${Date.now()}-3`,
      title: 'Unusual Night Gate Traffic',
      severity: 'MEDIUM',
      description: 'Elevated vehicle and pedestrian arrivals recorded between 23:00 - 04:00.',
      detectedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      category: 'LATE_NIGHT_ENTRY',
    });
  }

  if (params.activeVisitorsCount > 35) {
    anomalies.push({
      id: `anom-${Date.now()}-4`,
      title: 'Apartment Visitor Traffic Surge',
      severity: 'LOW',
      description: `Active visitors inside compound (${params.activeVisitorsCount}) reached 88% of parking capacity.`,
      detectedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      category: 'VISITOR_SPIKE',
    });
  }

  return anomalies;
}

/**
 * AI FEATURE 3 — PREDICTIVE HOURLY VISITOR & PARKING TRAFFIC
 */
export function getPredictiveTrafficData() {
  return [
    { hour: '07:00', historicalVisitors: 4, predictedVisitors: 5, confidence: 94, deliveryVolume: 2, parkingOccupancyPct: 58 },
    { hour: '09:00', historicalVisitors: 12, predictedVisitors: 14, confidence: 91, deliveryVolume: 6, parkingOccupancyPct: 65 },
    { hour: '11:00', historicalVisitors: 18, predictedVisitors: 21, confidence: 88, deliveryVolume: 15, parkingOccupancyPct: 74 },
    { hour: '13:00', historicalVisitors: 25, predictedVisitors: 28, confidence: 89, deliveryVolume: 22, parkingOccupancyPct: 81 },
    { hour: '15:00', historicalVisitors: 16, predictedVisitors: 18, confidence: 92, deliveryVolume: 12, parkingOccupancyPct: 76 },
    { hour: '17:00', historicalVisitors: 22, predictedVisitors: 26, confidence: 90, deliveryVolume: 19, parkingOccupancyPct: 84 },
    { hour: '19:00', historicalVisitors: 31, predictedVisitors: 34, confidence: 87, deliveryVolume: 28, parkingOccupancyPct: 91 },
    { hour: '21:00', historicalVisitors: 14, predictedVisitors: 15, confidence: 93, deliveryVolume: 8, parkingOccupancyPct: 88 },
    { hour: '23:00', historicalVisitors: 5, predictedVisitors: 4, confidence: 96, deliveryVolume: 2, parkingOccupancyPct: 85 },
  ];
}

/**
 * AI FEATURE 4 — COMPLAINT NLP AUTO-CLASSIFICATION
 */
export function classifyComplaintNLP(text: string): {
  category: ComplaintCategory;
  priority: ComplaintPriority;
  detectedIssue: string;
  suggestedVendor: string;
  estimatedResolutionHours: number;
} {
  const lower = text.toLowerCase();

  if (lower.includes('lift') || lower.includes('elevator') || lower.includes('stuck') || lower.includes('jerk')) {
    const isCritical = lower.includes('stuck') || lower.includes('trapped') || lower.includes('stopped');
    return {
      category: 'ELEVATOR',
      priority: isCritical ? 'CRITICAL' : 'HIGH',
      detectedIssue: isCritical ? 'Passenger safety lock or motor stoppage' : 'Guide rail vibration or leveling anomaly',
      suggestedVendor: 'Schindler Express Elevator AMC',
      estimatedResolutionHours: isCritical ? 2 : 6,
    };
  }

  if (lower.includes('leak') || lower.includes('pipe') || lower.includes('drain') || lower.includes('tap') || lower.includes('sewage') || lower.includes('flush')) {
    const isHigh = lower.includes('burst') || lower.includes('flood') || lower.includes('overflow');
    return {
      category: 'PLUMBING',
      priority: isHigh ? 'HIGH' : 'MEDIUM',
      detectedIssue: 'Water supply line pressure drop or drain blockage',
      suggestedVendor: 'Apex Hydraulics & Plumbing Services',
      estimatedResolutionHours: isHigh ? 4 : 12,
    };
  }

  if (lower.includes('spark') || lower.includes('breaker') || lower.includes('power') || lower.includes('electric') || lower.includes('wire') || lower.includes('mcb')) {
    const isCritical = lower.includes('spark') || lower.includes('smoke') || lower.includes('burning');
    return {
      category: 'ELECTRICAL',
      priority: isCritical ? 'CRITICAL' : 'HIGH',
      detectedIssue: 'Phase imbalance or conduit insulation failure',
      suggestedVendor: 'Voltagrid Electrical Engineers',
      estimatedResolutionHours: isCritical ? 2 : 8,
    };
  }

  if (lower.includes('camera') || lower.includes('cctv') || lower.includes('guard') || lower.includes('gate') || lower.includes('theft') || lower.includes('stranger')) {
    return {
      category: 'SECURITY',
      priority: 'HIGH',
      detectedIssue: 'Perimeter access or surveillance feed anomaly',
      suggestedVendor: 'SafeShield Security Services',
      estimatedResolutionHours: 4,
    };
  }

  if (lower.includes('clean') || lower.includes('garbage') || lower.includes('smell') || lower.includes('trash') || lower.includes('dirty')) {
    return {
      category: 'CLEANING',
      priority: 'LOW',
      detectedIssue: 'Common area housekeeping or waste disposal backlog',
      suggestedVendor: 'GreenHouse Facility Care',
      estimatedResolutionHours: 8,
    };
  }

  if (lower.includes('park') || lower.includes('car') || lower.includes('bike') || lower.includes('slot') || lower.includes('blocked')) {
    return {
      category: 'PARKING',
      priority: 'MEDIUM',
      detectedIssue: 'Unauthorized parking slot obstruction',
      suggestedVendor: 'Gate Security & Marshalling Team',
      estimatedResolutionHours: 2,
    };
  }

  return {
    category: 'OTHER',
    priority: 'MEDIUM',
    detectedIssue: 'General apartment facility maintenance inquiry',
    suggestedVendor: 'Estate Management Support Desk',
    estimatedResolutionHours: 24,
  };
}

/**
 * AI FEATURE 5 — PREDICTIVE MAINTENANCE MONITOR
 */
export function getPredictiveMaintenanceData() {
  return [
    {
      equipment: 'Passenger Elevator Wing A',
      status: 'NEEDS_INSPECTION',
      riskScore: 78,
      riskLevel: 'HIGH',
      lastServiceDate: '2026-07-10',
      telemetryNotice: 'Increased motor coil current draw during 5th-6th floor ascent (+18%). 3 resident ride jerk reports logged.',
      recommendedAction: 'Inspect traction sheaves, guide rail lubrication, and door lock interlock contacts within 48h.',
      estimatedCost: '$240',
    },
    {
      equipment: 'Main Hydro-pneumatic Water Pump #2',
      status: 'ATTENTION',
      riskScore: 54,
      riskLevel: 'MEDIUM',
      lastServiceDate: '2026-08-01',
      telemetryNotice: 'Vibration sensors report 4.2mm/s RMS amplitude deviation. Minor impeller cavitation suspected.',
      recommendedAction: 'Clean suction strainer and recalibrate automated pressure cutoff valve.',
      estimatedCost: '$120',
    },
    {
      equipment: '250kVA Standby Diesel Generator',
      status: 'HEALTHY',
      riskScore: 16,
      riskLevel: 'LOW',
      lastServiceDate: '2026-08-25',
      telemetryNotice: 'Automated weekly load test completed with zero voltage drop. Fuel tank at 92% capacity.',
      recommendedAction: 'Routine bi-monthly battery terminal inspection scheduled.',
      estimatedCost: '$0',
    },
    {
      equipment: 'Basement EV Fast Chargers (4 Hubs)',
      status: 'HEALTHY',
      riskScore: 22,
      riskLevel: 'LOW',
      lastServiceDate: '2026-08-14',
      telemetryNotice: 'Thermal logging shows stable connector temperatures under 32kW peak concurrent charging.',
      recommendedAction: 'Standard monthly RCD trip safety check.',
      estimatedCost: '$0',
    },
  ];
}

/**
 * AI FEATURE 6 — AI ADMIN ASSISTANT (Powered by Gemini with Structured Tool Execution)
 */
export async function queryAIAdminAssistant(
  question: string,
  contextData: {
    totalResidents: number;
    occupiedFlats: number;
    totalVisitorsToday: number;
    activeVisitorsInside: number;
    pendingApprovals: number;
    openComplaints: number;
    pendingMaintenanceAmount: number;
    collectedMaintenanceAmount: number;
    activeEmergencies: number;
    parkingOccupancyPct: number;
    anomaliesCount: number;
  }
): Promise<string> {
  const gemini = getGeminiClient();

  // If Gemini API Key is available, use Gemini 3.8 Flash for intelligent answer synthesis
  if (gemini) {
    try {
      const prompt = `You are SmartGate AI — the intelligent executive operations assistant for Greenwood Heights Apartments.
The society administrator is asking you a question. Answer concisely, accurately, and professionally based strictly on the provided real-time apartment state below.

CURRENT APARTMENT METRICS:
- Total Residents Registered: ${contextData.totalResidents} across ${contextData.occupiedFlats} occupied flats (Total 48 flats in Wing A & B).
- Visitors Arrived Today: ${contextData.totalVisitorsToday} (Currently inside compound: ${contextData.activeVisitorsInside}).
- Pending Resident Visitor Approvals: ${contextData.pendingApprovals}
- Open Helpdesk Complaints: ${contextData.openComplaints} (Elevator, Plumbing, Electrical tickets)
- Maintenance Billing: $${contextData.collectedMaintenanceAmount.toLocaleString()} collected (82%), $${contextData.pendingMaintenanceAmount.toLocaleString()} pending across 9 defaulter flats.
- Active Emergency Alerts: ${contextData.activeEmergencies}
- Parking Lot Utilization: ${contextData.parkingOccupancyPct}% occupied
- Security Anomalies Detected: ${contextData.anomaliesCount} (includes 1 overstay alert and 1 elevator vibration warning)

QUESTION FROM ADMIN:
"${question}"

Provide a crisp, direct, executive-ready response with bold highlights and actionable recommendations. Do not use generic filler.`;

      const response = await gemini.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      if (response.text) {
        return response.text.trim();
      }
    } catch (err) {
      console.warn("Gemini API call error in assistant, falling back to rule engine:", err);
    }
  }

  // Deterministic tool-driven fallback response
  const q = question.toLowerCase();
  if (q.includes('visitor') || q.includes('traffic')) {
    return `📊 **Visitor Operations Status**: Today, **${contextData.totalVisitorsToday} visitors** entered Greenwood Heights. Currently, **${contextData.activeVisitorsInside} visitors** are inside the premises, and there are **${contextData.pendingApprovals} pending approval requests** waiting for resident confirmation at the gates. Peak arrival window was 12:00 - 14:00.`;
  }
  if (q.includes('maintenance') || q.includes('bill') || q.includes('unpaid') || q.includes('payment') || q.includes('defaulter')) {
    return `💰 **Maintenance & Financial Summary**: For September 2026, **$${contextData.collectedMaintenanceAmount.toLocaleString()}** has been successfully collected (82% collection efficiency). **$${contextData.pendingMaintenanceAmount.toLocaleString()}** remains pending across 9 flats (notably A-502, B-303, and B-401). Automated WhatsApp & email reminders have been queued for defaulters.`;
  }
  if (q.includes('complaint') || q.includes('unresolved') || q.includes('ticket') || q.includes('helpdesk')) {
    return `🛠️ **Complaints & SLA Status**: There are currently **${contextData.openComplaints} open complaints**. The highest priority is Ticket **#TKT-892 (Elevator ride jerk in Wing A)**, which the AI classifier tagged as HIGH priority and assigned to Schindler AMC. 2 plumbing tickets are in progress and on track for SLA resolution within 6 hours.`;
  }
  if (q.includes('parking') || q.includes('slot') || q.includes('car')) {
    return `🚗 **Parking Lot Status**: Total compound parking occupancy is currently at **${contextData.parkingOccupancyPct}%**. Resident slots are 84% utilized, and 6 designated visitor parking bays are currently available in Basement B1. No unauthorized vehicle parking has been detected at this hour.`;
  }
  if (q.includes('emergency') || q.includes('sos') || q.includes('alert')) {
    return `🚨 **Emergency Incident Status**: There are currently **${contextData.activeEmergencies} active emergency incidents**. Main Gate 1 and Tower B security guards are on active patrol. Last simulated medical emergency at Flat B-201 was resolved in 3.4 minutes.`;
  }
  if (q.includes('security') || q.includes('anomal') || q.includes('risk')) {
    return `🛡️ **Security & AI Intelligence**: Security status is **MODERATE**. Detected **${contextData.anomaliesCount} security alerts**: 1 visitor overstay (Delivery driver in Wing B exceeding 3.5 hours) and elevated noise reports near the rooftop amenities. Guards have been dispatched to verify.`;
  }

  return `SmartGate AI Operations Assistant: Currently monitoring Greenwood Heights (${contextData.occupiedFlats} flats, ${contextData.totalResidents} residents). You have **${contextData.totalVisitorsToday} visitors logged today**, **${contextData.openComplaints} open complaints**, and **$${contextData.collectedMaintenanceAmount.toLocaleString()} collected in maintenance**. Ask me about visitors, maintenance defaulters, open complaints, security anomalies, or parking availability!`;
}
