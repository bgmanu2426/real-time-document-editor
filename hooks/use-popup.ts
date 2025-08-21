'use client';

import { useState, useCallback } from 'react';

interface PopupConfig {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
}

interface PopupState extends PopupConfig {
  isOpen: boolean;
}

export const usePopup = () => {
  const [popup, setPopup] = useState<PopupState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    actions: []
  });

  const showPopup = useCallback((config: PopupConfig) => {
    setPopup({
      ...config,
      isOpen: true,
      actions: config.actions || [{ label: 'OK', onClick: () => {}, variant: 'primary' }]
    });
  }, []);

  const hidePopup = useCallback(() => {
    setPopup(prev => ({ ...prev, isOpen: false }));
  }, []);

  const showAlert = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const titles = {
      info: 'Information',
      success: 'Success',
      warning: 'Warning',
      error: 'Error'
    };

    showPopup({
      title: titles[type],
      message,
      type,
      actions: [{ label: 'OK', onClick: hidePopup, variant: 'primary' }]
    });
  }, [showPopup, hidePopup]);

  const showConfirm = useCallback((
    message: string,
    onConfirm: () => void,
    options: {
      title?: string;
      confirmLabel?: string;
      cancelLabel?: string;
      type?: 'warning' | 'error' | 'info';
    } = {}
  ) => {
    const {
      title = 'Confirm Action',
      confirmLabel = 'Confirm',
      cancelLabel = 'Cancel',
      type = 'warning'
    } = options;

    showPopup({
      title,
      message,
      type,
      actions: [
        { label: cancelLabel, onClick: hidePopup, variant: 'secondary' },
        { 
          label: confirmLabel, 
          onClick: () => {
            onConfirm();
            hidePopup();
          }, 
          variant: type === 'error' ? 'danger' : 'primary' 
        }
      ]
    });
  }, [showPopup, hidePopup]);

  return {
    popup,
    showPopup,
    hidePopup,
    showAlert,
    showConfirm
  };
};