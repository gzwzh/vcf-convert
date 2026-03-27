import React, { Component, ReactNode, useEffect, useState } from 'react';
import { App as AntApp, Button, ConfigProvider, Drawer, Grid, Layout, Menu, Modal, Select, theme, message } from 'antd';
import {
  ContactsOutlined,
  CloseOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  GlobalOutlined,
  BorderOutlined,
  MailOutlined,
  MinusOutlined,
  MenuOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  BlockOutlined,
} from '@ant-design/icons';
import zhCN from 'antd/es/locale/zh_CN';
import enUS from 'antd/es/locale/en_US';
import jaJP from 'antd/es/locale/ja_JP';
import koKR from 'antd/es/locale/ko_KR';
import frFR from 'antd/es/locale/fr_FR';
import deDE from 'antd/es/locale/de_DE';
import itIT from 'antd/es/locale/it_IT';
import esES from 'antd/es/locale/es_ES';
import ptBR from 'antd/es/locale/pt_BR';
import ruRU from 'antd/es/locale/ru_RU';
import trTR from 'antd/es/locale/tr_TR';
import plPL from 'antd/es/locale/pl_PL';
import thTH from 'antd/es/locale/th_TH';
import viVN from 'antd/es/locale/vi_VN';
import idID from 'antd/es/locale/id_ID';
import msMY from 'antd/es/locale/ms_MY';
import nlNL from 'antd/es/locale/nl_NL';
import arEG from 'antd/es/locale/ar_EG';
import hiIN from 'antd/es/locale/hi_IN';
import zhTW from 'antd/es/locale/zh_TW';
import bnBD from 'antd/es/locale/bn_BD';
import faIR from 'antd/es/locale/fa_IR';
import heIL from 'antd/es/locale/he_IL';
import taIN from 'antd/es/locale/ta_IN';
import ukUA from 'antd/es/locale/uk_UA';
import urPK from 'antd/es/locale/ur_PK';

import ExcelToVcf from './components/ExcelToVcf';
import TxtToVcf from './components/TxtToVcf';
import VcfToExcel from './components/VcfToExcel';
import UserAuth from './components/UserAuth';
import LoginRequiredModal from './components/LoginRequiredModal';
import CarouselAdvertisement from './components/CarouselAdvertisement';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthCodeProvider } from './contexts/AuthCodeContext';
import { useTranslation, Lang } from './utils/i18n';
import { getCustomUrl, getFeedbackUrl } from './utils/auth';
import vcfLogo from '/vcf-logo.ico';
import kunqiongLogo from '/kunqiong-logo.ico';
import './App.css';

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

type MenuKey = 'excel-to-vcf' | 'txt-to-vcf' | 'vcf-to-excel';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, background: '#fff', color: '#b42318' }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error?.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const getAntLocale = (lang: Lang) => {
  switch (lang) {
    case 'zh': return zhCN;
    case 'zh_TW': return zhTW;
    case 'en': return enUS;
    case 'ja': return jaJP;
    case 'ko': return koKR;
    case 'fr': return frFR;
    case 'de': return deDE;
    case 'it': return itIT;
    case 'es': return esES;
    case 'pt_BR': return ptBR;
    case 'ru': return ruRU;
    case 'tr': return trTR;
    case 'pl': return plPL;
    case 'th': return thTH;
    case 'vi': return viVN;
    case 'id': return idID;
    case 'ms': return msMY;
    case 'nl': return nlNL;
    case 'ar': return arEG;
    case 'hi': return hiIN;
    case 'bn': return bnBD;
    case 'fa': return faIR;
    case 'he': return heIL;
    case 'ta': return taIN;
    case 'uk': return ukUA;
    case 'ur': return urPK;
    case 'sw':
    case 'tl':
    case 'pt':
    default: return enUS;
  }
};

const App: React.FC = () => (
  <AuthProvider>
    <AuthCodeProvider>
      <AppContent />
    </AuthCodeProvider>
  </AuthProvider>
);

