import Redis from 'ioredis';
import type { Logger } from 'pino';

// Why a dedicated subscriber Redis client?
// Redis pub/sub mode is exclusive — once a client subscribes,
// it can ONLY run subscribe/unsubscribe commands.
// Using the main Redis client would break all other operations.

export class SSEService {
  private subscriber: Redis;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor(
    private redis: Redis,
    private logger: Logger
  ) {
    // Duplicate creates a new connection with same config
    this.subscriber = redis.duplicate({
      lazyConnect: false,
    });

    this.subscriber.on('error', (err) => {
      this.logger.error({ err }, 'SSE Redis subscriber error');
    });

    // Handle all messages centrally
    this.subscriber.on('message', (channel, message) => {
      const channelListeners = this.listeners.get(channel);
      if (channelListeners && channelListeners.size > 0) {
        try {
          const data = JSON.parse(message);
          channelListeners.forEach(listener => listener(data));
        } catch (err) {
          this.logger.error({ err, channel }, 'Failed to parse SSE message');
        }
      }
    });
  }

  // Stream submission result to HTTP response via SSE
  async streamSubmissionResult(
    submissionId: string,
    onData: (data: any) => void,
    onEnd: () => void,
    timeoutMs = 60000
  ): Promise<() => void> {
    const channel = `submission:${submissionId}`;

    // Add this local listener to the Map
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
      await this.subscriber.subscribe(channel);
    }

    // Create the parsing wrapper specifically for this request
    const wrapper = (data: any) => {
      onData(data);
      const terminalStatuses = ['accepted', 'wrong_answer', 'runtime_error', 'time_limit_exceeded', 'compilation_error'];
      if (terminalStatuses.includes(data.status)) {
        cleanup();
        onEnd();
      }
    };

    this.listeners.get(channel)!.add(wrapper);

    // Auto-close after timeout (prevents hanging connections)
    const timer = setTimeout(() => {
      this.logger.warn({ submissionId }, 'SSE stream timed out');
      cleanup();
      onEnd();
    }, timeoutMs);

    // Cleanup function — call on disconnect or completion
    const cleanup = () => {
      clearTimeout(timer);
      const channelSet = this.listeners.get(channel);
      if (channelSet) {
        channelSet.delete(wrapper);
        if (channelSet.size === 0) {
          this.listeners.delete(channel);
          this.subscriber.unsubscribe(channel).catch(() => { });
        }
      }
    };

    return cleanup;
  }

  async close(): Promise<void> {
    await this.subscriber.quit();
  }
}