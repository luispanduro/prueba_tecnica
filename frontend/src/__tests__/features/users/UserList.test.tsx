import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import UserList from '../../../features/users/components/UserList';
import authReducer from '../../../features/auth/authSlice';
import { usersApi, useGetUsersQuery, useDeleteUserMutation } from '../../../features/users/usersApi';
import { rolesApi } from '../../../features/roles/rolesApi';

jest.mock('../../../features/users/usersApi', () => ({
  ...jest.requireActual('../../../features/users/usersApi'),
  useGetUsersQuery: jest.fn(),
  useDeleteUserMutation: jest.fn(),
}));

const fakeUser = {
  id: '1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  status: 'active' as const,
  roles: ['ADMIN'],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const successQueryResult = {
  data: { data: [fakeUser], total: 1, page: 1, limit: 10 },
  isLoading: false,
  isError: false,
  error: undefined,
};

const deleteMock = jest.fn();

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

beforeEach(() => {
  deleteMock.mockReset();
  deleteMock.mockReturnValue({ unwrap: jest.fn().mockResolvedValue({}) });
  (useDeleteUserMutation as jest.Mock).mockReturnValue([deleteMock]);
});

describe('UserList', () => {
  it('shows LoadingSpinner on initial render', () => {
    (useGetUsersQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: undefined,
    });
    renderUserList();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows ErrorMessage on API error', async () => {
    (useGetUsersQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { data: { message: 'Internal Server Error' }, status: 500 },
    });
    renderUserList();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('shows user rows when data loads', async () => {
    (useGetUsersQuery as jest.Mock).mockReturnValue(successQueryResult);
    renderUserList();
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('shows ConfirmDialog when Eliminar button is clicked', async () => {
    (useGetUsersQuery as jest.Mock).mockReturnValue(successQueryResult);
    const user = userEvent.setup();
    renderUserList();
    await waitFor(() => screen.getByText('John Doe'));
    await user.click(screen.getByRole('button', { name: /eliminar/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
