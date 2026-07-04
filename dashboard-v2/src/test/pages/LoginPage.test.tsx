import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '../../pages/LoginPage';

describe('LoginPage', () => {
  it('renders login form', () => {
    render(<LoginPage onLogin={jest.fn()} />);
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('calls onLogin on form submission', async () => {
    const onLogin = jest.fn();
    render(<LoginPage onLogin={onLogin} />);

    const emailInput = screen.getByPlaceholderText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const submitBtn = screen.getByRole('button', { name: /sign in/i });

    await userEvent.type(emailInput, 'test@test.com');
    await userEvent.type(passwordInput, 'password123');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith('test@test.com', 'password123');
    });
  });

  it('shows error message when onLogin throws', async () => {
    const onLogin = jest.fn().mockRejectedValue(new Error('Invalid credentials'));
    render(<LoginPage onLogin={onLogin} />);

    await userEvent.type(screen.getByPlaceholderText(/email/i), 'test@test.com');
    await userEvent.type(screen.getByPlaceholderText(/password/i), 'wrong');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('disables button while loading', async () => {
    const onLogin = jest.fn().mockImplementation(() => new Promise(() => {}));
    render(<LoginPage onLogin={onLogin} />);

    await userEvent.type(screen.getByPlaceholderText(/email/i), 'test@test.com');
    await userEvent.type(screen.getByPlaceholderText(/password/i), 'pass');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
    });
  });

  it('does not have create account link', () => {
    render(<LoginPage onLogin={jest.fn()} />);
    expect(screen.queryByText(/create account/i)).not.toBeInTheDocument();
  });
});