const AppContent: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isLoggedIn, setShowLoginModal } = useAuth();
  const [selectedKey, setSelectedKey] = useState<MenuKey>('excel-to-vcf');
  const [version, setVersion] = useState('1.0.0');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isWindowMaximized, setIsWindowMaximized] = useState(false);
  const screens = useBreakpoint();
  const isMobile = !screens.lg;
  const isDesktopApp = !!window.electronAPI;
  const baseUrl = 'https://www.kunqiongai.com';

  useEffect(() => {
    const initApp = async () => {
      if (!window.electronAPI) return;
      try {
        const v = await window.electronAPI.getAppVersion();
        setVersion(v);
        const maximized = await window.electronAPI.isWindowMaximized();
        setIsWindowMaximized(maximized);
        setTimeout(() => {
          void checkUpdate();
        }, 1500);
      } catch (error) {
        console.error(t('app.update.check_fail'), error);
      }
    };
    void initApp();
  }, []);

  useEffect(() => {
    if (isDesktopApp) return;

    const langMap: Record<string, string> = {
      zh: 'zh-CN',
      zh_TW: 'zh-TW',
      en: 'en',
      ja: 'ja',
      ko: 'ko',
      fr: 'fr',
      de: 'de',
      es: 'es',
      it: 'it',
      pt: 'pt',
      pt_BR: 'pt-BR',
      ru: 'ru',
      ar: 'ar',
      vi: 'vi',
      th: 'th',
      id: 'id',
      pl: 'pl',
      tr: 'tr',
      nl: 'nl',
      hi: 'hi',
    };

    const seoByTab: Record<MenuKey, { title: string; description: string }> = {
      'excel-to-vcf': {
        title: `${t('app.menu.excel_to_vcf')} | ${t('app.title')}`,
        description: `${t('app.menu.excel_to_vcf')}闂?{t('app.subtitle')}`,
      },
      'txt-to-vcf': {
        title: `${t('app.menu.txt_to_vcf')} | ${t('app.title')}`,
        description: `${t('app.menu.txt_to_vcf')}闂?{t('app.subtitle')}`,
      },
      'vcf-to-excel': {
        title: `${t('app.menu.vcf_to_excel')} | ${t('app.title')}`,
        description: `${t('app.menu.vcf_to_excel')}闂?{t('app.subtitle')}`,
      },
    };

    const title = seoByTab[selectedKey].title;
    const description = seoByTab[selectedKey].description;
    const currentUrl = new URL(window.location.href);
    if (i18n.language === 'zh') {
      currentUrl.searchParams.delete('lang');
    } else {
      currentUrl.searchParams.set('lang', i18n.language);
    }
    const currentHref = currentUrl.toString();

    document.title = title;
    document.documentElement.lang = langMap[i18n.language] ?? 'en';

    const descriptionMeta =
      document.querySelector('meta[name="description"]') ||
      document.head.appendChild(Object.assign(document.createElement('meta'), { name: 'description' }));
    descriptionMeta.setAttribute('content', description);

    const ogTitle =
      document.querySelector('meta[property="og:title"]') ||
      document.head.appendChild(Object.assign(document.createElement('meta'), { property: 'og:title' }));
    ogTitle.setAttribute('content', title);

    const ogDescription =
      document.querySelector('meta[property="og:description"]') ||
      document.head.appendChild(Object.assign(document.createElement('meta'), { property: 'og:description' }));
    ogDescription.setAttribute('content', description);

    const ogLocale =
      document.querySelector('meta[property="og:locale"]') ||
      document.head.appendChild(Object.assign(document.createElement('meta'), { property: 'og:locale' }));
    ogLocale.setAttribute('content', (langMap[i18n.language] ?? 'en').replace('-', '_'));

    const ogUrl =
      document.querySelector('meta[property="og:url"]') ||
      document.head.appendChild(Object.assign(document.createElement('meta'), { property: 'og:url' }));
    ogUrl.setAttribute('content', currentHref);

    const twitterTitle =
      document.querySelector('meta[name="twitter:title"]') ||
      document.head.appendChild(Object.assign(document.createElement('meta'), { name: 'twitter:title' }));
    twitterTitle.setAttribute('content', title);

    const twitterDescription =
      document.querySelector('meta[name="twitter:description"]') ||
      document.head.appendChild(Object.assign(document.createElement('meta'), { name: 'twitter:description' }));
    twitterDescription.setAttribute('content', description);

    const canonical =
      document.querySelector('link[rel="canonical"]') ||
      document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'canonical' }));
    canonical.setAttribute('href', currentHref);

    document.head.querySelectorAll('link[data-hreflang="true"]').forEach((node) => node.remove());
    Object.entries(langMap).forEach(([langKey, htmlLang]) => {
      const altUrl = new URL(window.location.origin + window.location.pathname);
      if (langKey !== 'zh') {
        altUrl.searchParams.set('lang', langKey);
      }
      const link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = htmlLang;
      link.href = altUrl.toString();
      link.setAttribute('data-hreflang', 'true');
      document.head.appendChild(link);
    });

    const defaultAlt = document.createElement('link');
    defaultAlt.rel = 'alternate';
    defaultAlt.hreflang = 'x-default';
    defaultAlt.href = `${window.location.origin}${window.location.pathname}`;
    defaultAlt.setAttribute('data-hreflang', 'true');
    document.head.appendChild(defaultAlt);
  }, [i18n.language, isDesktopApp, selectedKey, t]);

  const checkUpdate = async () => {
    if (!window.electronAPI) return;
    try {
      const data = await window.electronAPI.checkUpdate();
      if (data && data.has_update === true) {
        Modal.confirm({
          title: t('app.update.found_new'),
          centered: true,
          width: 500,
          content: (
            <div style={{ padding: '10px 0' }}>
              <p>{t('app.update.latest_version')}: <b style={{ color: '#1677ff' }}>{data.version}</b></p>
              <p>{t('app.update.update_log')}:</p>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #dbe4f0' }}>
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 13 }}>{data.update_log || t('app.update.no_log')}</pre>
              </div>
            </div>
          ),
          okText: t('app.update.install_now'),
          cancelText: data.is_mandatory ? t('app.update.close_app') : t('app.update.remind_later'),
          onOk: async () => {
            const res = await window.electronAPI?.startUpdate({
              url: data.download_url,
              hash: data.package_hash,
            });
            if (res && !res.success) {
              message.error(`${t('app.update.fail')}: ${res.error}`);
            }
          },
          onCancel: () => {
            if (data.is_mandatory) {
              window.electronAPI?.quitApp();
            }
          },
        });
      }
    } catch (error) {
      console.error(t('app.update.check_fail'), error);
    }
  };

  const locale = getAntLocale(i18n.language as Lang);

  const menuItems = [
    { key: 'excel-to-vcf', icon: <FileExcelOutlined />, label: t('app.menu.excel_to_vcf') },
    { key: 'txt-to-vcf', icon: <FileTextOutlined />, label: t('app.menu.txt_to_vcf') },
    { key: 'vcf-to-excel', icon: <ContactsOutlined />, label: t('app.menu.vcf_to_excel') },
  ];

  const langOptions = [
    { value: 'zh', label: '\u7b80\u4f53\u4e2d\u6587' },
    { value: 'zh_TW', label: '\u7e41\u9ad4\u4e2d\u6587' },
    { value: 'en', label: 'English' },
    { value: 'ja', label: '\u65e5\u672c\u8a9e' },
    { value: 'ko', label: '\ud55c\uad6d\uc5b4' },
    { value: 'fr', label: 'Fran\u00e7ais' },
    { value: 'de', label: 'Deutsch' },
    { value: 'es', label: 'Espa\u00f1ol' },
    { value: 'it', label: 'Italiano' },
    { value: 'pt', label: 'Portugu\u00eas' },
    { value: 'pt_BR', label: 'Portugu\u00eas (Brasil)' },
    { value: 'ru', label: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439' },
    { value: 'ar', label: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629' },
    { value: 'vi', label: 'Ti\u1ebfng Vi\u1ec7t' },
    { value: 'th', label: '\u0e44\u0e17\u0e22' },
    { value: 'id', label: 'Bahasa Indonesia' },
    { value: 'pl', label: 'Polski' },
    { value: 'tr', label: 'T\u00fcrk\u00e7e' },
    { value: 'nl', label: 'Nederlands' },
    { value: 'hi', label: '\u0939\u093f\u0928\u094d\u0926\u0940' },
  ];

  const siteCategories = [
    { name: t('web_nav.home'), url: `${baseUrl}/` },
    { name: t('web_nav.ai_tools'), url: `${baseUrl}/category/ai` },
    { name: t('web_nav.office_tools'), url: `${baseUrl}/category/office` },
    { name: t('web_nav.multimedia'), url: `${baseUrl}/category/multimedia` },
    { name: t('web_nav.dev_tools'), url: `${baseUrl}/category/development` },
    { name: t('web_nav.text_processing'), url: `${baseUrl}/category/text`, active: true },
    { name: t('web_nav.file_processing'), url: `${baseUrl}/category/file` },
    { name: t('web_nav.system_tools'), url: `${baseUrl}/category/system` },
    { name: t('web_nav.life_tools'), url: `${baseUrl}/category/life` },
    { name: t('web_nav.ai_news'), url: `${baseUrl}/news` },
    { name: t('web_nav.custom_software'), url: `${baseUrl}/custom` },
  ];

  const languageCloud = [
    { value: 'zh', label: '\u7b80\u4f53\u4e2d\u6587' },
    { value: 'zh_TW', label: '\u7e41\u9ad4\u4e2d\u6587' },
    { value: 'en', label: 'English' },
    { value: 'ja', label: '\u65e5\u672c\u8a9e' },
    { value: 'ko', label: '\ud55c\uad6d\uc5b4' },
    { value: 'fr', label: 'Fran\u00e7ais' },
    { value: 'de', label: 'Deutsch' },
    { value: 'es', label: 'Espa\u00f1ol' },
    { value: 'it', label: 'Italiano' },
    { value: 'pt', label: 'Portugu\u00eas' },
    { value: 'pt_BR', label: 'Portugu\u00eas (Brasil)' },
    { value: 'ru', label: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439' },
    { value: 'ar', label: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629' },
    { value: 'vi', label: 'Ti\u1ebfng Vi\u1ec7t' },
    { value: 'th', label: '\u0e44\u0e17\u0e22' },
    { value: 'id', label: 'Bahasa Indonesia' },
    { value: 'pl', label: 'Polski' },
    { value: 'tr', label: 'T\u00fcrk\u00e7e' },
    { value: 'nl', label: 'Nederlands' },
    { value: 'hi', label: '\u0939\u093f\u0928\u094d\u0926\u0940' },
  ];
  const languageLabelMap: Record<string, string> = {
    zh: '\u8bed\u8a00',
    zh_TW: '\u8a9e\u8a00',
    en: 'Language',
    ja: '\u8a00\u8a9e',
    ko: '\uc5b8\uc5b4',
    fr: 'Langue',
    de: 'Sprache',
    es: 'Idioma',
    it: 'Lingua',
    pt: 'Idioma',
    pt_BR: 'Idioma',
    ru: '\u042f\u0437\u044b\u043a',
    ar: '\u0627\u0644\u0644\u063a\u0629',
    vi: 'Ng\u00f4n ng\u1eef',
    th: '\u0e20\u0e32\u0e29\u0e32',
    id: 'Bahasa',
    pl: 'J\u0119zyk',
    tr: 'Dil',
    nl: 'Taal',
    hi: '\u092d\u093e\u0937\u093e',
  };
  const translatedLanguageLabel = languageLabelMap[i18n.language] ?? 'Language';

  const renderContent = () => {
    switch (selectedKey) {
      case 'excel-to-vcf':
        return <ExcelToVcf />;
      case 'txt-to-vcf':
        return <TxtToVcf />;
      case 'vcf-to-excel':
        return <VcfToExcel />;
      default:
        return <ExcelToVcf />;
    }
  };

  const languageSelector = (
    <Select
      value={i18n.language}
      onChange={(val) => i18n.changeLanguage(val as Lang)}
      suffixIcon={<GlobalOutlined />}
      popupMatchSelectWidth={false}
      className="portal-language-select"
      options={langOptions}
    />
  );

  const handleCustomClick = async () => {
    try {
      const url = await getCustomUrl();
      await window.electronAPI?.openExternalUrl(url);
    } catch (error) {
      console.error(t('app.errors.get_custom_url_fail'), error);
      message.error(t('app.errors.get_custom_url_fail'));
    }
  };

  const handleFeedbackClick = async () => {
    try {
      const url = await getFeedbackUrl();
      await window.electronAPI?.openExternalUrl(url);
    } catch (error) {
      console.error(t('app.errors.get_feedback_url_fail'), error);
      message.error(t('app.errors.get_feedback_url_fail'));
    }
  };

  const desktopSidebar = (
    <>
      <div className="desktop-brand">
        <img src={vcfLogo} alt="VCF Converter" className="desktop-brand-icon" />
        <div>
          <div className="desktop-brand-title">{t('app.title')}</div>
          <div className="desktop-brand-subtitle">{t('app.subtitle')}</div>
        </div>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems}
        onClick={({ key }) => {
          setSelectedKey(key as MenuKey);
          setDrawerVisible(false);
        }}
        className="desktop-menu"
      />
      <div className="desktop-sidebar-ad">
        <CarouselAdvertisement />
      </div>
      <div className="desktop-sidebar-footer">
        <img src={kunqiongLogo} alt="Kunqiong" className="desktop-footer-icon" />
        <span>v{version}</span>
      </div>
    </>
  );

  const handleToggleMaximize = async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.toggleMaximizeWindow();
    setIsWindowMaximized(result.isMaximized);
  };

  const desktopWindowControls = isDesktopApp && !isMobile ? (
    <div className="desktop-window-controls">
      <Button
        type="text"
        className="window-control-btn"
        icon={<MinusOutlined />}
        onClick={() => void window.electronAPI?.minimizeWindow()}
      />
      <Button
        type="text"
        className="window-control-btn"
        icon={isWindowMaximized ? <BlockOutlined /> : <BorderOutlined />}
        onClick={() => void handleToggleMaximize()}
      />
      <Button
        type="text"
        className="window-control-btn close"
        icon={<CloseOutlined />}
        onClick={() => void window.electronAPI?.closeWindow()}
      />
    </div>
  ) : null;

  const portalHeader = (
    <div className="portal-header">
      <div className="portal-header-inner">
        <a href={baseUrl} className="portal-brand" target="_blank" rel="noreferrer">
          <img src={`${baseUrl}/logo.png`} alt="Kunqiong AI Toolbox" />
        </a>
        <nav className="portal-nav">
          {siteCategories.map((item) => (
            <a key={item.name} href={item.url} className={`portal-nav-item ${item.active ? 'active' : ''}`}>
              {item.name}
            </a>
          ))}
        </nav>
        <div className="portal-header-actions">
          {isLoggedIn ? (
            <div className="portal-user-box">
              <UserAuth />
            </div>
          ) : (
            <Button type="primary" className="portal-login-btn" onClick={() => setShowLoginModal(true)}>
              {t('auth.login_register')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const portalMain = (
    <div className="portal-shell">
      <div className="portal-workbench">
        <section className="portal-workbench-head">
          <div>
            <div className="portal-eyebrow">{t('web_nav.text_processing')}</div>
            <h1>{t('app.title')}</h1>
            <p>{t('app.subtitle')}</p>
          </div>
          <div className="portal-head-controls">
            <div className="portal-language-box">
              <span>{translatedLanguageLabel}</span>
              {languageSelector}
            </div>
          </div>
        </section>

        <section className="portal-tool-nav">
          {menuItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`portal-tool-tab ${selectedKey === item.key ? 'active' : ''}`}
              onClick={() => setSelectedKey(item.key as MenuKey)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </section>

        <section className="portal-tool-panel">
          {renderContent()}
        </section>

        <section className="portal-language-cloud">
          <div className="portal-section-title">{translatedLanguageLabel.toUpperCase()}</div>
          <div className="portal-language-links">
            {languageCloud.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`language-link ${i18n.language === item.value ? 'active' : ''}`}
                onClick={() => {
                  void i18n.changeLanguage(item.value as Lang);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );

  const portalFooter = (
    <footer className="portal-footer">
      <div className="portal-footer-inner">
        <div className="portal-footer-grid">
          <div className="portal-footer-brand">
            <img src={`${baseUrl}/logo2.png`} alt="Kunqiong AI Toolbox" />
            <p>{t('web_footer.desc')}</p>
          </div>
          <div>
            <h4>{t('web_footer.quick_links')}</h4>
            <a href={`${baseUrl}/`}>{t('web_nav.home')}</a>
            <a href={`${baseUrl}/category/ai`}>{t('web_nav.ai_tools')}</a>
            <a href={`${baseUrl}/custom`}>{t('web_footer.consulting')}</a>
            <a href={`${baseUrl}/news`}>{t('web_footer.industry_news')}</a>
            <a href={`${baseUrl}/feedback`}>{t('app.header.feedback')}</a>
          </div>
          <div>
            <h4>{t('web_footer.tool_categories')}</h4>
            <a href={`${baseUrl}/category/text`}>{t('web_nav.text_processing')}</a>
            <a href={`${baseUrl}/category/multimedia`}>{t('web_footer.image_gen')}</a>
            <a href={`${baseUrl}/category/office`}>{t('web_nav.office_tools')}</a>
            <a href={`${baseUrl}/category/file`}>{t('web_nav.file_processing')}</a>
            <a href={`${baseUrl}/category/development`}>{t('web_footer.code_dev')}</a>
          </div>
          <div>
            <h4>{t('web_footer.contact_us')}</h4>
            <div className="portal-contact-item"><EnvironmentOutlined /> {t('web_footer.company_name')}</div>
            <div className="portal-contact-item"><PhoneOutlined /> 17770307066</div>
            <div className="portal-contact-item"><FolderOpenOutlined /> {t('web_footer.address')}</div>
            <div className="portal-contact-item"><MailOutlined /> 11247931@qq.com</div>
          </div>
        </div>
        <div className="portal-footer-bottom">{t('web_footer.copyright')} | {t('web_footer.user_agreement')} | {t('web_footer.privacy_policy')}</div>
      </div>
    </footer>
  );

  return (
    <ErrorBoundary>
      <ConfigProvider
        locale={locale}
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: '#1677ff',
            borderRadius: 10,
            fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
          },
        }}
      >
        <AntApp>
          {isDesktopApp ? (
            <div className="desktop-shell">
              <Layout className="desktop-layout">
                {!isMobile && <Sider width={272} className="desktop-sider">{desktopSidebar}</Sider>}
                {isMobile && (
                  <Drawer
                    placement="left"
                    open={drawerVisible}
                    onClose={() => setDrawerVisible(false)}
                    width={272}
                    closable={false}
                    styles={{ body: { padding: 0 } }}
                  >
                    <div className="desktop-sider drawer-sider">{desktopSidebar}</div>
                  </Drawer>
                )}
                <Layout className="desktop-main">
                  <Header className="desktop-header">
                    {isMobile && (
                      <Button type="text" icon={<MenuOutlined />} onClick={() => setDrawerVisible(true)} />
                    )}
                    <div className="desktop-header-spacer" />
                    <div className="desktop-header-actions">
                      {!isMobile && (
                        <>
                          <Button type="text" className="desktop-link-btn" onClick={() => void handleCustomClick()}>
                            {t('app.header.custom')}
                          </Button>
                          <Button type="text" className="desktop-link-btn" onClick={() => void handleFeedbackClick()}>
                            {t('app.header.feedback')}
                          </Button>
                        </>
                      )}
                      {languageSelector}
                      <UserAuth />
                      {desktopWindowControls}
                    </div>
                  </Header>
                  <Content className="desktop-content">
                    <main className="desktop-content-inner">{renderContent()}</main>
                  </Content>
                </Layout>
              </Layout>
            </div>
          ) : (
            <div className="portal-page">
              {portalHeader}
              <LoginRequiredModal />
              {portalMain}
              {portalFooter}
            </div>
          )}
        </AntApp>
      </ConfigProvider>
    </ErrorBoundary>
  );
};

export default App;






