import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, App, Tooltip } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined, CopyOutlined } from '@ant-design/icons';
import { verifyAuthCode, getDeviceId, copyDeviceIdToClipboard } from '../utils/authCode';
import { openExternalUrl } from '../utils/platform';
import kunqiongLogo from '/kunqiong-logo.ico';
import { useTranslation } from '../utils/i18n';
import './AuthCodeModal.css';

interface AuthCodeModalProps {
  open: boolean;
  authCodeUrl?: string;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

const AuthCodeModal: React.FC<AuthCodeModalProps> = ({
  open,
  authCodeUrl,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [authCode, setAuthCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [deviceId, setDeviceId] = useState<string>('');

  useEffect(() => {
    if (open) {
      getDeviceId().then(setDeviceId).catch(console.error);
    }
  }, [open]);

  const handleVerify = async () => {
    if (!authCode.trim()) {
      message.warning(t('auth_code.enter_code'));
      return;
    }

    setVerifying(true);
    try {
      const isValid = await verifyAuthCode(authCode.trim().toUpperCase());
      if (isValid) {
        message.success(t('auth_code.success'));
        setAuthCode('');
        await onSuccess();
      } else {
        message.error(t('auth_code.invalid'));
      }
    } catch {
      message.error(t('auth_code.fail'));
    } finally {
      setVerifying(false);
    }
  };

  const handleGetAuthCode = async () => {
    try {
      const url = authCodeUrl || 'https://auth-code.kunqiongai.com/web/auth/index';
      await openExternalUrl(url);
    } catch {
      message.error(t('auth_code.fail'));
    }
  };

  const handleCopyDeviceId = async () => {
    const success = await copyDeviceIdToClipboard();
    if (success) {
      message.success(t('auth_code.copy_success'));
    } else {
      message.error(t('auth_code.copy_fail'));
    }
  };

  const handleClose = () => {
    if (verifying) return;
    setAuthCode('');
    onClose();
  };

  if (!window.electronAPI) return null;

  const formatDeviceId = (id: string) => {
    if (id.length <= 20) return id;
    return `${id.slice(0, 8)}...${id.slice(-8)}`;
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      closable={!verifying}
      centered
      width={480}
      className="auth-code-modal"
      maskClosable={false}
      keyboard={!verifying}
      title={
        <div className="auth-code-modal-title">
          <img src={kunqiongLogo} alt={t('app.kunqiong')} className="auth-code-modal-icon" />
          <span>{t('auth_code.title')}</span>
        </div>
      }
    >
      <div className="auth-code-modal-content">
        <p className="auth-code-modal-desc">
          {t('auth_code.desc')}
        </p>

        {deviceId && (
          <div className="auth-code-device-id">
            <span className="auth-code-device-id-label">{t('auth_code.device_id')}</span>
            <Tooltip title={deviceId}>
              <span className="auth-code-device-id-value">{formatDeviceId(deviceId)}</span>
            </Tooltip>
            <Tooltip title={t('auth_code.copy_device_id')}>
              <CopyOutlined
                className="auth-code-device-id-copy"
                onClick={handleCopyDeviceId}
              />
            </Tooltip>
          </div>
        )}

        <div className="auth-code-input-wrapper">
          <Input
            placeholder={t('auth_code.enter_code')}
            value={authCode}
            onChange={(e) => setAuthCode(e.target.value.toUpperCase())}
            type={showCode ? 'text' : 'password'}
            onPressEnter={() => void handleVerify()}
            maxLength={20}
            disabled={verifying}
            suffix={(
              <span
                className="auth-code-eye-icon"
                onClick={() => setShowCode(!showCode)}
              >
                {showCode ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              </span>
            )}
          />
        </div>

        <Button
          type="primary"
          block
          size="large"
          onClick={() => void handleVerify()}
          loading={verifying}
          className="auth-code-verify-btn"
        >
          {t('auth_code.verify')}
        </Button>

        <div className="auth-code-get-link">
          <span onClick={() => void handleGetAuthCode()}>{t('auth_code.no_code')}</span>
        </div>
      </div>
    </Modal>
  );
};

export default AuthCodeModal;
