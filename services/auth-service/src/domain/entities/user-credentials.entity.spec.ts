import { UserCredentials } from './user-credentials.entity';
import { Email } from '../value-objects/email.vo';
import { PasswordHash } from '../value-objects/password-hash.vo';

jest.setTimeout(30000);

const buildCredentials = async (isActive = true): Promise<UserCredentials> => {
  const email = Email.create('test@example.com');
  const passwordHash = await PasswordHash.create('Password1');
  const creds = UserCredentials.create('user-id-123', email, passwordHash);
  if (!isActive) creds.deactivate();
  return creds;
};

describe('UserCredentials', () => {
  describe('create()', () => {
    it('crea con isActive=true por defecto', async () => {
      const creds = await buildCredentials();
      expect(creds.isActive).toBe(true);
    });

    it('asigna el id y email correctamente', async () => {
      const creds = await buildCredentials();
      expect(creds.id).toBe('user-id-123');
      expect(creds.email.getValue()).toBe('test@example.com');
    });
  });

  describe('verifyPassword()', () => {
    it('retorna true con contraseña correcta', async () => {
      const creds = await buildCredentials();
      expect(await creds.verifyPassword('Password1')).toBe(true);
    });

    it('retorna false con contraseña incorrecta', async () => {
      const creds = await buildCredentials();
      expect(await creds.verifyPassword('WrongPass')).toBe(false);
    });
  });

  describe('deactivate()', () => {
    it('establece isActive=false', async () => {
      const creds = await buildCredentials();
      creds.deactivate();
      expect(creds.isActive).toBe(false);
    });
  });

  describe('reactivate()', () => {
    it('establece isActive=true tras desactivar', async () => {
      const creds = await buildCredentials(false);
      creds.reactivate();
      expect(creds.isActive).toBe(true);
    });
  });

  describe('reconstitute()', () => {
    it('reconstruye con todos los campos', () => {
      const email = Email.create('user@test.com');
      const hash = PasswordHash.fromHash('$2b$12$fakehash');
      const now = new Date();
      const creds = UserCredentials.reconstitute('abc', email, hash, false, now, now);
      expect(creds.id).toBe('abc');
      expect(creds.isActive).toBe(false);
    });
  });
});
