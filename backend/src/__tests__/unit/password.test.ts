/**
 * Password Utility Unit Tests
 * Tests for password hashing and verification
 */

import { hashPassword, verifyPassword } from '../../utils/password';

describe('Password Utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const password = 'SecurePassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
      expect(hash).toMatch(/^\$2[aby]\$/); // bcrypt hash format
    });

    it('should generate different hashes for same password', async () => {
      const password = 'SamePassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2); // Different salts
      expect(hash1).toBeDefined();
      expect(hash2).toBeDefined();
    });

    it('should hash empty string', async () => {
      const hash = await hashPassword('');
      expect(hash).toBeDefined();
      expect(hash).toMatch(/^\$2[aby]\$/);
    });

    it('should hash long password', async () => {
      const longPassword = 'A'.repeat(100);
      const hash = await hashPassword(longPassword);
      expect(hash).toBeDefined();
      expect(hash).toMatch(/^\$2[aby]\$/);
    });

    it('should hash password with special characters', async () => {
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const hash = await hashPassword(specialPassword);
      expect(hash).toBeDefined();
      expect(hash).toMatch(/^\$2[aby]\$/);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'CorrectPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'CorrectPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    it('should reject password with different case', async () => {
      const password = 'Password123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('password123!', hash); // Different case

      expect(isValid).toBe(false);
    });

    it('should reject empty password when hash is not empty', async () => {
      const password = 'Password123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('', hash);

      expect(isValid).toBe(false);
    });

    it('should handle invalid hash format', async () => {
      const password = 'Password123!';
      const invalidHash = 'not-a-valid-hash';
      const isValid = await verifyPassword(password, invalidHash);

      expect(isValid).toBe(false);
    });

    it('should verify password with special characters', async () => {
      const password = '!@#$%^&*()Test123';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should verify long password', async () => {
      const longPassword = 'A'.repeat(72); // bcrypt max length
      const hash = await hashPassword(longPassword);
      const isValid = await verifyPassword(longPassword, hash);

      expect(isValid).toBe(true);
    });
  });

  describe('Integration: Hash and Verify', () => {
    it('should complete full cycle of hash and verify', async () => {
      const passwords = [
        'Simple123!',
        'Complex!@#$%Password123',
        'With Spaces 123!',
        'Unicode_密码_123!',
      ];

      for (const password of passwords) {
        const hash = await hashPassword(password);
        const isValid = await verifyPassword(password, hash);
        expect(isValid).toBe(true);
      }
    });

    it('should handle concurrent hash operations', async () => {
      const passwords = Array.from({ length: 5 }, (_, i) => `Password${i}!`);
      const hashPromises = passwords.map((pwd) => hashPassword(pwd));
      const hashes = await Promise.all(hashPromises);

      // All hashes should be different
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(passwords.length);

      // All should verify correctly
      for (let i = 0; i < passwords.length; i++) {
        const isValid = await verifyPassword(passwords[i], hashes[i]);
        expect(isValid).toBe(true);
      }
    });
  });
});
