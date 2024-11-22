import React, { useState } from 'react';
import { Edit, Save, Close } from '@mui/icons-material';
import styles from '../../../../css/Leader/Components/ExcelPreview.module.css';

const ExcelPreview = ({ data, onDataChange, classes, teachers, onEditStateChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(data);

  if (!data || data.length === 0) return null;

  const headers = Object.keys(data[0]);

  const handleChange = (rowIndex, header, value) => {
    const newData = [...editedData];
    newData[rowIndex][header] = value;
    setEditedData(newData);
  };

  const handleSave = () => {
    onDataChange(editedData);
    setIsEditing(false);
    onEditStateChange(false);
  };

  const handleCancel = () => {
    setEditedData(data);
    setIsEditing(false);
    onEditStateChange(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
    onEditStateChange(true);
  };

  const renderCell = (row, header, rowIndex) => {
    if (!isEditing) {
      return row[header];
    }

    if (header === 'Mã lớp') {
      return (
        <select
          value={row[header]}
          onChange={(e) => handleChange(rowIndex, header, e.target.value)}
          className={styles.select}
        >
          {classes.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      );
    }
    
    if (header.startsWith('Tên giáo viên')) {
      return (
        <select
          value={row[header] || ''}
          onChange={(e) => handleChange(rowIndex, header, e.target.value)}
          className={styles.select}
        >
          <option value="">Chọn giáo viên</option>
          {teachers.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
      );
    }

    if (header.startsWith('Số tiết')) {
      return (
        <input
          type="number"
          value={row[header] || ''}
          onChange={(e) => handleChange(rowIndex, header, parseInt(e.target.value) || '')}
          min="0"
          className={styles.input}
        />
      );
    }

    return row[header];
  };

  return (
    <div className={styles.previewContainer}>
      <div className={styles.previewHeader}>
        <h3 className={styles.previewTitle}>
          {isEditing ? 'Chỉnh sửa dữ liệu' : 'Xem trước dữ liệu'}
        </h3>
        <div className={styles.previewActions}>
          {!isEditing ? (
            <button type="button" onClick={handleEdit} className={styles.actionButton}>
              <Edit style={{ fontSize: 18 }} /> Chỉnh sửa
            </button>
          ) : (
            <>
              <button type="button" onClick={handleSave} className={styles.actionButton}>
                <Save style={{ fontSize: 18 }} /> Lưu
              </button>
              <button type="button" onClick={handleCancel} className={`${styles.actionButton} ${styles.cancelButton}`}>
                <Close style={{ fontSize: 18 }} /> Hủy
              </button>
            </>
          )}
        </div>
      </div>
      <div className={styles.tableWrapper}>
        <table className={styles.previewTable}>
          <thead>
            <tr>
              <th className={styles.indexHeader}>STT</th>
              {headers.map((header, index) => (
                <th key={index} className={header.startsWith('Số tiết') ? styles.numberHeader : ''}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {editedData.slice(0, 5).map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className={styles.indexCell}>{rowIndex + 1}</td>
                {headers.map((header, colIndex) => (
                  <td 
                    key={colIndex} 
                    className={`${styles.editableCell} ${
                      header.startsWith('Số tiết') ? styles.numberCell : 
                      header.startsWith('Tên giáo viên') ? styles.teacherCell : ''
                    }`}
                  >
                    {renderCell(row, header, rowIndex)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editedData.length > 5 && (
        <div className={styles.moreRows}>
          ... và {editedData.length - 5} dòng khác
        </div>
      )}
    </div>
  );
};

export default ExcelPreview;