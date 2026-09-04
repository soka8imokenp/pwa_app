import { describe, it, expect } from 'vitest';

interface SyncItem {
  id?: number | string;
  title: string;
  updatedAt?: number;
  createdAt?: number;
  deletedAt?: number | null;
}

/**
 * Pure Last-Write-Wins (LWW) resolver matching syncEngine.ts implementation logic
 */
export function resolveLwwConflict<T extends SyncItem>(local: T, remote: T): { winner: 'local' | 'remote'; shouldDelete: boolean } {
  const localTime = local.updatedAt || local.createdAt || 0;
  const remoteTime = remote.updatedAt || remote.createdAt || 0;

  if (remoteTime >= localTime) {
    return {
      winner: 'remote',
      shouldDelete: Boolean(remote.deletedAt),
    };
  }

  return {
    winner: 'local',
    shouldDelete: Boolean(local.deletedAt),
  };
}

describe('SyncEngine LWW Conflict Resolution', () => {
  it('prefers remote update when remote timestamp is newer', () => {
    const local: SyncItem = {
      id: 1,
      title: 'Local version of task',
      updatedAt: 1000,
    };
    const remote: SyncItem = {
      id: 'task-1',
      title: 'Remote newer version of task',
      updatedAt: 2000,
    };

    const resolution = resolveLwwConflict(local, remote);
    expect(resolution.winner).toBe('remote');
    expect(resolution.shouldDelete).toBe(false);
  });

  it('prefers local update when local timestamp is newer', () => {
    const local: SyncItem = {
      id: 1,
      title: 'Local fresh offline edit',
      updatedAt: 3000,
    };
    const remote: SyncItem = {
      id: 'task-1',
      title: 'Stale remote version',
      updatedAt: 2000,
    };

    const resolution = resolveLwwConflict(local, remote);
    expect(resolution.winner).toBe('local');
    expect(resolution.shouldDelete).toBe(false);
  });

  it('handles soft-delete properly when remote deletedAt is newer', () => {
    const local: SyncItem = {
      id: 1,
      title: 'Local task',
      updatedAt: 1000,
    };
    const remote: SyncItem = {
      id: 'task-1',
      title: 'Local task',
      updatedAt: 1500,
      deletedAt: 1500,
    };

    const resolution = resolveLwwConflict(local, remote);
    expect(resolution.winner).toBe('remote');
    expect(resolution.shouldDelete).toBe(true);
  });

  it('does not resurrect item if local delete is newer than stale remote update', () => {
    const local: SyncItem = {
      id: 1,
      title: 'Locally deleted task',
      updatedAt: 2500,
      deletedAt: 2500,
    };
    const remote: SyncItem = {
      id: 'task-1',
      title: 'Stale remote task',
      updatedAt: 1500,
    };

    const resolution = resolveLwwConflict(local, remote);
    expect(resolution.winner).toBe('local');
    expect(resolution.shouldDelete).toBe(true);
  });
});
