import React, { useState, useEffect } from 'react';
import { Modal, Checkbox, Button, Row, Col } from 'antd';
import { useTranslation } from '../utils/i18n';
import './ExportFieldsModal.css';

interface ExportFieldsModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedFields: string[]) => void;
  selectedFields: string[]; // 改为从父组件传入
}

const ExportFieldsModal: React.FC<ExportFieldsModalProps> = ({
  open,
  onClose,
  onConfirm,
  selectedFields: initialSelectedFields,
}) => {
  const { t } = useTranslation();

  const allFields = [
    { key: 'fullName', label: t('export_fields.fields.fullName') },
    { key: 'lastName', label: t('export_fields.fields.lastName') },
    { key: 'firstName', label: t('export_fields.fields.firstName') },
    { key: 'phone', label: t('export_fields.fields.phone') },
    { key: 'cellPhone', label: t('export_fields.fields.cellPhone') },
    { key: 'workPhone', label: t('export_fields.fields.workPhone') },
    { key: 'homePhone', label: t('export_fields.fields.home_phone') },
    { key: 'email', label: t('export_fields.fields.email') },
    { key: 'organization', label: t('export_fields.fields.organization') },
    { key: 'title', label: t('export_fields.fields.title') },
    { key: 'address', label: t('export_fields.fields.address') },
    { key: 'url', label: t('export_fields.fields.url') },
    { key: 'note', label: t('export_fields.fields.note') },
    { key: 'birthday', label: t('export_fields.fields.birthday') },
    { key: 'nickname', label: t('export_fields.fields.nickname') },
    { key: 'msn', label: t('export_fields.fields.msn') },
    { key: 'yahoo', label: t('export_fields.fields.yahoo') },
    { key: 'skype', label: t('export_fields.fields.skype') },
    { key: 'qq', label: t('export_fields.fields.qq') },
    { key: 'googleTalk', label: t('export_fields.fields.googleTalk') },
    { key: 'icq', label: t('export_fields.fields.icq') },
  ];

  const [selectedFields, setSelectedFields] = useState<string[]>(initialSelectedFields);

  useEffect(() => {
    setSelectedFields(initialSelectedFields);
  }, [initialSelectedFields]);

  const handleCheckChange = (key: string, checked: boolean) => {
    if (checked) {
      // 按照 allFields 的顺序添加
      const newFields = [...selectedFields, key];
      const orderedFields = allFields
        .filter(f => newFields.includes(f.key))
        .map(f => f.key);
      setSelectedFields(orderedFields);
    } else {
      setSelectedFields(selectedFields.filter(f => f !== key));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFields(allFields.map(f => f.key));
    } else {
      setSelectedFields([]);
    }
  };

  const isAllSelected = selectedFields.length === allFields.length;
  const isIndeterminate = selectedFields.length > 0 && selectedFields.length < allFields.length;

  const handleConfirm = () => {
    onConfirm(selectedFields);
    onClose();
  };

  return (
    <Modal
      title={t('export_fields.title')}
      open={open}
      onCancel={onClose}
      footer={null}
      width={550}
      className="export-fields-modal"
    >
      <div className="fields-grid">
        <Row gutter={[16, 12]}>
          {allFields.map(field => (
            <Col span={12} md={6} key={field.key}>
              <Checkbox
                checked={selectedFields.includes(field.key)}
                onChange={(e) => handleCheckChange(field.key, e.target.checked)}
              >
                {field.label}
              </Checkbox>
            </Col>
          ))}
        </Row>
      </div>
      
      <div className="modal-footer">
        <Checkbox
          checked={isAllSelected}
          indeterminate={isIndeterminate}
          onChange={(e) => handleSelectAll(e.target.checked)}
        >
          {t('export_fields.select_all')}
        </Checkbox>
        <Button type="primary" onClick={handleConfirm}>
          {t('common.ok')}
        </Button>
      </div>
    </Modal>
  );
};

export default ExportFieldsModal;
