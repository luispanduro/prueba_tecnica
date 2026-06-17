import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { HomePage } from '../pages/HomePage';

describe('HomePage', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: 'tok', user: { id: 'u1', username: 'admin', roles: ['admin'] }, isAuthenticated: true, isLoading: false, error: null, sessionExpired: false });
  });

  it('should render dashboard text', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Dashboard')).toBeDefined();
  });

  it('should render welcome message', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/User Management System/i)).toBeDefined();
  });
});
