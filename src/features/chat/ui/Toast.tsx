import React, { useState, useEffect } from 'react';

interface ToastProps {
  message: string;
  visible: boolean;
  onHide: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, visible, onHide }) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onHide();
      }, 3000); // Hide after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [visible, onHide]);

  if (!visible) return null;

  return (
    <div className="toast">
      {message}
    </div>
  );
};

// Toast hook for easy usage
// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false
  });

  const showToast = (message: string) => {
    setToast({ message, visible: true });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    const handleToastEvent = (event: CustomEvent) => {
      showToast(event.detail);
    };

    document.addEventListener('toast', handleToastEvent as EventListener);
    return () => {
      document.removeEventListener('toast', handleToastEvent as EventListener);
    };
  }, []);

  return {
    toast,
    showToast,
    hideToast
  };
};