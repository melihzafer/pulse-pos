/**
 * Generate a UUID v4
 * @returns A new UUID string
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Validate if a string is a valid UUID
 * @param id - The string to validate
 * @returns True if valid UUID
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}
