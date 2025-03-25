export const generateId = (length = 8) => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  return Array.from(randomValues, (num) => chars[num % chars.length]).join('');
};

export const safeJsonParse = (jsonString: string) => {
  try {
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}

export const serialize = <T>(data: T): string | null => {
  try {
    return JSON.stringify(data);
  } catch {
    return null;
  }
}

export const deserialize = <T>(data: string): T | string => {
  const deserialized = safeJsonParse(data);
  if (!data) {
    return data;
  }
  return deserialized;
}
