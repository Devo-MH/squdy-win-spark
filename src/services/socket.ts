import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 2;
  private reconnectDelay = 2000;

  constructor() {
    // Disable socket connection for simple backend development
    // Socket.io is not available in the simple backend
    console.log('Socket service initialized (disabled for simple backend)');
  }

  connect() {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
    
    this.socket = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.reconnectAttempts = 0;
      // Don't show toast for initial connection to avoid spam
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      // Don't show toast for disconnection to avoid spam
    });

    this.socket.on('connect_error', (error) => {
      console.warn('Socket connection error (backend may not be running):', error.message);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.warn('Max socket reconnection attempts reached, continuing without real-time updates');
      }
    });

    this.socket.on('reconnect', () => {
      console.log('Reconnected to server');
      // Don't show toast for reconnection to avoid spam
    });
  }

  // Campaign events
  onCampaignCreated(callback: (data: any) => void) {
    this.socket?.on('campaign:created', callback);
  }

  onUserStaked(callback: (data: any) => void) {
    this.socket?.on('campaign:user-staked', callback);
  }

  onWinnersSelected(callback: (data: any) => void) {
    this.socket?.on('campaign:winners-selected', callback);
  }

  onTokensBurned(callback: (data: any) => void) {
    this.socket?.on('campaign:tokens-burned', callback);
  }

  // Join/leave campaign rooms
  joinCampaignRoom(campaignId: string | number) {
    this.socket?.emit('join-campaign', campaignId.toString());
  }

  leaveCampaignRoom(campaignId: string | number) {
    this.socket?.emit('leave-campaign', campaignId.toString());
  }

  // Remove specific event listener
  off(event: string, callback?: (data: any) => void) {
    this.socket?.off(event, callback);
  }

  // Remove all listeners for an event
  offAll(event: string) {
    this.socket?.removeAllListeners(event);
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Check connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Get socket instance (use with caution)
  getSocket(): Socket | null {
    return this.socket;
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;

// Hook for socket service
export const useSocket = () => {
  return socketService;
};