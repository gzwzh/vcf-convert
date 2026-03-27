import { Contact } from '../types';

// 生成 VCF 内容
export function generateVcf(contacts: Contact[], version: '2.1' | '3.0' | '4.0' = '3.0'): string {
  return contacts.map(contact => contactToVcf(contact, version)).join('\r\n\r\n');
}

// 单个联系人转 VCF
function contactToVcf(contact: Contact, version: '2.1' | '3.0' | '4.0'): string {
  const lines: string[] = ['BEGIN:VCARD', `VERSION:${version}`];
  
  // 姓名
  if (contact.name) {
    const name = escapeVcfText(contact.name);
    lines.push(`FN:${name}`);
    lines.push(`N:${name};;;;`);
  }
  
  // 电话处理辅助函数
  const addPhone = (phoneStr: string | undefined, type: 'CELL' | 'WORK' | 'HOME' | 'VOICE') => {
    if (!phoneStr) return;
    const phones = phoneStr.split(/[,;，；]/).map(p => p.trim()).filter(Boolean);
    phones.forEach(phone => {
      if (version === '2.1') {
        lines.push(`TEL;${type}:${phone}`);
      } else if (version === '3.0') {
        lines.push(`TEL;TYPE=${type}:${phone}`);
      } else {
        lines.push(`TEL;TYPE=${type.toLowerCase()};VALUE=uri:tel:${phone}`);
      }
    });
  };

  // 添加各类电话
  addPhone(contact.cellPhone, 'CELL');
  addPhone(contact.workPhone, 'WORK');
  addPhone(contact.homePhone, 'HOME');
  addPhone(contact.phone, 'VOICE'); // 兼容旧字段，默认为语音电话
  
  // 邮箱
  if (contact.email) {
    if (version === '2.1') {
      lines.push(`EMAIL;INTERNET:${escapeVcfText(contact.email)}`);
    } else {
      lines.push(`EMAIL:${escapeVcfText(contact.email)}`);
    }
  }
  
  // 公司
  if (contact.organization) {
    lines.push(`ORG:${escapeVcfText(contact.organization)}`);
  }
  
  // 职位
  if (contact.title) {
    lines.push(`TITLE:${escapeVcfText(contact.title)}`);
  }
  
  // 地址
  if (contact.address) {
    if (version === '2.1') {
      lines.push(`ADR;HOME:;;${escapeVcfText(contact.address)};;;;`);
    } else {
      lines.push(`ADR;TYPE=HOME:;;${escapeVcfText(contact.address)};;;;`);
    }
  }
  
  // 备注
  if (contact.note) {
    lines.push(`NOTE:${escapeVcfText(contact.note)}`);
  }
  
  lines.push('END:VCARD');
  return lines.join('\r\n');
}

// 解析 VCF 文件内容
export function parseVcf(content: string): Contact[] {
  const contacts: Contact[] = [];
  const vcards = content.split(/(?=BEGIN:VCARD)/i).filter(v => v.trim());
  
  for (const vcard of vcards) {
    const contact = parseVcard(vcard);
    if (contact.name || contact.phone) {
      contacts.push(contact);
    }
  }
  
  return contacts;
}

