export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: any;
}

class Logger {
  private bufferSize: number = 100;
  private ringBuffer: LogEntry[] = [];

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private sanitize(data: any): any {
    if (!data) return data;
    try {
      // Deep clone and mask sensitive keys
      const str = JSON.stringify(data, (key, value) => {
        if (/password|token|secret|authorization|pin/i.test(key)) {
          return '***REDACTED***';
        }
        return value;
      });
      return JSON.parse(str);
    } catch {
      return '[Unserializable]';
    }
  }

  private log(level: LogLevel, context: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      context,
      message,
      data: this.sanitize(data),
    };

    // Add to in-memory circular buffer
    this.ringBuffer.push(entry);
    if (this.ringBuffer.length > this.bufferSize) {
      this.ringBuffer.shift();
    }

    // Console output with distinctive formatting
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${context}]:`;
    switch (level) {
      case 'debug':
        if (typeof window !== 'undefined' && (window as any).__DEV__) {
          console.debug(prefix, message, data || '');
        }
        break;
      case 'info':
        console.info(prefix, message, data || '');
        break;
      case 'warn':
        console.warn(prefix, message, data || '');
        break;
      case 'error':
        console.error(prefix, message, data || '');
        break;
    }
  }

  debug(context: string, message: string, data?: any) {
    this.log('debug', context, message, data);
  }

  info(context: string, message: string, data?: any) {
    this.log('info', context, message, data);
  }

  warn(context: string, message: string, data?: any) {
    this.log('warn', context, message, data);
  }

  error(context: string, message: string, data?: any) {
    this.log('error', context, message, data);
  }

  /**
   * Returns recent log entries for diagnostics and troubleshooting.
   */
  getRecentLogs(): LogEntry[] {
    return [...this.ringBuffer];
  }

  /**
   * Export logs as formatted JSON string
   */
  exportLogsAsJson(): string {
    return JSON.stringify(this.ringBuffer, null, 2);
  }

  clear() {
    this.ringBuffer = [];
  }
}

export const logger = new Logger();
