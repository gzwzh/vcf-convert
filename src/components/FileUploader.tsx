import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Button, Space, Table, Grid, Upload } from 'antd';

const { useBreakpoint } = Grid;
import {
  UploadOutlined,
  FolderOpenOutlined,
  InboxOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from '../utils/i18n';
import './FileUploader.css';

export interface FileWithStatus extends UploadFile {
  processStatus?: 'pending' | 'completed';
}

interface FileUploaderProps {
  files: FileWithStatus[];
  onFilesChange: (files: FileWithStatus[]) => void;
  accept: string;
  onProcessFile?: (file: FileWithStatus) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  files,
  onFilesChange,
  accept,
  onProcessFile,
}) => {
  const { t } = useTranslation();
  const uploadTriggerRef = useRef<HTMLSpanElement | null>(null);

  const tableBodyRef = useRef<HTMLDivElement | null>(null);
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const [thumbHeight, setThumbHeight] = useState(50);
  const [thumbTop, setThumbTop] = useState(0);
  const [isDraggingThumb, setIsDraggingThumb] = useState(false);
  const [canScroll, setCanScroll] = useState(false);
  const dragStartY = useRef(0);
  const dragStartTop = useRef(0);

  const getAcceptedExtensions = useCallback(() => {
    return accept.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  }, [accept]);

  const isFileAccepted = useCallback((fileName: string) => {
    const accepted = getAcceptedExtensions();
    return accepted.length === 0 || accepted.some((ext) => fileName.toLowerCase().endsWith(ext));
  }, [getAcceptedExtensions]);

  const appendFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const acceptedFiles = fileArray.filter((f) => isFileAccepted(f.name));
    if (acceptedFiles.length === 0) return;

    const newUploadFiles: FileWithStatus[] = acceptedFiles.map((file, index) => ({
      uid: `file-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 11)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      originFileObj: file as any,
      status: 'done' as const,
      processStatus: 'pending' as const,
    }));

    onFilesChange([...files, ...newUploadFiles]);
  }, [files, isFileAccepted, onFilesChange]);

  const updateScrollbar = useCallback(() => {
    const tableBody = tableBodyRef.current;
    const track = scrollbarRef.current?.querySelector('.scrollbar-track') as HTMLElement | null;
    if (!tableBody || !track) return;

    const { scrollHeight, clientHeight, scrollTop } = tableBody;
    const trackHeight = track.clientHeight;

    if (scrollHeight <= clientHeight) {
      setCanScroll(false);
      return;
    }

    setCanScroll(true);
    const ratio = clientHeight / scrollHeight;
    const nextThumbHeight = Math.max(30, trackHeight * ratio);
    const maxThumbTop = trackHeight - nextThumbHeight;
    const scrollRatio = scrollTop / (scrollHeight - clientHeight);
    const nextThumbTop = maxThumbTop * scrollRatio;

    setThumbHeight(nextThumbHeight);
    setThumbTop(nextThumbTop);
  }, []);

  useEffect(() => {
    const findTableBody = () => {
      const container = document.querySelector('.file-table-container .ant-table-body');
      if (container) {
        tableBodyRef.current = container as HTMLDivElement;
        container.addEventListener('scroll', updateScrollbar);
        updateScrollbar();
      }
    };

    const timer = setTimeout(findTableBody, 100);
    return () => {
      clearTimeout(timer);
      if (tableBodyRef.current) {
        tableBodyRef.current.removeEventListener('scroll', updateScrollbar);
      }
    };
  }, [files.length, updateScrollbar]);

  useEffect(() => {
    window.addEventListener('resize', updateScrollbar);
    return () => window.removeEventListener('resize', updateScrollbar);
  }, [updateScrollbar]);

  const handleThumbMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingThumb(true);
    dragStartY.current = e.clientY;
    dragStartTop.current = thumbTop;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingThumb) return;
      const tableBody = tableBodyRef.current;
      const track = scrollbarRef.current?.querySelector('.scrollbar-track') as HTMLElement | null;
      if (!tableBody || !track) return;

      const deltaY = e.clientY - dragStartY.current;
      const trackHeight = track.clientHeight;
      const maxThumbTop = trackHeight - thumbHeight;
      const nextThumbTop = Math.max(0, Math.min(maxThumbTop, dragStartTop.current + deltaY));

      const scrollRatio = nextThumbTop / maxThumbTop;
      const { scrollHeight, clientHeight } = tableBody;
      tableBody.scrollTop = scrollRatio * (scrollHeight - clientHeight);
    };

    const handleMouseUp = () => {
      setIsDraggingThumb(false);
    };

    if (isDraggingThumb) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingThumb, thumbHeight]);

  const handleTrackClick = (e: React.MouseEvent) => {
    if (e.target === thumbRef.current) return;
    const tableBody = tableBodyRef.current;
    const track = scrollbarRef.current?.querySelector('.scrollbar-track') as HTMLElement | null;
    if (!tableBody || !track) return;

    const rect = track.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const trackHeight = track.clientHeight;
    const scrollRatio = clickY / trackHeight;
    const { scrollHeight, clientHeight } = tableBody;
    tableBody.scrollTop = scrollRatio * (scrollHeight - clientHeight);
  };

  const handleUploadSelection = (_file: File, fileList: File[]) => {
    appendFiles(fileList);
    return false;
  };

  const handleRemove = (file: FileWithStatus) => {
    onFilesChange(files.filter((f) => f.uid !== file.uid));
  };

  const handleClearAll = () => onFilesChange([]);

  const handleProcess = (file: FileWithStatus) => {
    if (onProcessFile) onProcessFile(file);
  };

  const formatFileSize = (size?: number) => {
    if (!size) return '-';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  const isMobile = !useBreakpoint().md;

  const emptyHint = t('uploader.click_above');

  const columns: ColumnsType<FileWithStatus> = [
    { title: t('uploader.column_file_name'), dataIndex: 'name', key: 'name', ellipsis: true },
    {
      title: t('uploader.column_size'),
      dataIndex: 'size',
      key: 'size',
      width: isMobile ? 70 : 90,
      render: (size: number) => formatFileSize(size),
    },
    {
      title: t('uploader.column_status'),
      key: 'status',
      width: isMobile ? 40 : 85,
      render: (_, record) => {
        const isCompleted = record.processStatus === 'completed';
        return (
          <span className={`status-cell ${isCompleted ? 'status-completed' : 'status-pending'}`}>
            {isCompleted ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
            {!isMobile && (isCompleted ? ` ${t('uploader.status_completed')}` : ` ${t('uploader.status_pending')}`)}
          </span>
        );
      },
    },
    {
      title: t('uploader.column_action'),
      key: 'action',
      width: isMobile ? 80 : 90,
      align: 'center',
      render: (_, record) => (
        <Space size={isMobile ? 'small' : 'middle'}>
          {record.processStatus === 'pending' && (
            <Button
              type="text"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleProcess(record)}
              title={t('uploader.action_convert')}
            />
          )}
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleRemove(record)}
            title={t('uploader.action_remove')}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="file-uploader">
      <div className="uploader-header">
        <Space>
          <Upload
            accept={accept}
            multiple
            showUploadList={false}
            beforeUpload={handleUploadSelection}
            fileList={[]}
          >
            <span ref={uploadTriggerRef}>
              <Button icon={<UploadOutlined />} type="primary">
                {t('uploader.add_file')}
              </Button>
            </span>
          </Upload>
          {!isMobile && (window as any).electronAPI && (
            <Upload
              accept={accept}
              multiple
              directory
              showUploadList={false}
              beforeUpload={handleUploadSelection}
              fileList={[]}
            >
              <Button icon={<FolderOpenOutlined />}>
                {t('uploader.add_folder')}
              </Button>
            </Upload>
          )}
        </Space>
        {files.length > 0 && (
          <Button type="link" danger icon={<DeleteOutlined />} onClick={handleClearAll}>
            {t('uploader.clear_all')}
          </Button>
        )}
      </div>

      <div className="upload-area">
        {files.length === 0 ? (
          <Upload
            accept={accept}
            multiple
            showUploadList={false}
            beforeUpload={handleUploadSelection}
            fileList={[]}
            className="upload-empty-trigger"
          >
            <div className="upload-empty-state clickable" role="button" tabIndex={0}>
              <InboxOutlined className="upload-empty-icon" />
              <p className="upload-empty-title">{t('uploader.add_file')}</p>
              <p className="upload-empty-text">{emptyHint}</p>
            </div>
          </Upload>
        ) : (
          <div className="file-table-container">
            <div className="custom-scrollbar-container">
              <div className="table-wrapper">
                <Table
                  columns={columns}
                  dataSource={files}
                  pagination={false}
                  size="small"
                  scroll={{ y: 240 }}
                  rowKey="uid"
                  className="file-table"
                />
              </div>
              <div className="custom-scrollbar" ref={scrollbarRef} onClick={handleTrackClick}>
                <div className="scrollbar-track">
                  {canScroll && (
                    <div
                      ref={thumbRef}
                      className={`scrollbar-thumb ${isDraggingThumb ? 'dragging' : ''}`}
                      style={{ height: thumbHeight, top: thumbTop }}
                      onMouseDown={handleThumbMouseDown}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploader;






