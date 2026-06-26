import * as bcrypt from 'bcrypt';

const BCRYPT_COST = 12;

export class PasswordHash {
  private readonly hash: string;

  private constructor(hash: string) {
    this.hash = hash;
  }

  static async create(plainText: string): Promise<PasswordHash> {
    const hash = await bcrypt.hash(plainText, BCRYPT_COST);
    return new PasswordHash(hash);
  }

  static fromHash(hash: string): PasswordHash {
    return new PasswordHash(hash);
  }

  async verify(plainText: string): Promise<boolean> {
    return bcrypt.compare(plainText, this.hash);
  }

  getValue(): string {
    return this.hash;
  }
}
