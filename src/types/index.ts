// VCF 联系人接口
export interface Contact {
  name: string;
  phone: string;
  cellPhone?: string; // 手机
  workPhone?: string; // 工作电话
  homePhone?: string; // 家庭电话
  email?: string;
  organization?: string;
  title?: string;
  address?: string;
  note?: string;
  // 扩展字段
  lastName?: string;
  firstName?: string;
  fullName?: string;
  nickname?: string;
  url?: string;
  birthday?: string;
  msn?: string;
  yahoo?: string;
  skype?: string;
  qq?: string;
  googleTalk?: string;
  icq?: string;
}

export interface FieldMappingResult {
  headerRowIndex: number;
  mapping: Record<string, string>;
}

export interface ParseOptions {
  skipHeader?: boolean;
  headerRowIndex?: number;
  mapping?: Record<string, string>;
  encoding?: string;
}

export interface ConvertResult {
  success: boolean;
  message?: string;
  path?: string;
}