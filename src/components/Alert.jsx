// src/components/Alert.jsx
import React from 'react';

const Alert = ({ alerts, onRemove }) => {
  const alertStyles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error:   'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info:    'bg-blue-50 border-blue-200 text-blue-800'
  };

  const iconStyles = {
    success: 'text-green-400',
    error:   'text-red-400',
    warning: 'text-yellow-400',
    info:    'text-blue-400'
  };

  const icons = {
    success: '✓',
    error:   '⚠',
    warning: '⚠',
    info:    'ⓘ'
  };

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`mb-4 p-4 border rounded-lg transition-all duration-300 ${alertStyles[alert.type]}`}
        >
          <div className="flex items-center">
            <span className={`mr-3 text-lg ${iconStyles[alert.type]}`}>
              {icons[alert.type]}
            </span>
            <span className="flex-1">{alert.message}</span>
            <button
              onClick={() => onRemove(alert.id)}
              className="ml-4 text-gray-400 hover:text-gray-600 text-lg"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Alert;
