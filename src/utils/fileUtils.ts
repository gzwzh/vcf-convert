import * as XLSX from 'xlsx';
import { Contact, ParseOptions } from '../types';
import { t } from './i18n';

// 解析 Excel 文件
export async function parseExcel(
  file: File,
  options: ParseOptions = {},
): Promise<Contact[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
        
        const skipHeader = options.skipHeader ?? true;
        const headerRowIndex = options.headerRowIndex ?? 1;
        const mapping = options.mapping ?? {};
        const hasMapping = Object.keys(mapping).length > 0;

        const contacts: Contact[] = [];

        // 尝试自动识别列名
        const headerRow = Math.max(0, headerRowIndex - 1);
        const rawHeaders = (jsonData[headerRow] || []).map(h => String(h || '').trim().toLowerCase());
        
        // 自动映射常见列名
        const autoMapping: Record<number, string> = {};
        rawHeaders.forEach((header, idx) => {
          if (header.includes('first') && header.includes('name')) autoMapping[idx] = 'firstName';
          else if (header.includes('last') && header.includes('name')) autoMapping[idx] = 'lastName';
          else if (header.includes('姓名') || header === 'name' || header === '名字' || header === '全名') autoMapping[idx] = 'name';
          else if (header.includes('姓') && !header.includes('名')) autoMapping[idx] = 'lastName';
          else if (header.includes('名') && !header.includes('姓')) autoMapping[idx] = 'firstName';
          else if (header.includes('phone') || header.includes('电话') || header.includes('手机') || header.includes('tel')) autoMapping[idx] = 'phone';
          else if (header.includes('email') || header.includes('邮箱') || header.includes('邮件')) autoMapping[idx] = 'email';
          else if (header.includes('org') || header.includes('company') || header.includes('公司') || header.includes('组织')) autoMapping[idx] = 'organization';
          else if (header.includes('title') || header.includes('职位') || header.includes('头衔')) autoMapping[idx] = 'title';
          else if (header.includes('address') || header.includes('地址')) autoMapping[idx] = 'address';
          else if (header.includes('note') || header.includes('备注') || header.includes('remark')) autoMapping[idx] = 'note';
        });
        
        const hasAutoMapping = Object.keys(autoMapping).length > 0;

        if (hasMapping) {
          const headerIndex = new Map<string, number>();
          rawHeaders.forEach((_, idx) => {
            const originalHeader = (jsonData[headerRow] || [])[idx];
            if (originalHeader) headerIndex.set(String(originalHeader).trim(), idx);
          });

          const startRow = skipHeader ? headerRow + 1 : headerRow;
          for (let i = startRow; i < jsonData.length; i++) {
            const row = jsonData[i] as any;
            if (!row || row.length === 0) continue;

            const contact: Contact = { name: '', phone: '' };
            let firstName = '';
            let lastName = '';

            for (const [columnName, fieldType] of Object.entries(mapping)) {
              if (!fieldType) continue;
              const colIndex = headerIndex.get(columnName);
              if (colIndex === undefined) continue;
              const rawValue = row[colIndex];
              const value = String(rawValue ?? '').trim();
              if (!value) continue;

              if (fieldType === 'name') contact.name = value;
              if (fieldType === 'firstName') firstName = value;
              if (fieldType === 'lastName') lastName = value;
              if (fieldType === 'phone') contact.phone = value;
              if (fieldType === 'cellPhone') contact.cellPhone = value;
              if (fieldType === 'workPhone') contact.workPhone = value;
              if (fieldType === 'homePhone') contact.homePhone = value;
              if (fieldType === 'email') contact.email = value;
              if (fieldType === 'organization') contact.organization = value;
              if (fieldType === 'title') contact.title = value;
              if (fieldType === 'address') contact.address = value;
              if (fieldType === 'note') contact.note = value;
            }

            if (!contact.name) {
              contact.name = (lastName + firstName).trim() || firstName || lastName;
            }

            if (contact.name || contact.phone || contact.cellPhone || contact.workPhone || contact.homePhone) contacts.push(contact);
          }
        } else if (hasAutoMapping) {
          // 使用自动识别的列映射
          const startRow = skipHeader ? headerRow + 1 : headerRow;
          for (let i = startRow; i < jsonData.length; i++) {
            const row = jsonData[i] as any;
            if (!row || row.length === 0) continue;

            const contact: Contact = { name: '', phone: '' };
            let firstName = '';
            let lastName = '';

            for (const [colIdxStr, fieldType] of Object.entries(autoMapping)) {
              const colIndex = parseInt(colIdxStr);
              const rawValue = row[colIndex];
              const value = String(rawValue ?? '').trim();
              if (!value) continue;

              if (fieldType === 'name') contact.name = value;
              if (fieldType === 'firstName') firstName = value;
              if (fieldType === 'lastName') lastName = value;
              if (fieldType === 'phone') contact.phone = value;
              if (fieldType === 'cellPhone') contact.cellPhone = value;
              if (fieldType === 'workPhone') contact.workPhone = value;
              if (fieldType === 'homePhone') contact.homePhone = value;
              if (fieldType === 'email') contact.email = value;
              if (fieldType === 'organization') contact.organization = value;
              if (fieldType === 'title') contact.title = value;
              if (fieldType === 'address') contact.address = value;
              if (fieldType === 'note') contact.note = value;
            }

            if (!contact.name) {
              contact.name = (lastName + firstName).trim() || firstName || lastName;
            }

            if (contact.name || contact.phone || contact.cellPhone || contact.workPhone || contact.homePhone) contacts.push(contact);
          }
        } else {
          // 没有表头或无法识别，按固定列顺序
          const startRow = skipHeader ? 1 : 0;
          for (let i = startRow; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;

            const contact: Contact = {
              name: String(row[0] || '').trim(),
              phone: String(row[1] || '').trim(),
              email: row[2] ? String(row[2]).trim() : undefined,
              organization: row[3] ? String(row[3]).trim() : undefined,
              title: row[4] ? String(row[4]).trim() : undefined,
              address: row[5] ? String(row[5]).trim() : undefined,
              note: row[6] ? String(row[6]).trim() : undefined,
            };

            if (contact.name || contact.phone) {
              contacts.push(contact);
            }
          }
        }
        
        resolve(contacts);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error(t('common.read_file_fail')));
    reader.readAsArrayBuffer(file);
  });
}

