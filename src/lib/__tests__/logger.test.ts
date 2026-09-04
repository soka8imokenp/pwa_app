import { describe, it, expect, beforeEach } from 'vitest';
import { logger } from '../logger';

describe('Logger', () => {
  beforeEach(() => {
    logger.clear();
  });

  it('records log entries in ring buffer', () => {
    logger.info('TestContext', 'User performed an action');
    const logs = logger.getRecentLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].context).toBe('TestContext');
    expect(logs[0].level).toBe('info');
    expect(logs[0].message).toBe('User performed an action');
  });

  it('redacts sensitive fields like passwords, tokens, and PINs', () => {
    logger.warn('AuthContext', 'Login payload audit', {
      email: 'user@example.com',
      password: 'superSecretPassword123!',
      token: 'jwt.bearer.token',
      pin: '1234',
      otherField: 'safeValue',
    });

    const logs = logger.getRecentLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].data.password).toBe('***REDACTED***');
    expect(logs[0].data.token).toBe('***REDACTED***');
    expect(logs[0].data.pin).toBe('***REDACTED***');
    expect(logs[0].data.otherField).toBe('safeValue');
  });

  it('maintains maximum buffer size without unbounded memory growth', () => {
    for (let i = 0; i < 120; i++) {
      logger.debug('PerfTest', `Log message ${i}`);
    }
    const logs = logger.getRecentLogs();
    expect(logs.length).toBe(100);
    expect(logs[logs.length - 1].message).toBe('Log message 119');
  });
});
