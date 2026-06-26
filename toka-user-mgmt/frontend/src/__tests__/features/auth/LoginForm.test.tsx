import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import LoginForm from '../../../features/auth/components/LoginForm';
import authReducer from '../../../features/auth/authSlice';
import { authApi } from '../../../features/auth/authApi';

function makeStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      [authApi.reducerPath]: authApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(authApi.middleware),
  });
}

function renderLoginForm() {
  return render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    </Provider>,
  );
}

describe('LoginForm', () => {
  it('renders without crashes', () => {
    renderLoginForm();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
  });

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup();
    renderLoginForm();
    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/contraseña/i), 'pass');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    await waitFor(() => {
      expect(screen.getByText(/email inválido/i)).toBeInTheDocument();
    });
  });

  it('shows error when password field is empty', async () => {
    const user = userEvent.setup();
    renderLoginForm();
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    await waitFor(() => {
      expect(screen.getByText(/requerida/i)).toBeInTheDocument();
    });
  });

  it('submits without validation errors when fields are valid', async () => {
    const user = userEvent.setup();
    renderLoginForm();
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'password123');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    await waitFor(() => {
      expect(screen.queryByText(/email inválido/i)).not.toBeInTheDocument();
    });
  });
});