// 解析 TXT 文件
export async function parseTxt(
  file: File,
  options: ParseOptions = {},
): Promise<Contact[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const lines = content.split(/\r?\n/).filter(line => line.trim());
        
        const skipHeader = options.skipHeader ?? true;
        const headerRowIndex = options.headerRowIndex ?? 1;
        const mapping = options.mapping ?? {};
        const hasMapping = Object.keys(mapping).length > 0;

        const contacts: Contact[] = [];

        // 尝试自动识别列名
        const headerRow = Math.max(0, headerRowIndex - 1);
        const headerLine = lines[headerRow] || '';
        const rawHeaders = headerLine.split(/[\t,;]/).map(h => h.trim().toLowerCase());
        
        // 自动映射常见列名
        const autoMapping: Record<number, string> = {};
        rawHeaders.forEach((header, idx) => {
          if (header.includes('first') && header.includes('name')) autoMapping[idx] = 'firstName';
          else if (header.includes('last') && header.includes('name')) autoMapping[idx] = 'lastName';
          else if (header.includes('姓名') || header === 'name' || header === '名字' || header === '全名') autoMapping[idx] = 'name';
          else if (header.includes('姓') && !header.includes('名')) autoMapping[idx] = 'lastName';
          else if (header.includes('名') && !header.includes('姓')) autoMapping[idx] = 'firstName';
          else if (header.includes('phone') || header.includes('电话') || header.includes('手机') || header.includes('tel')) autoMapping[idx] = 'phone';
          else if (header.includes('email') || header.includes('邮箱') || header.includes('邮件')) autoMapping[idx] = 'email';
          else if (header.includes('org') || header.includes('company') || header.includes('公司') || header.includes('组织')) autoMapping[idx] = 'organization';
          else if (header.includes('title') || header.includes('职位') || header.includes('头衔')) autoMapping[idx] = 'title';
          else if (header.includes('address') || header.includes('地址')) autoMapping[idx] = 'address';
          else if (header.includes('note') || header.includes('备注') || header.includes('remark')) autoMapping[idx] = 'note';
        });
        
        const hasAutoMapping = Object.keys(autoMapping).length > 0;

        if (hasMapping) {
          const headers = headerLine.split(/[\t,;]/).map(h => h.trim());
          const headerIndex = new Map<string, number>();
          headers.forEach((h, idx) => headerIndex.set(h, idx));

          const startRow = skipHeader ? headerRow + 1 : headerRow;
          for (let i = startRow; i < lines.length; i++) {
            const line = lines[i];
            const parts = line.split(/[\t,;]/).map(p => p.trim());

            const contact: Contact = { name: '', phone: '' };
            let firstName = '';
            let lastName = '';

            for (const [columnName, fieldType] of Object.entries(mapping)) {
              if (!fieldType) continue;
              const colIndex = headerIndex.get(columnName);
              if (colIndex === undefined) continue;
              const value = String(parts[colIndex] ?? '').trim();
              if (!value) continue;

              if (fieldType === 'name') contact.name = value;
              if (fieldType === 'firstName') firstName = value;
              if (fieldType === 'lastName') lastName = value;
              if (fieldType === 'phone') contact.phone = value;
              if (fieldType === 'cellPhone') contact.cellPhone = value;
              if (fieldType === 'workPhone') contact.workPhone = value;
              if (fieldType === 'homePhone') contact.homePhone = value;
              if (fieldType === 'email') contact.email = value;
              if (fieldType === 'organization') contact.organization = value;
              if (fieldType === 'title') contact.title = value;
              if (fieldType === 'address') contact.address = value;
              if (fieldType === 'note') contact.note = value;
            }

            if (!contact.name) {
              contact.name = (lastName + firstName).trim() || firstName || lastName;
            }

            if (contact.name || contact.phone) contacts.push(contact);
          }
        } else if (hasAutoMapping) {
          // 使用自动识别的列映射
          const startRow = skipHeader ? headerRow + 1 : headerRow;
          for (let i = startRow; i < lines.length; i++) {
            const line = lines[i];
            const parts = line.split(/[\t,;]/).map(p => p.trim());

            const contact: Contact = { name: '', phone: '' };
            let firstName = '';
            let lastName = '';

            for (const [colIdxStr, fieldType] of Object.entries(autoMapping)) {
              const colIndex = parseInt(colIdxStr);
              const value = String(parts[colIndex] ?? '').trim();
              if (!value) continue;

              if (fieldType === 'name') contact.name = value;
              if (fieldType === 'firstName') firstName = value;
              if (fieldType === 'lastName') lastName = value;
              if (fieldType === 'phone') contact.phone = value;
              if (fieldType === 'cellPhone') contact.cellPhone = value;
              if (fieldType === 'workPhone') contact.workPhone = value;
              if (fieldType === 'homePhone') contact.homePhone = value;
              if (fieldType === 'email') contact.email = value;
              if (fieldType === 'organization') contact.organization = value;
              if (fieldType === 'title') contact.title = value;
              if (fieldType === 'address') contact.address = value;
              if (fieldType === 'note') contact.note = value;
            }

            if (!contact.name) {
              contact.name = (lastName + firstName).trim() || firstName || lastName;
            }

            if (contact.name || contact.phone) contacts.push(contact);
          }
        } else {
          const startRow = skipHeader ? 1 : 0;
          for (let i = startRow; i < lines.length; i++) {
            const line = lines[i];
            const parts = line.split(/[\t,;]/).map(p => p.trim());

            const contact: Contact = {
              name: parts[0] || '',
              phone: parts[1] || '',
              email: parts[2] || undefined,
              organization: parts[3] || undefined,
              title: parts[4] || undefined,
              address: parts[5] || undefined,
              note: parts[6] || undefined,
            };

            if (contact.name || contact.phone) {
              contacts.push(contact);
            }
          }
        }
        
        resolve(contacts);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error(t('common.read_file_fail')));
    const encoding = options.encoding;
    if (!encoding || encoding === 'system') {
      reader.readAsText(file);
    } else {
      reader.readAsText(file, encoding);
    }
  });
}

