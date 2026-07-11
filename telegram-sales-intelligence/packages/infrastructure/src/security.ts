import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import type { PasswordHasher, TokenService } from '@tsi/application';

export class BcryptPasswordHasher implements PasswordHasher {
  verify(hash: string, password: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }
}

export class JwtTokenService implements TokenService {
  private readonly key: Uint8Array;

  constructor(
    secret: string,
    private readonly expiresIn = '8h',
  ) {
    this.key = new TextEncoder().encode(secret);
  }

  async sign(payload: Record<string, unknown>): Promise<string> {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.expiresIn)
      .sign(this.key);
  }

  async verify(token: string): Promise<Record<string, unknown>> {
    const { payload } = await jwtVerify(token, this.key);
    return payload;
  }
}

export class AesGcmEncryptionService {
  private readonly key: Buffer;

  constructor(hexKey: string) {
    this.key = Buffer.from(hexKey, 'hex');
    if (this.key.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes in hexadecimal');
  }

  encrypt(plainText: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
  }

  decrypt(payload: string): string {
    const [ivText, tagText, encryptedText] = payload.split('.');
    if (!ivText || !tagText || !encryptedText) throw new Error('Invalid encrypted payload');
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivText, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedText, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }
}

export function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}
