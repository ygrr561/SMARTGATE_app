import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext.js';
import type { Visitor, EmergencyIncident, Delivery } from '../types/index.js';

interface WebSocketContextType {
  isConnected: boolean;
  incomingVisitorRequest: Visitor | null;
  setIncomingVisitorRequest: (v: Visitor | null) => void;
  activeSOSAlert: EmergencyIncident | null;
  setActiveSOSAlert: (e: EmergencyIncident | null) => void;
  playChime: (type: 'doorbell' | 'siren' | 'ping' | 'success') => void;
  latestEvent: { type: string; data: any; timestamp: string } | null;
  liveNotifications: Array<{ id: string; title: string; message: string; type: 'info' | 'warning' | 'danger' | 'success'; timestamp: string }>;
  dismissNotification: (id: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// Web Audio API Synthesizer for notifications
function playSynthesizedSound(type: 'doorbell' | 'siren' | 'ping' | 'success') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'doorbell') {
      // Classic Ding-Dong
      const now = ctx.currentTime;
      // High note
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now); // E5
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      // Low note
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(523.25, now + 0.4); // C5
      gain2.gain.setValueAtTime(0.3, now + 0.4);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.4);
      osc2.stop(now + 1.2);
    } else if (type === 'siren') {
      // Emergency Pulsing Alarm
      const now = ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        const start = now + i * 0.4;
        osc.frequency.setValueAtTime(800, start);
        osc.frequency.linearRampToValueAtTime(1100, start + 0.2);
        osc.frequency.linearRampToValueAtTime(800, start + 0.4);
        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.4);
      }
    } else if (type === 'success') {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      // Ping
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (err) {
    // Audio context may be restricted before user interaction
    console.debug('Audio synth notice:', err);
  }
}

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [incomingVisitorRequest, setIncomingVisitorRequest] = useState<Visitor | null>(null);
  const [activeSOSAlert, setActiveSOSAlert] = useState<EmergencyIncident | null>(null);
  const [latestEvent, setLatestEvent] = useState<{ type: string; data: any; timestamp: string } | null>(null);
  const [liveNotifications, setLiveNotifications] = useState<Array<{ id: string; title: string; message: string; type: 'info' | 'warning' | 'danger' | 'success'; timestamp: string }>>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const addNotification = (title: string, message: string, type: 'info' | 'warning' | 'danger' | 'success' = 'info') => {
    const item = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title,
      message,
      type,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setLiveNotifications(prev => [item, ...prev.slice(0, 9)]);
  };

  const dismissNotification = (id: string) => {
    setLiveNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          // Identify client session
          if (user) {
            ws.send(JSON.stringify({
              type: 'IDENTIFY',
              userId: user.id,
              role: user.role,
              flatNumber: user.flatNumber,
            }));
          }
        };

        ws.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            setLatestEvent({
              type: parsed.type,
              data: parsed.data,
              timestamp: parsed.timestamp || new Date().toISOString(),
            });

            // Handle specific business events
            if (parsed.type === 'VISITOR_APPROVAL_REQUEST') {
              const visitor: Visitor = parsed.data;
              // If user is resident and flat matches
              if (user?.role === 'RESIDENT' && visitor.flatNumber === user.flatNumber) {
                setIncomingVisitorRequest(visitor);
                playSynthesizedSound('doorbell');
                addNotification(
                  `Visitor at Gate: ${visitor.name}`,
                  `${visitor.name} (${visitor.purpose}) is at ${visitor.gateEntered || 'Main Gate'} requesting entry.`,
                  'warning'
                );
              }
            } else if (parsed.type === 'VISITOR_STATUS_UPDATE') {
              const visitor: Visitor = parsed.data;
              if (user?.role === 'GUARD') {
                playSynthesizedSound(visitor.status === 'APPROVED' ? 'success' : 'ping');
                addNotification(
                  `Visitor ${visitor.status}: ${visitor.name}`,
                  `Flat ${visitor.flatNumber} has ${visitor.status.toLowerCase()} entry for ${visitor.name}.`,
                  visitor.status === 'APPROVED' ? 'success' : 'danger'
                );
              }
            } else if (parsed.type === 'VISITOR_ENTRY_ALERT') {
              const visitor: Visitor = parsed.data;
              if (user?.role === 'RESIDENT' && user.flatNumber === visitor.flatNumber) {
                playSynthesizedSound('ping');
                addNotification(
                  `Visitor Inside Compound: ${visitor.name}`,
                  `${visitor.name} has passed through ${visitor.gateEntered || 'Gate'} towards your flat.`,
                  'info'
                );
              }
            } else if (parsed.type === 'EMERGENCY_SOS_ALERT') {
              const emg: EmergencyIncident = parsed.data;
              // Guards & Admins receive full siren
              if (user?.role === 'GUARD' || user?.role === 'ADMIN') {
                setActiveSOSAlert(emg);
                playSynthesizedSound('siren');
                addNotification(
                  `🚨 EMERGENCY SOS: Flat ${emg.flatNumber}`,
                  `${emg.type} Emergency reported by ${emg.residentName} (${emg.phone}). Immediate response required!`,
                  'danger'
                );
              }
            } else if (parsed.type === 'EMERGENCY_STATUS_UPDATE') {
              const emg: EmergencyIncident = parsed.data;
              if (emg.status === 'RESOLVED') {
                setActiveSOSAlert(null);
                addNotification(`Emergency Resolved: Flat ${emg.flatNumber}`, `Situation cleared. Notes: ${emg.resolutionNotes || 'Normal'}`, 'success');
              } else if (emg.status === 'ACKNOWLEDGED') {
                setActiveSOSAlert(emg);
                addNotification(`Emergency Acknowledged`, `Guard ${emg.assignedGuardName || 'Security'} is attending to Flat ${emg.flatNumber}.`, 'warning');
              }
            } else if (parsed.type === 'DELIVERY_NOTIFICATION') {
              const del: Delivery = parsed.data;
              if (user?.role === 'RESIDENT' && user.flatNumber === del.flatNumber) {
                playSynthesizedSound('doorbell');
                addNotification(
                  `Parcel Arrived: ${del.company}`,
                  `Package delivered to gate by ${del.deliveryPersonName}. Gate OTP: ${del.leaveAtGateOtp || 'N/A'}`,
                  'info'
                );
              }
            }
          } catch (e) {
            console.error('Error processing WS packet', e);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          // Reconnect attempt after 3s
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        };

        ws.onerror = (err) => {
          console.warn('WS error:', err);
          ws.close();
        };
      } catch (err) {
        console.warn('Could not connect WS, retrying...', err);
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    }

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [user]);

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        incomingVisitorRequest,
        setIncomingVisitorRequest,
        activeSOSAlert,
        setActiveSOSAlert,
        playChime: playSynthesizedSound,
        latestEvent,
        liveNotifications,
        dismissNotification,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error('useWebSocket must be used within a WebSocketProvider');
  return context;
};
