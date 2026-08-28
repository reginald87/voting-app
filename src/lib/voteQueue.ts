let tail: Promise<unknown> = Promise.resolve();

// Serializes writes so SQLite's single-writer constraint never overflows the
// connector's operation timeout. Since SQLite can only commit one write
// transaction at a time, queuing removes the lock-contention timeouts (P1008)
// that otherwise appear when many voters submit votes concurrently.
export async function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = tail.then(fn, fn);
  tail = run.catch(() => {});
  return run;
}
