import React, { useState } from 'react';
import { Edit, Save, Close } from '@mui/icons-material';
import styles from '../../../../css/Leader/Components/ExcelPreview.module.css';

const TeacherExcelPreview = ({ data, onDataChange, classes, teachers, onEditStateChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(data);

  if (!data || data.length === 0) return null;

  const headers = Object.keys(data[0]);

  const getRemainingLessons = (className) => {
    const classData = classes.find(c => c.name === className);
    if (!classData) return 0;

    const remainingSubjects = classData.subjects.filter(s => {
      const totalAssigned = s.assignments?.reduce((sum, a) => sum + a.completedLessons, 0) || 0;
      return s.lessonCount > totalAssigned;
    });

    if (remainingSubjects.length === 0) return 0;

    const subjectData = remainingSubjects[0];
    const totalAssignedLessons = subjectData.assignments?.reduce((sum, a) => sum + a.completedLessons, 0) || 0;
    return subjectData.lessonCount - totalAssignedLessons;
  };

  const calculateTotalLessons = (row) => {
    return Object.keys(row)
      .filter(key => key.startsWith('Số tiết'))
      .reduce((sum, key) => sum + (parseInt(row[key]) || 0), 0);
  };

  const handleChange = (rowIndex, header, value) => {
    const newData = [...editedData];
    const row = { ...newData[rowIndex] };
    const prefix = header.startsWith('Mã lớp') ? 'Mã lớp' : header.startsWith('Số tiết') ? 'Số tiết' : null;
    
    if (prefix) {
      const position = parseInt(header.replace(prefix, ''));
      
      if (prefix === 'Mã lớp') {
        row[header] = value;
        row[`Số tiết ${position}`] = 0;
      } else {
        const className = row[`Mã lớp ${position}`];
        if (className) {
          const newValue = parseInt(value) || 0;
          const remainingLessons = getRemainingLessons(className);
          
          const otherPositions = Object.keys(row)
            .filter(key => key.startsWith('Số tiết') && key !== `Số tiết ${position}`)
            .reduce((acc, key) => {
              const pos = parseInt(key.replace('Số tiết ', ''));
              if (row[`Mã lớp ${pos}`] === className) {
                acc += (parseInt(row[key]) || 0);
              }
              return acc;
            }, 0);

          if (newValue + otherPositions <= remainingLessons) {
            row[header] = newValue;
          }
        }
      }
    } else {
      row[header] = value;
    }

    newData[rowIndex] = row;
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
      if (header.startsWith('Số tiết')) {
        return row[header] || 0;
      }
      return row[header] || '';
    }

    if (header.startsWith('Mã lớp')) {
      return (
        <select
          value={row[header] || ''}
          onChange={(e) => handleChange(rowIndex, header, e.target.value)}
          className={styles.select}
        >
          <option value="">Chọn lớp</option>
          {classes.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      );
    }

    if (header.startsWith('Số tiết')) {
      const position = parseInt(header.replace('Số tiết ', ''));
      const className = row[`Mã lớp ${position}`];
      if (!className) return '';

      const remainingLessons = getRemainingLessons(className);
      const currentValue = parseInt(row[header]) || 0;
      const otherPositions = Object.keys(row)
        .filter(key => key.startsWith('Số tiết') && key !== header)
        .reduce((acc, key) => {
          const pos = parseInt(key.replace('Số tiết ', ''));
          if (row[`Mã lớp ${pos}`] === className) {
            acc += (parseInt(row[key]) || 0);
          }
          return acc;
        }, 0);

      const maxValue = remainingLessons - otherPositions + currentValue;

      return (
        <input
          type="number"
          value={row[header] || ''}
          onChange={(e) => handleChange(rowIndex, header, e.target.value)}
          min="0"
          max={maxValue}
          disabled={!className}
          className={styles.input}
        />
      );
    }

    if (header === 'Tên giáo viên') {
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

    return row[header] || '';
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
            {editedData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className={styles.indexCell}>{rowIndex + 1}</td>
                {headers.map((header, colIndex) => (
                  <td 
                    key={colIndex}
                    className={`${styles.editableCell} ${
                      header.startsWith('Số tiết') ? styles.numberCell : 
                      header === 'Tên giáo viên' ? styles.teacherCell :
                      header.startsWith('Mã lớp') ? styles.classCell : ''
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
    </div>
  );
};

export default TeacherExcelPreview;