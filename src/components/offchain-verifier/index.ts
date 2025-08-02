// Main exports for the offchain-verifier component

// Components
export { TaskChecklist } from './components/TaskChecklist';
export * from './components/tasks';

// Types
export * from './types';

// Constants
export * from './constants/taskTypes';

// Utilities
export { TaskVerificationAPI, MockTaskVerificationAPI, createTaskAPI } from './utils/api';
export * from './utils/qrCode';

// Default theme configuration
export const defaultTheme = {
  colors: {
    primary: '#3b82f6',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    pending: '#6b7280'
  },
  spacing: {
    cardPadding: '1rem',
    taskGap: '1rem'
  }
};