// 读取 VCF 文件内容
export async function readVcfFile(file: File, encoding?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error(t('common.read_file_fail')));
    if (!encoding || encoding === 'system') {
      reader.readAsText(file);
    } else {
      reader.readAsText(file, encoding);
    }
  });
}

// 导出为 Excel
export function exportToExcel(
  contacts: Contact[],
  filename: string,
  includeHeader: boolean = true,
  exportFields?: string[],
): void {
  const fields = exportFields || defaultExportFields;
  const data = buildExportData(contacts, includeHeader, exportFields);
  
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, t('common.contacts_sheet_name'));
  
  // 设置列宽
  const colWidths = fields.map(() => ({ wch: 15 }));
  worksheet['!cols'] = colWidths;
  
  // 找到电话列的索引，设置为文本格式
  const phoneFields = ['phone', 'cellPhone', 'workPhone', 'homePhone'];
  phoneFields.forEach(field => {
    const phoneColIndex = fields.indexOf(field);
    if (phoneColIndex >= 0) {
      const phoneCol = String.fromCharCode(65 + phoneColIndex);
      const startRow = includeHeader ? 2 : 1;
      for (let i = 0; i < contacts.length; i++) {
        const cellRef = `${phoneCol}${startRow + i}`;
        if (worksheet[cellRef]) {
          worksheet[cellRef].t = 's';
          worksheet[cellRef].z = '@';
        }
      }
    }
  });
  
  XLSX.writeFile(workbook, filename);
}

