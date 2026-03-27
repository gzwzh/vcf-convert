import zh from '../locales/zh.json';
import zh_TW from '../locales/zh_TW.json';
import en from '../locales/en.json';
import ar from '../locales/ar.json';
import de from '../locales/de.json';
import fr from '../locales/fr.json';
import es from '../locales/es.json';
import it from '../locales/it.json';
import ja from '../locales/ja.json';
import ko from '../locales/ko.json';
import ru from '../locales/ru.json';
import pt from '../locales/pt.json';
import pt_BR from '../locales/pt_BR.json';
import tr from '../locales/tr.json';
import pl from '../locales/pl.json';
import th from '../locales/th.json';
import vi from '../locales/vi.json';
import id from '../locales/id.json';
import hi from '../locales/hi.json';
import nl from '../locales/nl.json';
import ms from '../locales/ms.json';
import bn from '../locales/bn.json';
import fa from '../locales/fa.json';
import he from '../locales/he.json';
import sw from '../locales/sw.json';
import ta from '../locales/ta.json';
import tl from '../locales/tl.json';
import uk from '../locales/uk.json';
import ur from '../locales/ur.json';

import { useState, useEffect } from 'react';

export type Lang = 
  | 'ar' | 'bn' | 'de' | 'en' | 'es' | 'fa' | 'fr' | 'he' | 'hi' | 'id' 
  | 'it' | 'ja' | 'ko' | 'ms' | 'nl' | 'pl' | 'pt' | 'pt_BR' | 'ru' 
  | 'sw' | 'ta' | 'th' | 'tl' | 'tr' | 'uk' | 'ur' | 'vi' | 'zh' | 'zh_TW';

const translations: Record<string, any> = { 
  zh, zh_TW, en, ar, de, fr, es, it, ja, ko, ru, pt, pt_BR, tr, pl, th, vi, id, hi, nl, ms,
  bn, fa, he, sw, ta, tl, uk, ur
};

// Simple i18n helper
class I18n {
  private currentLang: Lang = 'zh';
  private listeners: ((lang: Lang) => void)[] = [];

  constructor() {
    try {
      const urlLang = new URLSearchParams(window.location.search).get('lang') as Lang | null;
      if (urlLang && translations[urlLang]) {
        this.currentLang = urlLang;
        localStorage.setItem('lang', urlLang);
        return;
      }
      const saved = localStorage.getItem('lang') as Lang;
      if (saved && translations[saved]) {
        this.currentLang = saved;
      }
    } catch (e) {
      console.error('Failed to initialize i18n from localStorage:', e);
    }
  }

  getLang(): Lang {
    return this.currentLang;
  }

  setLang(lang: Lang) {
    if (this.currentLang === lang) return;
    this.currentLang = lang;
    try {
      localStorage.setItem('lang', lang);
      const url = new URL(window.location.href);
      if (lang === 'zh') {
        url.searchParams.delete('lang');
      } else {
        url.searchParams.set('lang', lang);
      }
      window.history.replaceState({}, '', url.toString());
    } catch (e) {
      console.error('Failed to save lang to localStorage:', e);
    }
    this.listeners.forEach(l => l(lang));
  }

  subscribe(listener: (lang: Lang) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  t(key: string, variables?: Record<string, string | number>): string {
    if (!key) return '';
    const keys = key.split('.');
    let result: any = translations[this.currentLang];

    for (const k of keys) {
      if (result && result[k] !== undefined) {
        result = result[k];
      } else {
        return key;
      }
    }

    if (typeof result !== 'string') return key;

    if (variables) {
      let finalStr = result;
      Object.entries(variables).forEach(([name, value]) => {
        finalStr = finalStr.replace(new RegExp(`{{${name}}}`, 'g'), String(value));
      });
      return finalStr;
    }

    return result;
  }

  getLangName(lang: Lang): string {
    return translations[lang]?.lang_name || lang;
  }
}

const i18n = new I18n();
export const t = (key: string, variables?: Record<string, string | number>) => i18n.t(key, variables);

export const useTranslation = () => {
  const [lang, setLangState] = useState<Lang>(i18n.getLang());

  useEffect(() => {
    return i18n.subscribe((newLang) => {
      setLangState(newLang);
    });
  }, []);

  return {
    t: (key: string, variables?: Record<string, string | number>) => i18n.t(key, variables),
    i18n: {
      changeLanguage: (l: Lang) => i18n.setLang(l),
      language: lang,
      getLangName: (l: Lang) => i18n.getLangName(l)
    }
  };
};

export default i18n;




