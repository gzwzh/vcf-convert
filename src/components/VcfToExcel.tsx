import React, { useState, useEffect } from 'react';
import { Card, Select, Switch, Button, Input, App } from 'antd';
import { PlayCircleOutlined, SettingOutlined, FolderOpenOutlined, FolderViewOutlined } from '@ant-design/icons';
import type { FileWithStatus } from './FileUploader';
import FileUploader from './FileUploader';
import ExportFieldsModal from './ExportFieldsModal';
import { useAuthCode } from '../contexts/AuthCodeContext';
import { readVcfFile, exportToExcel, exportToCsv, exportToXls, exportToTxt, saveExcelToDir } from '../utils/fileUtils';
import { parseVcf } from '../utils/vcfParser';
import { Contact } from '../types';
import { useTranslation } from '../utils/i18n';
import './ConverterPage.css';

type OutputDirType = 'default' | 'source' | 'custom';

// 根据格式导出文件
const exportByFormat = (
  contacts: Contact[],
  filename: string,
  includeHeader: boolean,
  exportFields: string[],
  format: 'csv' | 'xlsx' | 'xls' | 'txt'
) => {
  switch (format) {
    case 'xlsx':
      exportToExcel(contacts, filename, includeHeader, exportFields);
      break;
    case 'xls':
      exportToXls(contacts, filename, includeHeader, exportFields);
      break;
    case 'txt':
      exportToTxt(contacts, filename, includeHeader, exportFields);
      break;
    case 'csv':
    default:
      exportToCsv(contacts, filename, includeHeader, exportFields);
      break;
  }
};