// 导出为 CSV
export function exportToCsv(
  contacts: Contact[],
  filename: string,
  includeHeader: boolean = true,
  exportFields?: string[],
): void {
  const fields = exportFields || defaultExportFields;
  const fieldLabels = getFieldLabels();
  const lines: string[] = [];
  
  if (includeHeader) {
    lines.push(fields.map(k => `"${(fieldLabels[k] || k).replace(/"/g, '""')}"`).join(','));
  }
  
  contacts.forEach(contact => {
    const row = fields.map(k => {
      const v = contactFieldValue(contact, k);
      // CSV 中用双引号包裹，内部双引号转义
      return `"${v.replace(/"/g, '""')}"`;
    });
    lines.push(row.join(','));
  });
  
  const csv = lines.join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, filename);
}

// 导出为 XLS (旧版 Excel 格式)
export function exportToXls(
  contacts: Contact[],
  filename: string,
  includeHeader: boolean = true,
  exportFields?: string[],
): void {
  const fields = exportFields || defaultExportFields;
  const data = buildExportData(contacts, includeHeader, exportFields);
  
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, t('common.contacts_sheet_name'));
  
  // 设置列宽
  const colWidths = fields.map(() => ({ wch: 15 }));
  worksheet['!cols'] = colWidths;
  
  // 找到电话列的索引，设置为文本格式
  const phoneFields = ['phone', 'cellPhone', 'workPhone', 'homePhone'];
  phoneFields.forEach(field => {
    const phoneColIndex = fields.indexOf(field);
    if (phoneColIndex >= 0) {
      const phoneCol = String.fromCharCode(65 + phoneColIndex);
      const startRow = includeHeader ? 2 : 1;
      for (let i = 0; i < contacts.length; i++) {
        const cellRef = `${phoneCol}${startRow + i}`;
        if (worksheet[cellRef]) {
          worksheet[cellRef].t = 's';
          worksheet[cellRef].z = '@';
        }
      }
    }
  });
  
  XLSX.writeFile(workbook, filename, { bookType: 'xls' });
}

