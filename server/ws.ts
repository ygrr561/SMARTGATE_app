import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

export interface ClientConnection {
  ws: WebSocket;
  userId?: string;
  role?: string;
  flatNumber?: string;
}

let wss: WebSocketServer | null = null;
const clients = new Set<ClientConnection>();

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    const client: ClientConnection = { ws };
    clients.add(client);

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'IDENTIFY') {
          client.userId = data.userId;
          client.role = data.role;
          client.flatNumber = data.flatNumber;
          // Acknowledge identification
          ws.send(JSON.stringify({
            type: 'CONNECTED',
            message: `Identified as ${client.role} (${client.flatNumber || 'General'})`,
            timestamp: new Date().toISOString(),
          }));
        }
      } catch (e) {
        console.error('Failed to parse incoming WS message', e);
      }
    });

    ws.on('close', () => {
      clients.delete(client);
    });

    ws.on('error', (err) => {
      console.warn('WS Client error:', err);
      clients.delete(client);
    });

    // Send initial greeting
    ws.send(JSON.stringify({
      type: 'INIT',
      message: 'Connected to SmartGate Real-Time Event Bus',
      connectedClientsCount: clients.size,
      timestamp: new Date().toISOString(),
    }));
  });

  return wss;
}

export function broadcastEvent(event: {
  type: string;
  payload: any;
  targetFlat?: string;
  targetRoles?: string[];
}) {
  if (!wss) return;

  const payloadString = JSON.stringify({
    type: event.type,
    data: event.payload,
    targetFlat: event.targetFlat,
    timestamp: new Date().toISOString(),
  });

  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      // Role filtering if specified
      if (event.targetRoles && client.role && !event.targetRoles.includes(client.role)) {
        continue;
      }
      // Flat filtering if specified (or admins/guards get it)
      if (event.targetFlat && client.role === 'RESIDENT' && client.flatNumber !== event.targetFlat) {
        continue;
      }
      client.ws.send(payloadString);
    }
  }
}
