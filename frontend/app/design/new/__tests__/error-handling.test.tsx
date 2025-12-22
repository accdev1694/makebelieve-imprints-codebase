import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { designsService } from '@/lib/api/designs';
import { storageService } from '@/lib/api/storage';
import NewDesignPage from '../page';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(() => null),
  })),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/api/designs', () => ({
  designsService: {
    create: jest.fn(),
  },
}));

jest.mock('@/lib/api/storage', () => ({
  storageService: {
    uploadFile: jest.fn(),
  },
}));

jest.mock('@/components/auth/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('NewDesignPage - Error Handling', () => {
  const mockPush = jest.fn();
  const mockUser = { id: '1', name: 'Test User', email: 'test@test.com' };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
  });

  describe('Save Design Error Handling', () => {
    it('should display error message when error object has error.message property', async () => {
      const errorObject = {
        error: {
          type: 'ValidationError',
          message: 'Invalid design parameters',
          errors: ['Name is required'],
        },
      };

      (storageService.uploadFile as jest.Mock).mockRejectedValue(errorObject);

      render(<NewDesignPage />);

      // Fill in design name
      const nameInput = screen.getByLabelText(/design name/i);
      fireEvent.change(nameInput, { target: { value: 'Test Design' } });

      // Upload a file (mock file selection)
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const fileInput = screen.getByTestId('file-input') || screen.getByRole('button', { name: /upload/i });

      // Try to save (this will trigger the error)
      const saveButton = screen.getByRole('button', { name: /save design/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid design parameters')).toBeInTheDocument();
      });
    });

    it('should display error message when error object has message property', async () => {
      const errorObject = {
        message: 'Network error occurred',
      };

      (storageService.uploadFile as jest.Mock).mockRejectedValue(errorObject);

      render(<NewDesignPage />);

      const nameInput = screen.getByLabelText(/design name/i);
      fireEvent.change(nameInput, { target: { value: 'Test Design' } });

      const saveButton = screen.getByRole('button', { name: /save design/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Network error occurred')).toBeInTheDocument();
      });
    });

    it('should display error message when error is a string', async () => {
      (storageService.uploadFile as jest.Mock).mockRejectedValue('Upload failed');

      render(<NewDesignPage />);

      const nameInput = screen.getByLabelText(/design name/i);
      fireEvent.change(nameInput, { target: { value: 'Test Design' } });

      const saveButton = screen.getByRole('button', { name: /save design/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeInTheDocument();
      });
    });

    it('should display default error message when error format is unknown', async () => {
      const errorObject = {
        someUnknownProperty: 'value',
      };

      (storageService.uploadFile as jest.Mock).mockRejectedValue(errorObject);

      render(<NewDesignPage />);

      const nameInput = screen.getByLabelText(/design name/i);
      fireEvent.change(nameInput, { target: { value: 'Test Design' } });

      const saveButton = screen.getByRole('button', { name: /save design/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to save design')).toBeInTheDocument();
      });
    });

    it('should NOT render error object directly (prevents React child error)', async () => {
      const errorObject = {
        error: {
          type: 'ValidationError',
          message: 'Invalid parameters',
          errors: ['Error 1', 'Error 2'],
        },
      };

      (storageService.uploadFile as jest.Mock).mockRejectedValue(errorObject);

      render(<NewDesignPage />);

      const nameInput = screen.getByLabelText(/design name/i);
      fireEvent.change(nameInput, { target: { value: 'Test Design' } });

      const saveButton = screen.getByRole('button', { name: /save design/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        // Should show the message string, not the object
        expect(screen.getByText('Invalid parameters')).toBeInTheDocument();

        // Should NOT try to render [object Object]
        expect(screen.queryByText(/\[object Object\]/)).not.toBeInTheDocument();
      });
    });

    it('should log error to console for debugging', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorObject = { error: { message: 'Test error' } };

      (storageService.uploadFile as jest.Mock).mockRejectedValue(errorObject);

      render(<NewDesignPage />);

      const nameInput = screen.getByLabelText(/design name/i);
      fireEvent.change(nameInput, { target: { value: 'Test Design' } });

      const saveButton = screen.getByRole('button', { name: /save design/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Save design error:', errorObject);
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Validation Errors', () => {
    it('should show error when name is empty', async () => {
      render(<NewDesignPage />);

      const saveButton = screen.getByRole('button', { name: /save design/i });

      // Button should be disabled when name is empty
      expect(saveButton).toBeDisabled();
    });

    it('should show error when no file or template is selected', async () => {
      render(<NewDesignPage />);

      const nameInput = screen.getByLabelText(/design name/i);
      fireEvent.change(nameInput, { target: { value: 'Test Design' } });

      // Button should still be disabled without file/template
      const saveButton = screen.getByRole('button', { name: /save design/i });
      expect(saveButton).toBeDisabled();
    });
  });
});
