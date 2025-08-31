// Utility functions to ensure data is always an array
export function ensureArray<T>(data: any): T[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (data === null || data === undefined) {
    return [];
  }
  return [];
}

export function safeMap<T, R>(data: any, mapFn: (item: T, index: number) => R): R[] {
  const array = ensureArray<T>(data);
  return array.map(mapFn);
}
