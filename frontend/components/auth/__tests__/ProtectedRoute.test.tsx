import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '../ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

// Mock the AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('ProtectedRoute', () => {
  const mockPush = jest.fn();
  const mockRouter = { push: mockPush };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('should show loading state while checking auth', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: true,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should redirect to login when user is not authenticated', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should render children when user is authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: '1', email: 'test@example.com', userType: 'CUSTOMER' },
      loading: false,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should redirect regular user to dashboard when admin is required', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: '1', email: 'test@example.com', userType: 'CUSTOMER' },
      loading: false,
    });

    render(
      <ProtectedRoute requireAdmin={true}>
        <div>Admin Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('should render children when admin user accesses admin route', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: '1', email: 'admin@example.com', userType: 'PRINTER_ADMIN' },
      loading: false,
    });

    render(
      <ProtectedRoute requireAdmin={true}>
        <div>Admin Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should allow admin to access non-admin routes', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: '1', email: 'admin@example.com', userType: 'PRINTER_ADMIN' },
      loading: false,
    });

    render(
      <ProtectedRoute requireAdmin={false}>
        <div>Regular Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Regular Content')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
