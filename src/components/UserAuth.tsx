import React, { useEffect, useRef, useState } from 'react';
import { Avatar, App as AntApp, Button, Divider, Popover, Spin, Grid } from 'antd';
import { LoadingOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
const { useBreakpoint } = Grid;
import {
  checkLogin,
  getUserInfo,
  logout,
  pollToken,
  startDesktopLoginProcess,
} from '../utils/auth';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../utils/i18n';

const TOKEN_STORAGE_KEY = 'login_token';

interface UserInfo {
  avatar: string;
  nickname: string;
}

const UserAuth: React.FC = () => {
  const { t } = useTranslation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_STORAGE_KEY));
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { message } = AntApp.useApp();
  const { setIsLoggedIn: setAuthIsLoggedIn } = useAuth();
  const pollRef = useRef<{ promise: Promise<string>; cancel: () => void } | null>(null);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        return;
      }

      try {
        const isValid = await checkLogin(token);
        if (isValid) {
          const user = await getUserInfo(token);
          setUserInfo(user);
          setIsLoggedIn(true);
          return;
        }
      } catch (error) {
        console.error('Token validation failed:', error);
      }

      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setToken(null);
      setUserInfo(null);
      setIsLoggedIn(false);
    };

    validateToken();
  }, [token]);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const { encodedNonce } = await startDesktopLoginProcess();
      pollRef.current = pollToken(encodedNonce);
      const newToken = await pollRef.current.promise;

      localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
      setToken(newToken);
      setAuthIsLoggedIn(true);
      message.success(t('auth.login_success'));
      setPopoverOpen(false);
    } catch (error: any) {
      message.error(error.message || t('auth.login_fail'));
    } finally {
      setIsLoading(false);
      pollRef.current = null;
    }
  };

  const handleCancelLogin = () => {
    if (pollRef.current) {
      pollRef.current.cancel();
    }
    setIsLoading(false);
    message.info(t('auth.login_cancelled'));
  };

  const handleLogout = async () => {
    if (!token) {
      return;
    }

    try {
      await logout(token);
    } catch (error) {
      console.error('Logout failed on server:', error);
    } finally {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setToken(null);
      setUserInfo(null);
      setIsLoggedIn(false);
      setAuthIsLoggedIn(false);
      setPopoverOpen(false);
      message.success(t('auth.logout_success'));
    }
  };

  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const loginContent = (
    <div style={{ width: isMobile ? 160 : 200, textAlign: 'center' }}>
      <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
      <p style={{ marginTop: 12, marginBottom: 12, fontSize: 12, color: '#666' }}>
        {t('auth.opening_browser')}
      </p>
      <Button type="link" danger onClick={handleCancelLogin} size="small">
        {t('auth.cancel_login')}
      </Button>
    </div>
  );

  const loggedInContent = (
    <div style={{ width: isMobile ? 160 : 200 }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <Avatar
          size={48}
          src={userInfo?.avatar}
          icon={!userInfo?.avatar ? <UserOutlined /> : undefined}
          style={{ marginBottom: 8 }}
        />
        <p style={{ margin: '8px 0 0 0', fontWeight: 500 }}>
          {userInfo?.nickname || t('auth.default_nickname')}
        </p>
      </div>
      <Divider style={{ margin: '12px 0' }} />
      <Button type="primary" danger block icon={<LogoutOutlined />} onClick={handleLogout} size={isMobile ? "small" : "middle"}>
        {t('auth.logout')}
      </Button>
    </div>
  );

  const notLoggedInContent = (
    <div style={{ width: isMobile ? 160 : 200 }}>
      <Button type="primary" block loading={isLoading} onClick={handleLogin} size={isMobile ? "small" : "middle"}>
        {isLoading ? t('auth.logging_in') : t('auth.click_login')}
      </Button>
    </div>
  );

  const content = isLoading ? loginContent : isLoggedIn ? loggedInContent : notLoggedInContent;

  return (
    <Popover
      content={content}
      trigger="click"
      placement="bottomRight"
      open={popoverOpen}
      onOpenChange={setPopoverOpen}
    >
      <Button type="text" style={{ color: '#333', display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 8, padding: isMobile ? '4px' : '4px 15px' }}>
        <Avatar
          size="small"
          src={userInfo?.avatar}
          icon={!userInfo?.avatar ? <UserOutlined /> : undefined}
        />
        {!isMobile && <span>{userInfo?.nickname || t('auth.login_register')}</span>}
      </Button>
    </Popover>
  );
};

export default UserAuth;
