import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../../pages/LoginPage';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('LoginPage', () => {
  it('renders login form', () => {
    renderWithRouter(<LoginPage onLogin={vi.fn()} />);
    expect(screen.getByPlaceholderText(/name@example/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('calls onLogin on form submission', async () => {
    const onLogin = vi.fn();
    renderWithRouter(<LoginPage onLogin={onLogin} />);

    const emailInput = screen.getByPlaceholderText(/name@example/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const submitBtn = screen.getByRole('button', { name: /sign in/i });

    await userEvent.type(emailInput, 'test@test.com');
    await userEvent.type(passwordInput, 'password123');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith('test@test.com', 'password123');
    });
  });

  it('shows error message when onLogin throws', async () => {
    const onLogin = vi.fn().mockRejectedValue(new Error('Invalid credentials'));
    renderWithRouter(<LoginPage onLogin={onLogin} />);

    await userEvent.type(screen.getByPlaceholderText(/name@example/i), 'test@test.com');
    await userEvent.type(screen.getByPlaceholderText(/enter your password/i), 'wrong');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('disables button while loading', async () => {
    const onLogin = vi.fn().mockImplementation(() => new Promise(() => {}));
    renderWithRouter(<LoginPage onLogin={onLogin} />);

    await userEvent.type(screen.getByPlaceholderText(/name@example/i), 'test@test.com');
    await userEvent.type(screen.getByPlaceholderText(/enter your password/i), 'pass');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
    });
  });

  it('does not have create account link', () => {
    renderWithRouter(<LoginPage onLogin={vi.fn()} />);
    expect(screen.queryByText(/create account/i)).not.toBeInTheDocument();
  });
});
