import { Email } from './email.vo';
import { InvalidEmailException } from '../exceptions/invalid-email.exception';

describe('Email VO', () => {
  describe('create()', () => {
    it('crea instancia con email válido', () => {
      const email = Email.create('test@example.com');
      expect(email.getValue()).toBe('test@example.com');
    });

    it('normaliza a lowercase y elimina espacios', () => {
      const email = Email.create('  Test@EXAMPLE.COM  ');
      expect(email.getValue()).toBe('test@example.com');
    });

    it('lanza InvalidEmailException con email sin @', () => {
      expect(() => Email.create('invalid')).toThrow(InvalidEmailException);
    });

    it('lanza InvalidEmailException con string vacío', () => {
      expect(() => Email.create('')).toThrow(InvalidEmailException);
    });

    it('lanza InvalidEmailException sin dominio', () => {
      expect(() => Email.create('user@')).toThrow(InvalidEmailException);
    });

    it('lanza InvalidEmailException con espacios dentro del email', () => {
      expect(() => Email.create('user @example.com')).toThrow(InvalidEmailException);
    });
  });

  describe('equals()', () => {
    it('retorna true para emails iguales', () => {
      const a = Email.create('test@example.com');
      const b = Email.create('TEST@EXAMPLE.COM');
      expect(a.equals(b)).toBe(true);
    });

    it('retorna false para emails distintos', () => {
      const a = Email.create('a@example.com');
      const b = Email.create('b@example.com');
      expect(a.equals(b)).toBe(false);
    });
  });
});
