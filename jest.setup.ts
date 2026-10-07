// expo-sqlite is native. The stores only need a synchronous key-value store, so
// tests get an in-memory one.
jest.mock('expo-sqlite/kv-store', () => {
  const data = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItemSync: (key: string) => data.get(key) ?? null,
      setItemSync: (key: string, value: string) => void data.set(key, value),
      removeItemSync: (key: string) => void data.delete(key),
      clear: () => data.clear(),
    },
  };
});