const VcfToExcel: React.FC = () => {
  const { t } = useTranslation();
  const { message, modal } = App.useApp();
  const { checkAuthAndExecute } = useAuthCode();
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [outputFormat, setOutputFormat] = useState<'csv' | 'xlsx' | 'xls' | 'txt'>('csv');
  const [includeHeader, setIncludeHeader] = useState(true);
  const [mergeFiles, setMergeFiles] = useState(false);
  const [converting, setConverting] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [outputDirType, setOutputDirType] = useState<OutputDirType>('default');
  const [customPath, setCustomPath] = useState('');
  const [defaultPath, setDefaultPath] = useState('');
  const [hasConverted, setHasConverted] = useState(false);
  const [exportFields, setExportFields] = useState<string[]>([
    'fullName', 'phone', 'email', 'organization', 'address', 'note'
  ]);

  // 初始化时获取默认输出目录
  useEffect(() => {
    const initDefaultPath = async () => {
      if (window.electronAPI) {
        const path = await window.electronAPI.getDefaultOutputDir();
        if (path) {
          setDefaultPath(path);
        }
      }
    };
    initDefaultPath();
  }, []);

  // 获取当前显示的路径
  const getCurrentDisplayPath = () => {
    switch (outputDirType) {
      case 'default':
        return defaultPath || t('converter.dir_types.default');
      case 'source':
        return t('converter.dir_types.source');
      case 'custom':
        return customPath || t('converter.dir_types.not_selected');
      default:
        return '';
    }
  };

  // 获取实际输出目录
  const getOutputDir = async (originFile?: File): Promise<string | null> => {
    if (outputDirType === 'default') {
      return defaultPath || 'default';
    }
    if (outputDirType === 'source' && originFile && window.electronAPI) {
      const filePath = (originFile as any).path;
      if (typeof filePath === 'string' && filePath) {
        return await window.electronAPI.getDirname(filePath);
      }
    }
    if (outputDirType === 'custom' && customPath) {
      return customPath;
    }
    return null;
  };

  const handleSelectCustomPath = async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.selectOutputDir();
      if (path) {
        setCustomPath(path);
        setOutputDirType('custom');
      }
    } else {
      message.info(t('common.desktop_only'));
    }
  };

  const handleOpenOutputFolder = async () => {
    if (window.electronAPI) {
      let targetPath = 'default';
      if (outputDirType === 'custom' && customPath) {
        targetPath = customPath;
      } else if (outputDirType === 'default') {
        targetPath = defaultPath || 'default';
      }
      const result = await window.electronAPI.openFolder(targetPath);
      if (!result.success) {
        message.error(`${t('common.open_folder_fail')}: ${result.error || t('common.unknown_error')}`);
      }
    } else {
      message.info(t('common.desktop_only'));
    }
  };

  // 更新单个文件状态为已完成
  const markFileCompleted = (fileUid: string) => {
    setFiles(prevFiles => 
      prevFiles.map(f => 
        f.uid === fileUid ? { ...f, processStatus: 'completed' as const } : f
      )
    );
  };

  // 更新所有文件状态为已完成
  const markAllFilesCompleted = () => {
    setFiles(prevFiles => 
      prevFiles.map(f => ({ ...f, processStatus: 'completed' as const }))
    );
  };

  const handleProcessSingleFile = async (file: FileWithStatus) => {
    const originFile = file.originFileObj;
    if (!originFile) {
      message.error(t('common.invalid_file'));
      return;
    }

    // 检查是否选择了输出目录
    if (outputDirType === 'custom' && !customPath.trim()) {
      message.warning(t('common.select_output_dir_first'));
      handleSelectCustomPath();
      return;
    }

    await checkAuthAndExecute(async () => {
      try {
        const content = await readVcfFile(originFile);
        const contacts = parseVcf(content);
        const filename = originFile.name.replace(/\.vcf$/i, `.${outputFormat}`);
        
        if (contacts.length === 0) {
          message.warning(t('common.no_contacts_found'));
          return;
        }
        
        if (window.electronAPI) {
          const outputDir = await getOutputDir(originFile);
          if (outputDir) {
            await saveExcelToDir(contacts, filename, outputDir, includeHeader, exportFields, outputFormat);
          } else {
            exportByFormat(contacts, filename, includeHeader, exportFields, outputFormat);
          }
        } else {
          exportByFormat(contacts, filename, includeHeader, exportFields, outputFormat);
        }
        
        markFileCompleted(file.uid);
        setHasConverted(true);
        
        modal.success({
          title: t('common.convert_success'),
          content: t('common.convert_success_msg', { 
            filename: originFile.name, 
            count: contacts.length, 
            unit: t('common.contacts') 
          }),
          okText: t('common.ok'),
        });
      } catch (error) {
        message.error(t('common.convert_fail_msg', { error: (error as Error).message }));
      }
    });
  };

  const handleConvert = async () => {
    if (converting) return;
    if (files.length === 0) {
      message.warning(t('common.no_files'));
      return;
    }

    if (outputDirType === 'custom' && !customPath.trim()) {
      message.warning(t('common.select_output_dir_first'));
      handleSelectCustomPath();
      return;
    }

    setConverting(true);
    try {
      await checkAuthAndExecute(async () => {
        try {
          const allContacts: Contact[] = [];

          for (const file of files) {
            const originFile = file.originFileObj;
            if (!originFile) continue;

            const content = await readVcfFile(originFile);
            const contacts = parseVcf(content);
            
            if (mergeFiles) {
              allContacts.push(...contacts);
            } else {
              const filename = originFile.name.replace(/\.vcf$/i, `.${outputFormat}`);
              if (window.electronAPI) {
                const outputDir = await getOutputDir(originFile);
                if (outputDir) {
                  await saveExcelToDir(contacts, filename, outputDir, includeHeader, exportFields, outputFormat);
                } else {
                  exportByFormat(contacts, filename, includeHeader, exportFields, outputFormat);
                }
              } else {
                exportByFormat(contacts, filename, includeHeader, exportFields, outputFormat);
              }
            }
          }

          if (mergeFiles && allContacts.length > 0) {
            const filename = `contacts_merged.${outputFormat}`;
            if (window.electronAPI) {
              const outputDir = await getOutputDir(files[0]?.originFileObj);
              if (outputDir) {
                await saveExcelToDir(allContacts, filename, outputDir, includeHeader, exportFields, outputFormat);
              } else {
                exportByFormat(allContacts, filename, includeHeader, exportFields, outputFormat);
              }
            } else {
              exportByFormat(allContacts, filename, includeHeader, exportFields, outputFormat);
            }
          }

          markAllFilesCompleted();
          setHasConverted(true);

          modal.success({
            title: t('common.convert_success'),
            content: t('common.convert_all_success_msg', {
              count: mergeFiles ? allContacts.length : files.length,
              unit: mergeFiles ? t('common.contacts') : t('common.files')
            }),
            okText: t('common.ok'),
          });
        } catch (error) {
          message.error(t('common.convert_fail_msg', { error: (error as Error).message }));
        }
      });
    } finally {
      setConverting(false);
    }
  };

  const handleFilesChange = (newFiles: FileWithStatus[]) => {
    setFiles(newFiles);
    if (newFiles.length === 0) {
      setHasConverted(false);
    }
  };

  const isDesktop = !!window.electronAPI;

  return (
    <div className="converter-page">
      <Card className="converter-card" title={t('app.menu.vcf_to_excel')}>
        <FileUploader
          files={files}
          onFilesChange={handleFilesChange}
          accept=".vcf"
          onProcessFile={handleProcessSingleFile}
        />

        <div className="settings-panel">
          {/* 第一行：数据源设置和开始按钮 */}
          <div className="settings-row">
            <div className="setting-item">
              <span className="setting-label">{t('export_fields.title')}</span>
              <Button
                icon={<SettingOutlined />}
                onClick={() => setSettingsVisible(true)}
              >
                {t('common.settings')}
              </Button>
            </div>
            <div className="setting-item right-section">
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={handleConvert}
                loading={converting}
                disabled={files.length === 0}
                className="convert-btn"
                style={{ width: '100%' }}
              >
                {t('common.start_all')}
              </Button>
            </div>
          </div>

          {/* 第二行：转换选项 */}
          <div className="settings-row">
            <div className="setting-item">
              <span className="setting-label">{t('common.export_header')}</span>
              <Switch checked={includeHeader} onChange={setIncludeHeader} />
            </div>
            <div className="setting-item">
              <span className="setting-label">{t('common.output_format')}</span>
              <Select
                value={outputFormat}
                onChange={setOutputFormat}
                style={{ width: 110 }}
                options={[
                  { value: 'csv', label: 'CSV' },
                  { value: 'xlsx', label: 'Excel (xlsx)' },
                  { value: 'xls', label: 'Excel (xls)' },
                  { value: 'txt', label: 'Text (txt)' },
                ]}
              />
            </div>
            {isDesktop && (
              <div className="setting-item right-section">
                <div className="checkbox-group">
                  <label className="checkbox-item">
                    <Switch
                      size="small"
                      checked={mergeFiles}
                      onChange={setMergeFiles}
                    />
                    <span>{t('converter.merge_files')}</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {isDesktop && (
            <>
              {/* 第三行：输出目录 */}
              <div className="settings-row">
                <div className="setting-item">
                  <span className="setting-label">{t('converter.output_dir')}</span>
                  <Select
                    value={outputDirType}
                    onChange={(value) => setOutputDirType(value)}
                    style={{ width: 200 }}
                    popupMatchSelectWidth={false}
                    options={[
                      { value: 'default', label: t('converter.dir_types.default') },
                      { value: 'custom', label: t('converter.dir_types.custom') },
                      { value: 'source', label: t('converter.dir_types.source') },
                    ]}
                  />
                  <Button
                    icon={<FolderOpenOutlined />}
                    onClick={handleSelectCustomPath}
                    title={t('converter.output_dir')}
                  />
                </div>
              </div>

              {/* 第四行：当前路径和打开文件夹 */}
              <div className="settings-row">
                <div className="setting-item" style={{ flex: 1 }}>
                  <span className="setting-label">{t('converter.current_path')}</span>
                  <Input
                    value={getCurrentDisplayPath()}
                    readOnly
                    style={{ flex: 1, minWidth: 200 }}
                  />
                  {(hasConverted || outputDirType === 'default') && (
                    <Button
                      type="primary"
                      ghost
                      icon={<FolderViewOutlined />}
                      onClick={handleOpenOutputFolder}
                      className="open-folder-btn"
                    >
                      {t('converter.open_output_folder')}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      <ExportFieldsModal
        open={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        selectedFields={exportFields}
        onConfirm={setExportFields}
      />
    </div>
  );
};

export default VcfToExcel;
