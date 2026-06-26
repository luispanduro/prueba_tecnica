import { PasswordHash } from './password-hash.vo';

jest.setTimeout(30000);

describe('PasswordHash VO', () => {
  it('verifica contraseña correcta', async () => {
    const hash = await PasswordHash.create('password123');
    expect(await hash.verify('password123')).toBe(true);
  });

  it('rechaza contraseña incorrecta', async () => {
    const hash = await PasswordHash.create('password123');
    expect(await hash.verify('wrongpassword')).toBe(false);
  });

  it('fromHash() reconstruye y verifica correctamente', async () => {
    const original = await PasswordHash.create('mypassword');
    const reconstructed = PasswordHash.fromHash(original.getValue());
    expect(await reconstructed.verify('mypassword')).toBe(true);
  });

  it('getValue() retorna el hash bcrypt', async () => {
    const hash = await PasswordHash.create('test');
    expect(hash.getValue()).toMatch(/^\$2[aby]\$\d+\$/);
  });
});
