import toast from 'react-hot-toast';

export const useToast = () => ({
  success: (msg: string) => toast.success(msg),
  error: (msg: string) => toast.error(msg),
});
