import React from 'react';
import { Settings } from 'lucide-react';

interface SettingsButtonProps {
  onClick: () => void;
  className?: string;
}

export const SettingsButton: React.FC<SettingsButtonProps> = ({
  onClick,
  className = ''
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        fixed top-4 right-4
        p-3
        bg-white
        rounded-full
        shadow-lg
        hover:shadow-xl
        transition-shadow
        z-50
        focus:outline-none
        focus:ring-2
        focus:ring-blue-500
        focus:ring-offset-2
        ${className}
      `}
      aria-label="API Settings"
      title="Configure API Keys"
    >
      <Settings className="w-6 h-6 text-gray-600" />
    </button>
  );
};