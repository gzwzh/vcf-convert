import React, { useState, useEffect } from 'react';
import { Card, Select, Switch, Button, Tooltip, Input, App } from 'antd';
import { PlayCircleOutlined, SettingOutlined, QuestionCircleOutlined, FolderOpenOutlined, FolderViewOutlined } from '@ant-design/icons';
import type { FileWithStatus } from './FileUploader';
import FileUploader from './FileUploader';
import FieldMappingModal, { FieldMappingResult } from './FieldMappingModal';
import { useAuthCode } from '../contexts/AuthCodeContext';
import { parseTxt, downloadVcf, saveVcfToDir } from '../utils/fileUtils';
import { generateVcf } from '../utils/vcfParser';
import { Contact } from '../types';
import { useTranslation } from '../utils/i18n';
import './ConverterPage.css';

type OutputDirType = 'default' | 'source' | 'custom';

const TxtToVcf: React.FC = () => {
  const { t } = useTranslation();
  const { message, modal } = App.useApp();
  const { checkAuthAndExecute } = useAuthCode();
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [encoding, setEncoding] = useState('UTF-8');
  const [vcardVersion, setVcardVersion] = useState<'2.1' | '3.0' | '4.0'>('3.0');
  const [skipHeader, setSkipHeader] = useState(true);
  const [mergeFiles, setMergeFiles] = useState(false);
  const [converting, setConverting] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [outputDirType, setOutputDirType] = useState<OutputDirType>('default');
  const [customPath, setCustomPath] = useState('');
  const [defaultPath, setDefaultPath] = useState('');
  const [hasConverted, setHasConverted] = useState(false);
  const [fieldMapping, setFieldMapping] = useState<FieldMappingResult>({ headerRowIndex: 1, mapping: {} });

  useEffect(() => {
    const initDefaultPath = async () => {
      if (window.electronAPI) {
        const path = await window.electronAPI.getDefaultOutputDir();
        if (path) setDefaultPath(path);
      }
    };
    initDefaultPath();
  }, []);

  const getCurrentDisplayPath = () => {
    switch (outputDirType) {
      case 'default': return defaultPath || t('converter.dir_types.default');
      case 'source': return t('converter.dir_types.source');
      case 'custom': return customPath || t('converter.dir_types.not_selected');
      default: return '';
    }
  };

  const getOutputDir = async (originFile?: File): Promise<string | null> => {
    if (outputDirType === 'default') return defaultPath || 'default';
    if (outputDirType === 'source' && originFile && window.electronAPI) {
      const filePath = (originFile as any).path;
      if (typeof filePath === 'string' && filePath) {
        return await window.electronAPI.getDirname(filePath);
      }
    }
    if (outputDirType === 'custom' && customPath) return customPath;
    return null;
  };

  const handleSelectCustomPath = async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.selectOutputDir();
      if (path) { setCustomPath(path); setOutputDirType('custom'); }
    } else {
      message.info(t('common.desktop_only'));
    }
  };

  const handleOpenOutputFolder = async () => {
    if (window.electronAPI) {
      let targetPath = 'default';
      if (outputDirType === 'custom' && customPath) targetPath = customPath;
      else if (outputDirType === 'default') targetPath = defaultPath || 'default';
      const result = await window.electronAPI.openFolder(targetPath);
      if (!result.success) message.error(`${t('common.open_folder_fail')}: ${result.error || t('common.unknown_error')}`);
    } else {
      message.info(t('common.desktop_only'));
    }
  };

  const markFileCompleted = (fileUid: string) => {
    setFiles(prevFiles => prevFiles.map(f => f.uid === fileUid ? { ...f, processStatus: 'completed' as const } : f));
  };

  const markAllFilesCompleted = () => {
    setFiles(prevFiles => prevFiles.map(f => ({ ...f, processStatus: 'completed' as const })));
  };

  const handleProcessSingleFile = async (file: FileWithStatus) => {
    const originFile = file.originFileObj;
    if (!originFile) { message.error(t('common.invalid_file')); return; }
    if (outputDirType === 'custom' && !customPath.trim()) {
      message.warning(t('common.select_output_dir_first')); handleSelectCustomPath(); return;
    }

    await checkAuthAndExecute(async () => {
      try {
        const contacts = await parseTxt(originFile, { skipHeader, headerRowIndex: fieldMapping.headerRowIndex, mapping: fieldMapping.mapping, encoding });
        const vcfContent = generateVcf(contacts, vcardVersion);
        const filename = originFile.name.replace(/\.txt$/i, '.vcf');
        if (window.electronAPI) {
          const outputDir = await getOutputDir(originFile);
          if (outputDir) await saveVcfToDir(vcfContent, filename, outputDir);
          else downloadVcf(vcfContent, filename);
        } else {
          downloadVcf(vcfContent, filename);
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
          okText: t('common.ok') 
        });
      } catch (error) {
        message.error(t('common.convert_fail_msg', { error: (error as Error).message }));
      }
    });
  };

  const handleConvert = async () => {
    if (converting) return;
    if (files.length === 0) { message.warning(t('common.no_files')); return; }
    if (outputDirType === 'custom' && !customPath.trim()) {
      message.warning(t('common.select_output_dir_first')); handleSelectCustomPath(); return;
    }

    setConverting(true);
    try {
      await checkAuthAndExecute(async () => {
        try {
          const allContacts: Contact[] = [];
          for (const file of files) {
            const originFile = file.originFileObj;
            if (!originFile) continue;
            const contacts = await parseTxt(originFile, { skipHeader, headerRowIndex: fieldMapping.headerRowIndex, mapping: fieldMapping.mapping, encoding });
            if (mergeFiles) {
              allContacts.push(...contacts);
            } else {
              const vcfContent = generateVcf(contacts, vcardVersion);
              const filename = originFile.name.replace(/\.txt$/i, '.vcf');
              if (window.electronAPI) {
                const outputDir = await getOutputDir(originFile);
                if (outputDir) await saveVcfToDir(vcfContent, filename, outputDir);
                else downloadVcf(vcfContent, filename);
              } else {
                downloadVcf(vcfContent, filename);
              }
            }
          }
          if (mergeFiles && allContacts.length > 0) {
            const vcfContent = generateVcf(allContacts, vcardVersion);
            if (window.electronAPI) {
              const outputDir = await getOutputDir(files[0]?.originFileObj);
              if (outputDir) await saveVcfToDir(vcfContent, 'contacts_merged.vcf', outputDir);
              else downloadVcf(vcfContent, 'contacts_merged.vcf');
            } else {
              downloadVcf(vcfContent, 'contacts_merged.vcf');
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
            okText: t('common.ok') 
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
    if (newFiles.length === 0) setHasConverted(false);
  };

  const isDesktop = !!window.electronAPI;

  return (
    <div className="converter-page">
      <Card className="converter-card" title={t('app.menu.txt_to_vcf')}>
        <FileUploader files={files} onFilesChange={handleFilesChange} accept=".txt" onProcessFile={handleProcessSingleFile} />
        <div className="settings-panel">
          <div className="settings-row">
            <div className="setting-item">
              <span className="setting-label">{t('field_mapping.title')}</span>
              <Button icon={<SettingOutlined />} onClick={() => setSettingsVisible(true)}>{t('field_mapping.config_mapping')}</Button>
            </div>
            <div className="setting-item right-section">
              <Button type="primary" size="large" icon={<PlayCircleOutlined />} onClick={handleConvert} loading={converting} disabled={files.length === 0} className="convert-btn" style={{ width: '100%' }}>{t('common.start_all')}</Button>
            </div>
          </div>
          <div className="settings-row">
            <div className="setting-item">
              <span className="setting-label">{t('converter.file_encoding')}</span>
              <Select value={encoding} onChange={setEncoding} style={{ width: 100 }} options={[{ value: 'system', label: t('converter.system_encoding') }, { value: 'UTF-8', label: 'UTF-8' }, { value: 'GBK', label: 'GBK' }, { value: 'GB2312', label: 'GB2312' }]} />
              <Tooltip title={t('converter.txt_encoding_tip')}><QuestionCircleOutlined className="help-icon" /></Tooltip>
            </div>
            <div className="setting-item">
              <span className="setting-label">{t('converter.vcard_version')}</span>
              <Select value={vcardVersion} onChange={setVcardVersion} style={{ width: 80 }} options={[{ value: '2.1', label: '2.1' }, { value: '3.0', label: '3.0' }, { value: '4.0', label: '4.0' }]} />
              <Tooltip title={t('converter.vcard_version_tip')}><QuestionCircleOutlined className="help-icon" /></Tooltip>
            </div>
            <div className="setting-item right-section">
              <div className="checkbox-group">
                {isDesktop && (
                  <label className="checkbox-item"><Switch size="small" checked={mergeFiles} onChange={setMergeFiles} /><span>{t('converter.merge_files')}</span></label>
                )}
                <label className="checkbox-item"><Switch size="small" checked={skipHeader} onChange={setSkipHeader} /><span>{t('converter.skip_header')}</span></label>
              </div>
            </div>
          </div>
          {isDesktop && (
            <>
              <div className="settings-row">
                <div className="setting-item">
                  <span className="setting-label">{t('converter.output_dir')}</span>
                  <Select value={outputDirType} onChange={(value) => setOutputDirType(value)} style={{ width: 200 }} popupMatchSelectWidth={false} options={[{ value: 'default', label: t('converter.dir_types.default') }, { value: 'custom', label: t('converter.dir_types.custom') }, { value: 'source', label: t('converter.dir_types.source') }]} />
                  <Button icon={<FolderOpenOutlined />} onClick={handleSelectCustomPath} title={t('converter.output_dir')} />
                </div>
              </div>
              <div className="settings-row">
                <div className="setting-item" style={{ flex: 1 }}>
                  <span className="setting-label">{t('converter.current_path')}</span>
                  <Input value={getCurrentDisplayPath()} readOnly style={{ flex: 1, minWidth: 200 }} />
                  {(hasConverted || outputDirType === 'default') && (<Button type="primary" ghost icon={<FolderViewOutlined />} onClick={handleOpenOutputFolder} className="open-folder-btn">{t('converter.open_output_folder')}</Button>)}
                </div>
              </div>
            </>
          )}
        </div>
      </Card>
      <FieldMappingModal open={settingsVisible} onClose={() => setSettingsVisible(false)} onConfirm={(result) => setFieldMapping(result)} fileType="txt" />
    </div>
  );
};

export default TxtToVcf;
