
/**
 * Utility functions for password hashing and verification
 */

/**
 * Hashes a password string using Web Crypto API
 * @param password The plain text password to hash
 * @returns A hex string of the hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  // Convert the password string to a Uint8Array
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  
  // Create a digest of the data
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert the hash to a hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Verifies if a plain text password matches a hash
 * @param password The plain text password to check
 * @param hash The hash to compare against
 * @returns Boolean indicating if the password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}
