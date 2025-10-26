import React from 'react';

interface ReminderBannerProps {
  message: string;
  onDismiss: () => void;
}

const ReminderBanner: React.FC<ReminderBannerProps> = ({ message, onDismiss }) => {
  return (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md shadow-sm mb-4 flex justify-between items-center" role="alert">
      <div className="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="font-medium">{message}</p>
      </div>
      <button onClick={onDismiss} className="text-yellow-700 hover:text-yellow-900 font-bold text-xl" aria-label="Dismiss">
        &times;
      </button>
    </div>
  );
};

export default ReminderBanner;
