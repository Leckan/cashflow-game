export function createKeyedLock() {
  const chains = new Map<string, Promise<unknown>>();
  return async function locked<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = chains.get(key) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => gate);
    chains.set(key, tail);
    await previous;
    try {
      return await task();
    } finally {
      release();
    }
  };
}
