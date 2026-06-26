import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { http, HttpResponse } from 'msw';
import UserList from '../../../features/users/components/UserList';
import authReducer from '../../../features/auth/authSlice';
import { usersApi } from '../../../features/users/usersApi';
import { rolesApi } from '../../../features/roles/rolesApi';
import { server } from '../../mocks/server';

function makeStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      [usersApi.reducerPath]: usersApi.reducer,
      [rolesApi.reducerPath]: rolesApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(usersApi.middleware, rolesApi.middleware),
  });
}

function renderUserList() {
  return render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <UserList />
      </MemoryRouter>
    </Provider>,
  );
}

describe('UserList', () => {
  it('shows LoadingSpinner on initial render', () => {
    renderUserList();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows ErrorMessage on API error', async () => {
    server.use(
      http.get('/api/users', () =>
        HttpResponse.json({ message: 'Internal Server Error' }, { status: 500 }),
      ),
    );
    renderUserList();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('shows user rows when data loads', async () => {
    renderUserList();
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('shows ConfirmDialog when Eliminar button is clicked', async () => {
    const user = userEvent.setup();
    renderUserList();
    await waitFor(() => screen.getByText('John Doe'));
    await user.click(screen.getByRole('button', { name: /eliminar/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
