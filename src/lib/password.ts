import bcrypt from "bcryptjs";

export function hashSecret(secret: string): string {
  return bcrypt.hashSync(secret, 10);
}

export function verifySecret(secret: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(secret, hash);
  } catch {
    return false;
  }
}
