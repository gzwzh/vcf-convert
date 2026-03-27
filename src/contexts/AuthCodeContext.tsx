import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { checkNeedAuthCode } from '../utils/authCode';
import AuthCodeModal from '../components/AuthCodeModal';

interface AuthCodeContextType {
  checkAuthAndExecute: (callback: () => void | Promise<void>) => Promise<void>;
}

type PendingAuthRequest = {
  callback: () => void | Promise<void>;
  resolve: () => void;
  reject: (error?: Error) => void;
};

const AuthCodeContext = createContext<AuthCodeContextType | undefined>(undefined);

export const AuthCodeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [authCodeUrl, setAuthCodeUrl] = useState<string | undefined>();
  const [pendingRequest, setPendingRequest] = useState<PendingAuthRequest | null>(null);

  const checkAuthAndExecute = useCallback(async (callback: () => void | Promise<void>) => {
    if (!window.electronAPI) {
      await callback();
      return;
    }

    await new Promise<void>(async (resolve, reject) => {
      try {
        const result = await checkNeedAuthCode();
        if (result.needAuth) {
          setAuthCodeUrl(result.authCodeUrl);
          setPendingRequest({ callback, resolve, reject });
          setModalOpen(true);
          return;
        }

        await callback();
        resolve();
      } catch (error) {
        console.error('检查授权状态失败:', error);
        setPendingRequest({ callback, resolve, reject });
        setModalOpen(true);
      }
    });
  }, []);

  const handleClose = () => {
    setModalOpen(false);
    pendingRequest?.reject(new Error('AUTH_CANCELLED'));
    setPendingRequest(null);
  };

  const handleSuccess = async () => {
    setModalOpen(false);
    const currentRequest = pendingRequest;
    setPendingRequest(null);

    if (!currentRequest) return;

    try {
      await currentRequest.callback();
      currentRequest.resolve();
    } catch (error) {
      currentRequest.reject(error instanceof Error ? error : new Error('AUTH_CALLBACK_FAILED'));
      throw error;
    }
  };

  return (
    <AuthCodeContext.Provider value={{ checkAuthAndExecute }}>
      {children}
      <AuthCodeModal
        open={modalOpen}
        authCodeUrl={authCodeUrl}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    </AuthCodeContext.Provider>
  );
};

export const useAuthCode = () => {
  const context = useContext(AuthCodeContext);
  if (!context) {
    throw new Error('useAuthCode must be used within an AuthCodeProvider');
  }
  return context;
};
