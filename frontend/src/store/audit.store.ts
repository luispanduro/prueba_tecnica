import { create } from 'zustand';
import { AuditEvent } from '../types/audit.types';
import { auditService } from '../services/audit.service';

interface AuditStore {
  events: AuditEvent[];
  isLoading: boolean;
  error: string | null;
  fetchEvents: () => Promise<void>;
  clearError: () => void;
}

export const useAuditStore = create<AuditStore>((set) => ({
  events: [],
  isLoading: false,
  error: null,

  fetchEvents: async () => {
    set({ isLoading: true, error: null });
    try {
      const events = await auditService.getEvents();
      set({ events, isLoading: false });
    } catch (err: unknown) {
      const axErr = err as { response?: { status?: number; data?: { message?: string } } };
      const status = axErr.response?.status;
      let msg = axErr.response?.data?.message || 'Failed to fetch audit events';
      if (status === 403) msg = 'Insufficient permissions to view audit events';
      if (status === 503) msg = 'Audit service unavailable';
      set({ error: msg, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
