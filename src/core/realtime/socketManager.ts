import { io, type Socket } from "socket.io-client";
import { create } from "zustand";
import { getConfig } from "@/config";
import { createLogger } from "@/core/logging/logger";

const log = createLogger("socket");

export type SocketStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

interface SocketState {
  status: SocketStatus;
  lastError: string | null;
}

export const useSocketStore = create<SocketState>()(() => ({ status: "idle", lastError: null }));
export const useSocketStatus = () => useSocketStore((s) => s.status);

type Handler = (...args: unknown[]) => void;

/**
 * The single agent-manager socket.io connection (unified-agent socketService.connectToSocket).
 * Auth carries the full agent JSON plus FCM keys, exactly as agent-manager expects.
 * Feature code subscribes through `on()` (returns an unsubscribe) and sends with `emit()`.
 */
class SocketManager {
  private socket: Socket | null = null;
  private handlers = new Map<string, Set<Handler>>();

  connect(
    agent: { username: string } & Record<string, unknown>,
    fcm: { desktopFcmKey: string | null; mobileFcmKey: string | null },
  ) {
    this.disconnect();
    const { SOCKET_URL, SOCKET_TIMEOUT } = getConfig();
    const url = new URL(SOCKET_URL, globalThis.location.href);
    const path = url.pathname === "/" ? "" : `${url.pathname.replace(/\/$/, "")}/socket.io`;

    useSocketStore.setState({ status: "connecting", lastError: null });
    const socket = io(url.origin, {
      path,
      auth: { agent: JSON.stringify(agent), fcm },
      query: { username: agent.username },
      timeout: SOCKET_TIMEOUT,
    });
    this.socket = socket;

    socket.on("connect", () => {
      log.info("connected");
      useSocketStore.setState({ status: "connected", lastError: null });
    });
    socket.on("connect_error", (err: Error & { data?: unknown }) => {
      log.warn("connect_error", err.message);
      useSocketStore.setState({ status: "error", lastError: err.message });
    });
    socket.on("disconnect", (reason) => {
      log.warn("disconnect", reason);
      useSocketStore.setState({ status: "disconnected" });
    });

    // Re-attach feature handlers registered before (or between) connections.
    for (const [event, set] of this.handlers) for (const h of set) socket.on(event, h);
  }

  disconnect() {
    if (!this.socket) return;
    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
    useSocketStore.setState({ status: "idle" });
  }

  get connected() {
    return Boolean(this.socket?.connected);
  }

  /** Subscribe to a server event; survives reconnects. Returns an unsubscribe function. */
  on<T extends unknown[]>(event: string, handler: (...args: T) => void): () => void {
    const h = handler as Handler;
    let set = this.handlers.get(event);
    if (!set) this.handlers.set(event, (set = new Set()));
    set.add(h);
    this.socket?.on(event, h);
    return () => {
      set.delete(h);
      this.socket?.off(event, h);
    };
  }

  emit(event: string, payload: unknown): boolean {
    if (!this.socket) {
      log.warn(`emit '${event}' dropped: no socket`);
      return false;
    }
    log.debug(`emit ${event}`, payload);
    this.socket.emit(event, payload);
    return true;
  }
}

export const socketManager = new SocketManager();
