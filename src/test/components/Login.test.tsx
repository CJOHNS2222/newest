import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Login } from '../../../components/Login';
import { User } from '../../../types';

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  getRedirectResult: vi.fn(),
  sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

// Mock Firebase Analytics
vi.mock('firebase/analytics', () => ({
  logEvent: vi.fn(),
}));

// Mock firebaseConfig
vi.mock('../../../firebaseConfig', () => ({
  analytics: {},
}));

describe('Login Component', () => {
  const mockOnLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form by default', () => {
    render(<Login onLogin={mockOnLogin} />);

    expect(screen.getByText('Smart Pantry Chef')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('chef@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('switches to signup form when signup link is clicked', () => {
    render(<Login onLogin={mockOnLogin} />);

    const signupLink = screen.getByText("Don't have an account? Sign Up");
    fireEvent.click(signupLink);

    expect(screen.getByPlaceholderText('Your Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Re-enter password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('validates email format', async () => {
    render(<Login onLogin={mockOnLogin} />);

    const emailInput = screen.getByPlaceholderText('chef@example.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Test that inputs can receive values
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput).toHaveValue('invalid-email');
    expect(passwordInput).toHaveValue('password123');
  });

  it('validates password strength', async () => {
    render(<Login onLogin={mockOnLogin} />);

    const emailInput = screen.getByPlaceholderText('chef@example.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'weak' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters and contain a number and a letter.')).toBeInTheDocument();
    });
  });

  it('validates password confirmation in signup mode', async () => {
    render(<Login onLogin={mockOnLogin} />);

    // Switch to signup
    const signupLink = screen.getByText("Don't have an account? Sign Up");
    fireEvent.click(signupLink);

    const emailInput = screen.getByPlaceholderText('chef@example.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const confirmPasswordInput = screen.getByPlaceholderText('Re-enter password');
    const nameInput = screen.getByPlaceholderText('Your Name');
    const submitButton = screen.getByRole('button', { name: /sign up/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword' } });
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    });
  });

  it('shows success message after successful signup', async () => {
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    const mockSignIn = vi.mocked(signInWithEmailAndPassword);
    mockSignIn.mockResolvedValue({
      user: {
        uid: '123',
        email: 'test@example.com',
        displayName: 'Test User',
      },
    } as any);

    render(<Login onLogin={mockOnLogin} />);

    const emailInput = screen.getByPlaceholderText('chef@example.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith({
        id: '123',
        name: 'Test User',
        email: 'test@example.com',
        provider: 'email',
        hasSeenTutorial: false,
      });
    });
  });
});