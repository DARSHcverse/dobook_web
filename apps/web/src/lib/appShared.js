import { cn } from '@/lib/utils';

// Small constants/helpers shared between App.js (dashboard) and the extracted
// landing page. Kept in their own module so the marketing routes can use them
// without importing the dashboard bundle.

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || '';
export const API = `${API_BASE}/api`;

export const DOBOOK_LOGO_PNG = '/brand/dobook-logo.png';
export const DOBOOK_LOGO_SVG = '/brand/dobook-logo.svg';

export const bookingStatusBadgeClass = (status) =>
  cn(
    "rounded-full px-3 py-1 text-xs font-medium capitalize",
    status === 'confirmed' && "border-green-200 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-400",
    status === 'cancelled' && "border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400",
    status === 'pending' && "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    status === 'completed' && "border-[#E1BEE7] bg-[#F3E5F5] text-[#6A1B9A] dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  );