// 导出为 TXT (制表符分隔)
export function exportToTxt(
  contacts: Contact[],
  filename: string,
  includeHeader: boolean = true,
  exportFields?: string[],
): void {
  const fields = exportFields || defaultExportFields;
  const fieldLabels = getFieldLabels();
  const lines: string[] = [];
  
  if (includeHeader) {
    lines.push(fields.map(k => fieldLabels[k] || k).join('\t'));
  }
  
  contacts.forEach(contact => {
    const row = fields.map(k => contactFieldValue(contact, k));
    lines.push(row.join('\t'));
  });
  
  const txt = lines.join('\r\n');
  const blob = new Blob(['\ufeff' + txt], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, filename);
}

// 下载 VCF 文件
export function downloadVcf(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/vcard;charset=utf-8' });
  downloadBlob(blob, filename);
}

// 保存 VCF 文件到指定目录（Electron 环境）
export async function saveVcfToDir(content: string, filename: string, outputDir: string): Promise<boolean> {
  if (window.electronAPI) {
    const result = await window.electronAPI.saveFile({ filename, content, outputDir });
    return result.success;
  }
  // 非 Electron 环境，使用浏览器下载
  downloadVcf(content, filename);
  return true;
}

// 保存 Excel/CSV/TXT 到指定目录（Electron 环境）
export async function saveExcelToDir(
  contacts: Contact[],
  filename: string,
  outputDir: string,
  includeHeader: boolean = true,
  exportFields?: string[],
  format?: 'csv' | 'xlsx' | 'xls' | 'txt',
): Promise<boolean> {
  const fields = exportFields || defaultExportFields;
  const fieldLabels = getFieldLabels();
  const data = buildExportData(contacts, includeHeader, exportFields);
  
  // 根据文件名或参数确定格式
  const fileFormat = format || (
    /\.xlsx$/i.test(filename) ? 'xlsx' :
    /\.xls$/i.test(filename) ? 'xls' :
    /\.txt$/i.test(filename) ? 'txt' : 'csv'
  );

  if (window.electronAPI && outputDir) {
    // CSV 格式
    if (fileFormat === 'csv') {
      const lines: string[] = [];
      if (includeHeader) {
        lines.push(fields.map(k => `"${(fieldLabels[k] || k).replace(/"/g, '""')}"`).join(','));
      }
      contacts.forEach(contact => {
        const row = fields.map(k => {
          const v = contactFieldValue(contact, k);
          return `"${v.replace(/"/g, '""')}"`;
        });
        lines.push(row.join(','));
      });
      const content = '\ufeff' + lines.join('\r\n');
      const result = await window.electronAPI.saveFile({ filename, content, outputDir });
      return result.success;
    }

    // TXT 格式
    if (fileFormat === 'txt') {
      const lines: string[] = [];
      if (includeHeader) {
        lines.push(fields.map(k => fieldLabels[k] || k).join('\t'));
      }
      contacts.forEach(contact => {
        const row = fields.map(k => contactFieldValue(contact, k));
        lines.push(row.join('\t'));
      });
      const content = '\ufeff' + lines.join('\r\n');
      const result = await window.electronAPI.saveFile({ filename, content, outputDir });
      return result.success;
    }

    // XLS/XLSX 格式
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    // 设置列宽
    const colWidths = fields.map(() => ({ wch: 15 }));
    worksheet['!cols'] = colWidths;
    
    // 找到电话列的索引，设置为文本格式
    const phoneFields = ['phone', 'cellPhone', 'workPhone', 'homePhone'];
    phoneFields.forEach(field => {
      const phoneColIndex = fields.indexOf(field);
      if (phoneColIndex >= 0) {
        const phoneCol = String.fromCharCode(65 + phoneColIndex);
        const startRow = includeHeader ? 2 : 1;
        for (let i = 0; i < contacts.length; i++) {
          const cellRef = `${phoneCol}${startRow + i}`;
          if (worksheet[cellRef]) {
            worksheet[cellRef].t = 's';
            worksheet[cellRef].z = '@';
          }
        }
      }
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t('common.contacts_sheet_name'));
    
    const bookType = fileFormat === 'xls' ? 'xls' : 'xlsx';
    const base64Data = XLSX.write(workbook, { type: 'base64', bookType });
    
    // 将 base64 转换为 Uint8Array
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const result = await window.electronAPI.saveBinaryFile({ filename, buffer: Array.from(bytes), outputDir });
    return result.success;
  }
  
  // 非 Electron 环境，使用浏览器下载
  if (fileFormat === 'csv') {
    exportToCsv(contacts, filename, includeHeader, exportFields);
    return true;
  }
  if (fileFormat === 'txt') {
    exportToTxt(contacts, filename, includeHeader, exportFields);
    return true;
  }
  if (fileFormat === 'xls') {
    exportToXls(contacts, filename, includeHeader, exportFields);
    return true;
  }
  
  // 默认 xlsx
  exportToExcel(contacts, filename, includeHeader, exportFields);
  return true;
}

// 默认导出字段
const defaultExportFields = ['fullName', 'phone', 'email', 'organization', 'address', 'note'];

// 字段标签映射
const getFieldLabels = (): Record<string, string> => ({
  lastName: t('export_fields.fields.lastName'),
  firstName: t('export_fields.fields.firstName'),
  fullName: t('export_fields.fields.fullName'),
  nickname: t('export_fields.fields.nickname'),
  organization: t('export_fields.fields.organization'),
  title: t('export_fields.fields.title'),
  phone: t('export_fields.fields.phone'),
  cellPhone: t('export_fields.fields.cellPhone'),
  workPhone: t('export_fields.fields.workPhone'),
  homePhone: t('export_fields.fields.home_phone'),
  email: t('export_fields.fields.email'),
  address: t('export_fields.fields.address'),
  url: t('export_fields.fields.url'),
  note: t('export_fields.fields.note'),
  birthday: t('export_fields.fields.birthday'),
  msn: t('export_fields.fields.msn'),
  yahoo: t('export_fields.fields.yahoo'),
  skype: t('export_fields.fields.skype'),
  qq: t('export_fields.fields.qq'),
  googleTalk: t('export_fields.fields.googleTalk'),
  icq: t('export_fields.fields.icq'),
  name: t('export_fields.fields.fullName'),
});

function buildExportData(
  contacts: Contact[],
  includeHeader: boolean,
  exportFields?: string[],
): string[][] {
  const fields = exportFields || defaultExportFields;
  const data: string[][] = [];
  const labels = getFieldLabels();

  if (includeHeader) {
    data.push(fields.map(k => labels[k] || k));
  }

  contacts.forEach(contact => {
    data.push(fields.map(k => contactFieldValue(contact, k)));
  });

  return data;
}

function contactFieldValue(contact: Contact, key: string): string {
  // 特殊处理 fullName，如果没有则使用 name
  if (key === 'fullName') {
    const fullName = contact.fullName || contact.name || '';
    return String(fullName);
  }
  
  const v = (contact as any)[key];
  if (v === undefined || v === null) return '';
  const str = String(v);
  return str;
}

// 通用下载函数
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
