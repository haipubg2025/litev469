import React from 'react';
import { ExternalToast } from 'sonner';
import { useStore } from '../store/useStore';

const logToast = (message: string | React.ReactNode, data?: ExternalToast) => {
    let textMessage = "";
    if (typeof message === 'string') {
        textMessage = message;
    } else {
        textMessage = "Thông báo mới";
    }
    
    if (data && data.description && typeof data.description === 'string') {
        textMessage += `\n> ${data.description}`;
    }
    
    useStore.getState().setSystemLogs({
      message: `[Thông báo] ${textMessage}`,
      type: 'notification'
    });
};

export const toast = Object.assign((message: string | React.ReactNode, data?: ExternalToast) => {
  logToast(message, data);
  // Disabled floating toast per user request
  return message as string; 
}, {
  success: (message: string | React.ReactNode, data?: ExternalToast) => {
    logToast(message, data);
    return message as string;
  },
  error: (message: string | React.ReactNode, data?: ExternalToast) => {
    logToast(message, data);
    return message as string;
  },
  warning: (message: string | React.ReactNode, data?: ExternalToast) => {
    logToast(message, data);
    return message as string;
  },
  info: (message: string | React.ReactNode, data?: ExternalToast) => {
    logToast(message, data);
    return message as string;
  },
  promise: <T>(promise: Promise<T>, data?: any) => {
    return promise;
  },
  custom: () => '',
  dismiss: () => '',
});
