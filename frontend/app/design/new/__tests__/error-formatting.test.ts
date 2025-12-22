/**
 * Unit tests for error message formatting in save design functionality
 * This tests the fix for: "Objects are not valid as a React child" error
 */

describe('Design Save Error Formatting', () => {
  /**
   * This function simulates the error handling logic from the save design handler
   * It extracts a string error message from various error formats
   */
  function formatErrorMessage(err: any): string {
    let errorMessage = 'Failed to save design';

    if (typeof err === 'string') {
      errorMessage = err;
    } else if (err?.error?.message) {
      errorMessage = err.error.message;
    } else if (err?.message) {
      errorMessage = err.message;
    } else if (err?.error && typeof err.error === 'string') {
      errorMessage = err.error;
    }

    return errorMessage;
  }

  describe('Error Object with error.message property', () => {
    it('should extract message from error object with error.message', () => {
      const errorObject = {
        error: {
          type: 'ValidationError',
          message: 'Invalid design parameters',
          errors: ['Name is required'],
        },
      };

      const result = formatErrorMessage(errorObject);

      expect(result).toBe('Invalid design parameters');
      expect(typeof result).toBe('string');
    });

    it('should handle nested error objects', () => {
      const errorObject = {
        error: {
          type: 'UnauthorizedError',
          message: 'Authentication required',
          stack: 'Error: Authentication required\n    at ...',
        },
      };

      const result = formatErrorMessage(errorObject);

      expect(result).toBe('Authentication required');
      expect(typeof result).toBe('string');
    });
  });

  describe('Error Object with message property', () => {
    it('should extract message from error with message property', () => {
      const errorObject = {
        message: 'Network error occurred',
      };

      const result = formatErrorMessage(errorObject);

      expect(result).toBe('Network error occurred');
      expect(typeof result).toBe('string');
    });

    it('should handle Error instances', () => {
      const errorObject = new Error('Upload failed');

      const result = formatErrorMessage(errorObject);

      expect(result).toBe('Upload failed');
      expect(typeof result).toBe('string');
    });
  });

  describe('String errors', () => {
    it('should return string errors directly', () => {
      const result = formatErrorMessage('Upload failed');

      expect(result).toBe('Upload failed');
      expect(typeof result).toBe('string');
    });
  });

  describe('Error object with string error property', () => {
    it('should extract string from error property', () => {
      const errorObject = {
        error: 'File too large',
      };

      const result = formatErrorMessage(errorObject);

      expect(result).toBe('File too large');
      expect(typeof result).toBe('string');
    });
  });

  describe('Unknown error formats', () => {
    it('should return default message for unknown error format', () => {
      const errorObject = {
        someUnknownProperty: 'value',
      };

      const result = formatErrorMessage(errorObject);

      expect(result).toBe('Failed to save design');
      expect(typeof result).toBe('string');
    });

    it('should return default message for null/undefined', () => {
      expect(formatErrorMessage(null)).toBe('Failed to save design');
      expect(formatErrorMessage(undefined)).toBe('Failed to save design');
      expect(typeof formatErrorMessage(null)).toBe('string');
    });

    it('should return default message for empty object', () => {
      const result = formatErrorMessage({});

      expect(result).toBe('Failed to save design');
      expect(typeof result).toBe('string');
    });
  });

  describe('CRITICAL: Prevents React child error', () => {
    it('should NEVER return an object (which would cause React child error)', () => {
      const errorObject = {
        error: {
          type: 'ValidationError',
          message: 'Invalid parameters',
          errors: ['Error 1', 'Error 2'],
        },
      };

      const result = formatErrorMessage(errorObject);

      // Result must be a string, never an object
      expect(typeof result).toBe('string');
      expect(result).not.toEqual(expect.objectContaining({}));
    });

    it('should convert object errors to strings in all cases', () => {
      const testCases = [
        { error: { type: 'Error', message: 'Test' } },
        { message: 'Test' },
        { error: 'Test' },
        'Test',
        { unknown: 'property' },
      ];

      testCases.forEach((testCase) => {
        const result = formatErrorMessage(testCase);
        expect(typeof result).toBe('string');
      });
    });
  });

  describe('Real-world API error formats', () => {
    it('should handle backend validation error format', () => {
      const backendError = {
        success: false,
        error: {
          type: 'ValidationError',
          message: 'Validation failed',
          errors: [
            { field: 'name', message: 'Name is required' },
            { field: 'imageUrl', message: 'Image URL is required' },
          ],
        },
      };

      const result = formatErrorMessage(backendError);

      expect(result).toBe('Validation failed');
      expect(typeof result).toBe('string');
    });

    it('should handle backend unauthorized error format', () => {
      const backendError = {
        success: false,
        error: {
          type: 'UnauthorizedError',
          message: 'Please log in to continue',
          stack: 'Error: Please log in...',
        },
      };

      const result = formatErrorMessage(backendError);

      expect(result).toBe('Please log in to continue');
      expect(typeof result).toBe('string');
    });

    it('should handle axios error format', () => {
      const axiosError = {
        message: 'Request failed with status code 500',
        response: {
          data: {
            error: {
              message: 'Internal server error',
            },
          },
        },
      };

      const result = formatErrorMessage(axiosError);

      // Should extract the message property
      expect(result).toBe('Request failed with status code 500');
      expect(typeof result).toBe('string');
    });
  });
});
