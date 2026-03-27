import React from 'react';
import { App as AntApp, Button, Modal } from 'antd';
import { LoginOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { pollToken, startDesktopLoginProcess } from '../utils/auth';
import { useTranslation } from '../utils/i18n';

const LoginRequiredModal: React.FC = () => {
  const { showLoginModal, setShowLoginModal } = useAuth();
  const { message } = AntApp.useApp();
  const { t } = useTranslation();

  const handleClose = () => {
    setShowLoginModal(false);
  };

  const handleLogin = async () => {
    try {
      const { encodedNonce } = await startDesktopLoginProcess();
      const pollResult = pollToken(encodedNonce);
      const newToken = await pollResult.promise;

      localStorage.setItem('login_token', newToken);
      message.success(t('auth.login_success'));
      setShowLoginModal(false);
      window.location.reload();
    } catch (error: any) {
      message.error(error.message || t('auth.login_fail'));
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LoginOutlined style={{ fontSize: 20 }} />
          <span>{t('auth.login_required_title')}</span>
        </div>
      }
      open={showLoginModal}
      onCancel={handleClose}
      footer={null}
      width={500}
      centered
      closable
      styles={{ body: { padding: '32px' } }}
    >
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 16, color: '#333', marginBottom: 24, lineHeight: 1.6 }}>
          {t('auth.login_required_desc')}
        </p>

        <div
          style={{
            backgroundColor: '#f5f5f5',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: 24,
            textAlign: 'left',
          }}
        >
          <p style={{ fontSize: 14, color: '#666', margin: 0, lineHeight: 1.6 }}>
            {t('auth.login_required_tip')}
          </p>
        </div>

        <Button
          type="primary"
          size="large"
          block
          icon={<LoginOutlined />}
          onClick={handleLogin}
          style={{
            height: 48,
            fontSize: 16,
            fontWeight: 500,
            backgroundColor: '#000',
            borderColor: '#000',
          }}
        >
          {t('auth.login_now')}
        </Button>

        <p style={{ fontSize: 12, color: '#999', marginTop: 16 }}>{t('auth.login_required_footer')}</p>
      </div>
    </Modal>
  );
};

export default LoginRequiredModal;