// 解析单个 vCard
function parseVcard(vcard: string): Contact {
  const contact: Contact = { name: '', phone: '' };
  const lines = vcard.split(/\r?\n/);
  const phones: string[] = [];
  let lastName = '';
  let firstName = '';
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // 处理折行（以空格或制表符开头的行是上一行的延续）
    while (i + 1 < lines.length && /^[ \t]/.test(lines[i + 1])) {
      line += lines[++i].substring(1);
    }
    
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    
    const rawKey = line.substring(0, colonIndex);
    const value = line.substring(colonIndex + 1).trim();
    const { baseKey, params } = splitVcfKey(rawKey);
    const isQuotedPrintable = params.some(p => p.toUpperCase() === 'ENCODING=QUOTED-PRINTABLE' || p.toUpperCase() === 'QUOTED-PRINTABLE');
    const charsetParam = params.find(p => p.toUpperCase().startsWith('CHARSET='));
    const charset = charsetParam ? charsetParam.substring('CHARSET='.length) : undefined;
    
    // 解析全名 FN
    if (baseKey === 'FN') {
      contact.name = decodeVcfValue(value, { isQuotedPrintable, charset });
      contact.fullName = contact.name;
    }
    
    // 解析结构化姓名 N (姓;名;中间名;前缀;后缀)
    if (baseKey === 'N') {
      const decoded = decodeVcfValue(value, { isQuotedPrintable, charset });
      const parts = decoded.split(';');
      lastName = parts[0] || '';
      firstName = parts[1] || '';
      contact.lastName = lastName;
      contact.firstName = firstName;
    }
    
    // 解析昵称
    if (baseKey === 'NICKNAME') {
      contact.nickname = decodeVcfValue(value, { isQuotedPrintable, charset });
    }
    
    // 解析电话
    if (baseKey === 'TEL') {
      const phone = value.replace(/^tel:/i, '');
      const decodedPhone = decodeVcfValue(phone, { isQuotedPrintable, charset });
      phones.push(decodedPhone);

      // 解析电话类型
      let types: string[] = [];
      params.forEach(p => {
        const upperP = p.toUpperCase();
        if (upperP.startsWith('TYPE=')) {
          types.push(...upperP.substring(5).split(','));
        } else {
          types.push(upperP);
        }
      });
      
      // 归一化类型
      if (types.includes('CELL')) {
        contact.cellPhone = contact.cellPhone ? `${contact.cellPhone}, ${decodedPhone}` : decodedPhone;
      }
      if (types.includes('WORK')) {
        contact.workPhone = contact.workPhone ? `${contact.workPhone}, ${decodedPhone}` : decodedPhone;
      }
      if (types.includes('HOME')) {
        contact.homePhone = contact.homePhone ? `${contact.homePhone}, ${decodedPhone}` : decodedPhone;
      }
    }
    
    // 解析邮箱
    if (baseKey === 'EMAIL') {
      contact.email = decodeVcfValue(value, { isQuotedPrintable, charset });
    }
    
    // 解析公司
    if (baseKey === 'ORG') {
      contact.organization = decodeVcfValue(value, { isQuotedPrintable, charset }).split(';')[0];
    }
    
    // 解析职位
    if (baseKey === 'TITLE') {
      contact.title = decodeVcfValue(value, { isQuotedPrintable, charset });
    }
    
    // 解析地址
    if (baseKey === 'ADR') {
      const decoded = decodeVcfValue(value, { isQuotedPrintable, charset });
      const parts = decoded.split(';').map(p => p.trim()).filter(Boolean);
      contact.address = parts.join(' ');
    }
    
    // 解析网址
    if (baseKey === 'URL') {
      contact.url = decodeVcfValue(value, { isQuotedPrintable, charset });
    }
    
    // 解析备注
    if (baseKey === 'NOTE') {
      contact.note = decodeVcfValue(value, { isQuotedPrintable, charset });
    }
    
    // 解析生日
    if (baseKey === 'BDAY') {
      contact.birthday = decodeVcfValue(value, { isQuotedPrintable, charset });
    }
    
    // 解析即时通讯账号
    if (baseKey === 'X-MSN') {
      contact.msn = decodeVcfValue(value, { isQuotedPrintable, charset });
    }
    if (baseKey === 'X-YAHOO') {
      contact.yahoo = decodeVcfValue(value, { isQuotedPrintable, charset });
    }
    if (baseKey === 'X-SKYPE' || baseKey === 'X-SKYPE-USERNAME') {
      contact.skype = decodeVcfValue(value, { isQuotedPrintable, charset });
    }
    if (baseKey === 'X-QQ') {
      contact.qq = decodeVcfValue(value, { isQuotedPrintable, charset });
    }
    if (baseKey === 'X-GOOGLE-TALK' || baseKey === 'X-GTALK') {
      contact.googleTalk = decodeVcfValue(value, { isQuotedPrintable, charset });
    }
    if (baseKey === 'X-ICQ') {
      contact.icq = decodeVcfValue(value, { isQuotedPrintable, charset });
    }
    
    // IMPP 字段处理
    if (baseKey === 'IMPP') {
      const imValue = decodeVcfValue(value, { isQuotedPrintable, charset });
      if (imValue.toLowerCase().startsWith('skype:')) {
        contact.skype = imValue.substring(6);
      } else if (imValue.toLowerCase().startsWith('msn:')) {
        contact.msn = imValue.substring(4);
      } else if (imValue.toLowerCase().startsWith('yahoo:')) {
        contact.yahoo = imValue.substring(6);
      } else if (imValue.toLowerCase().startsWith('xmpp:')) {
        contact.googleTalk = imValue.substring(5);
      }
    }
  }
  
  // 如果没有 FN，用 N 字段组合姓名
  if (!contact.name && (lastName || firstName)) {
    contact.name = (lastName + firstName).trim();
  }
  
  // 确保 fullName 有值（优先使用 FN，否则组合姓+名）
  if (!contact.fullName) {
    contact.fullName = contact.name || (lastName + firstName).trim();
  }
  
  // 如果 fullName 还是空的，尝试用 lastName 或 firstName
  if (!contact.fullName) {
    contact.fullName = lastName || firstName || '';
  }
  
  contact.phone = phones.join(', ');
  return contact;
}

function escapeVcfText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function splitVcfKey(rawKey: string): { baseKey: string; params: string[] } {
  const parts = rawKey.split(';');
  return {
    baseKey: (parts[0] || '').toUpperCase(),
    params: parts.slice(1).filter(Boolean),
  };
}

function decodeVcfValue(
  value: string,
  options: { isQuotedPrintable?: boolean; charset?: string } = {},
): string {
  if (options.isQuotedPrintable) {
    value = decodeQuotedPrintable(value, options.charset);
  }

  value = value.replace(/\\n/gi, '\n');
  value = value.replace(/\\,/g, ',');
  value = value.replace(/\\;/g, ';');
  value = value.replace(/\\\\/g, '\\');

  return value.trim();
}

function decodeQuotedPrintable(value: string, charset?: string): string {
  const normalized = value.replace(/=\r?\n/g, '');
  const bytes: number[] = [];

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (ch === '=' && i + 2 < normalized.length) {
      const hex = normalized.slice(i + 1, i + 3);
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16));
        i += 2;
        continue;
      }
    }

    const code = normalized.charCodeAt(i);
    if (code <= 0xff) {
      bytes.push(code);
    } else {
      const encoded = new TextEncoder().encode(normalized[i]);
      bytes.push(...encoded);
    }
  }

  const encoding = (charset || 'utf-8').toLowerCase();
  try {
    return new TextDecoder(encoding).decode(new Uint8Array(bytes));
  } catch {
    return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
  }
}
