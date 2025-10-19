import React from 'react';
import { Notification, NotificationType } from '../../contexts/NotificationContext';

const ICONS: Record<NotificationType, React.ReactNode> = {
  success: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  error: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  info: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const TYPE_CLASSES: Record<NotificationType, { bg: string, text: string, border: string }> = {
  success: {
    bg: 'bg-success/20',
    text: 'text-success',
    border: 'border-success/30'
  },
  error: {
    bg: 'bg-danger/20',
    text: 'text-danger',
    border: 'border-danger/30'
  },
  info: {
    bg: 'bg-accent-primary',
    text: 'text-background-primary',
    border: 'border-accent-primary/30'
  }
};

const NotificationItem: React.FC<{ notification: Notification; onDismiss: (id: number) => void; }> = ({ notification, onDismiss }) => {
  const { bg, text, border } = TYPE_CLASSES[notification.type];
  const isInfo = notification.type === 'info';

  return (
    <div className={`w-full max-w-sm rounded-lg shadow-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden border ${border} ${bg} backdrop-blur-md animate-fade-in-down`}>
      <div className="p-4">
        <div className="flex items-start">
          <div className={`flex-shrink-0 ${text}`}>
            {ICONS[notification.type]}
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className={`text-sm font-medium ${isInfo ? text : 'text-text-primary'}`}>{notification.message}</p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={() => onDismiss(notification.id)}
              className={`inline-flex rounded-md ${isInfo ? 'text-background-primary/70 hover:text-background-primary' : 'text-text-secondary hover:text-text-primary'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-secondary`}
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


const NotificationContainer: React.FC<{ notifications: Notification[]; onDismiss: (id: number) => void; }> = ({ notifications, onDismiss }) => {
  return (
    <div className="fixed inset-0 flex flex-col items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-end z-50 space-y-4">
      {notifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

export default NotificationContainer;
