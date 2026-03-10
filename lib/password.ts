import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, storedHash);
  } catch {
    return false;
  }
}
