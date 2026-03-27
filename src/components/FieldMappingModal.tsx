import React, { useState } from 'react';
import { Modal, Button, Select, InputNumber, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { useTranslation } from '../utils/i18n';
import './FieldMappingModal.css';

interface FieldMappingModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (result: FieldMappingResult) => void;
  fileType: 'excel' | 'txt';
}

export interface FieldMapping {
  [columnName: string]: string; // 列名 -> 字段类型
}

export interface FieldMappingResult {
  headerRowIndex: number;
  mapping: FieldMapping;
}

const FieldMappingModal: React.FC<FieldMappingModalProps> = ({
  open,
  onClose,
  onConfirm,
  fileType,
}) => {
  const { t } = useTranslation();

  const fieldOptions = [
    { value: '', label: t('field_mapping.options.not_import') },
    { value: 'name', label: t('field_mapping.options.name') },
    { value: 'firstName', label: t('field_mapping.options.first_name') },
    { value: 'lastName', label: t('field_mapping.options.last_name') },
    { value: 'cellPhone', label: t('field_mapping.options.cell_phone') },
    { value: 'workPhone', label: t('field_mapping.options.work_phone') },
    { value: 'homePhone', label: t('field_mapping.options.home_phone') },
    { value: 'phone', label: t('field_mapping.options.other_phone') },
    { value: 'email', label: t('field_mapping.options.email') },
    { value: 'organization', label: t('field_mapping.options.organization') },
    { value: 'title', label: t('field_mapping.options.title_field') },
    { value: 'address', label: t('field_mapping.options.address') },
    { value: 'note', label: t('field_mapping.options.note') },
  ];

  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateFileName, setTemplateFileName] = useState<string>('');
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(1);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<FieldMapping>({});

  // 自动匹配字段
  const autoMatchField = (columnName: string): string => {
    const lowerName = columnName.toLowerCase();
    if (lowerName.includes('first') && lowerName.includes('name')) return 'firstName';
    if (lowerName.includes('last') && lowerName.includes('name')) return 'lastName';
    if (lowerName.includes('name') || lowerName.includes('姓名')) return 'name';
    if (lowerName.includes('姓') && !lowerName.includes('名')) return 'firstName';
    if (lowerName.includes('名') && !lowerName.includes('姓')) return 'lastName';
    
    // 电话相关匹配
    if (lowerName.includes('mobile') || lowerName.includes('cell') || lowerName.includes('手机')) return 'cellPhone';
    if (lowerName.includes('work') || lowerName.includes('office') || lowerName.includes('单位') || lowerName.includes('公司电话') || lowerName.includes('固话') || lowerName.includes('座机')) return 'workPhone';
    if (lowerName.includes('home') || lowerName.includes('家庭') || lowerName.includes('住宅')) return 'homePhone';
    if (lowerName.includes('phone') || lowerName.includes('电话')) return 'workPhone'; // 默认为工作电话/固话，避免误认为手机
    
    if (lowerName.includes('email') || lowerName.includes('邮箱')) return 'email';
    if (lowerName.includes('company') || lowerName.includes('org') || lowerName.includes('公司') || lowerName.includes('单位')) return 'organization';
    if (lowerName.includes('title') || lowerName.includes('职位') || lowerName.includes('职务')) return 'title';
    if (lowerName.includes('address') || lowerName.includes('地址')) return 'address';
    if (lowerName.includes('note') || lowerName.includes('备注') || lowerName.includes('remark')) return 'note';
    return '';
  };

  // 读取模板文件
  const handleTemplateUpload = async (file: File) => {
    setTemplateFile(file);
    setTemplateFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let headers: string[] = [];
        
        if (fileType === 'excel') {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
          
          if (jsonData.length >= headerRowIndex) {
            headers = (jsonData[headerRowIndex - 1] || []).map(h => String(h || '').trim()).filter(Boolean);
          }
        } else {
          // TXT 文件
          const content = e.target?.result as string;
          const lines = content.split(/\r?\n/).filter(line => line.trim());
          if (lines.length >= headerRowIndex) {
            headers = lines[headerRowIndex - 1].split(/[\t,;]/).map(h => h.trim()).filter(Boolean);
          }
        }
        
        setColumns(headers);
        
        // 自动匹配字段
        const autoMapping: FieldMapping = {};
        headers.forEach(col => {
          autoMapping[col] = autoMatchField(col);
        });
        setMapping(autoMapping);
      } catch (error) {
        console.error(t('field_mapping.read_template_fail'), error);
      }
    };
    
    if (fileType === 'excel') {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file, 'UTF-8');
    }
    
    return false; // 阻止自动上传
  };

  const handleMappingChange = (columnName: string, fieldType: string) => {
    setMapping(prev => ({
      ...prev,
      [columnName]: fieldType,
    }));
  };

  const handleConfirm = () => {
    onConfirm({ headerRowIndex, mapping });
    onClose();
  };

  const handleReselect = () => {
    setTemplateFile(null);
    setTemplateFileName('');
    setColumns([]);
    setMapping({});
  };

  return (
    <Modal
      title={t('field_mapping.title')}
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      className="field-mapping-modal"
    >
      <div className="modal-content">
        <div className="template-section">
          <div className="template-row">
            <span className="label">{t('field_mapping.template_file')}</span>
            {templateFileName ? (
              <>
                <span className="template-name">{templateFileName}</span>
                <Button type="link" onClick={handleReselect}>{t('field_mapping.reselect')}</Button>
              </>
            ) : (
              <Upload
                accept={fileType === 'excel' ? '.xlsx,.xls' : '.txt'}
                beforeUpload={handleTemplateUpload}
                showUploadList={false}
              >
                <Button type="link" icon={<UploadOutlined />}>{t('field_mapping.select_file')}</Button>
              </Upload>
            )}
          </div>
          
          <div className="template-row">
            <span className="label">{t('field_mapping.header_row_index')}</span>
            <InputNumber
              min={1}
              max={10}
              value={headerRowIndex}
              onChange={(value) => setHeaderRowIndex(value || 1)}
              style={{ width: 80 }}
            />
            <Button 
              type="link" 
              onClick={() => templateFile && handleTemplateUpload(templateFile)}
              disabled={!templateFileName}
            >
              {t('field_mapping.save_selection')}
            </Button>
          </div>
        </div>

        {columns.length > 0 && (
          <div className="mapping-section">
            <div className="mapping-header">
              <span>{t('field_mapping.column_name')}</span>
              <span>{t('field_mapping.mapping_field')}</span>
            </div>
            <div className="mapping-list">
              {columns.map((col, index) => (
                <div key={index} className="mapping-item">
                  <span className="column-name">{col}</span>
                  <Select
                    value={mapping[col] || ''}
                    onChange={(value) => handleMappingChange(col, value)}
                    options={fieldOptions}
                    style={{ width: 150 }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="modal-footer">
          <Button type="primary" onClick={handleConfirm}>
            {t('common.ok')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default FieldMappingModal;
