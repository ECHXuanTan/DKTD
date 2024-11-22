import React, { useState, useEffect } from 'react';
import ExcelJS from 'exceljs';
import { Download } from '@mui/icons-material';
import { Circles } from 'react-loader-spinner';
import { getDepartmentTeacherNames } from '../../../../services/teacherService';
import { getDepartmentClassesRemainingLessons } from '../../../../services/statisticsServices';

const ExportAssignmentTemplate = () => {
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [teachersResponse, classesResponse] = await Promise.all([
        getDepartmentTeacherNames(),
        getDepartmentClassesRemainingLessons()
      ]);

      if (teachersResponse.success && teachersResponse.data) {
        setTeachers(teachersResponse.data);
      }

      if (Array.isArray(classesResponse)) {
        setClasses(classesResponse);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createExcelTemplate = async () => {
    try {
      setIsLoading(true);

      if (teachers.length === 0 || classes.length === 0) {
        await fetchData();
        if (teachers.length === 0 || classes.length === 0) {
          throw new Error('Không có dữ liệu để tạo template');
        }
      }

      const classNames = classes.map(c => c.name);
      const teacherNames = teachers.map(t => t.name);

      const workbook = new ExcelJS.Workbook();
      const mainSheet = workbook.addWorksheet('Template');
      const validationSheet = workbook.addWorksheet('ValidationLists');
      validationSheet.state = 'hidden';

      validationSheet.addRow(['Classes']);
      classes.forEach(c => validationSheet.addRow([`${c.name} (${c.remainingLessons} tiết trống)`]));
      const classRange = `ValidationLists!$A$2:$A$${classes.length + 1}`;

      const teacherCol = validationSheet.getColumn('B');
      teacherCol.values = ['Teachers', ...teacherNames];
      const teacherRange = `ValidationLists!$B$2:$B$${teacherNames.length + 1}`;

      const headers = ['Mã lớp'];
      for (let i = 1; i <= 5; i++) {
        headers.push(`Tên giáo viên ${i}`, `Số tiết ${i}`);
      }

      mainSheet.addRow(headers);
      
      const headerRow = mainSheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4472C4' }
        };
        cell.font = {
          bold: true,
          color: { argb: 'FFFFFF' }
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true
        };
      });

      for (let i = 2; i <= 1000; i++) {
        mainSheet.addRow([]);
      }

      headers.forEach((header, index) => {
        const col = mainSheet.getColumn(index + 1);
        if (header.includes('Số tiết')) {
          col.width = 10;
        } else if (header === 'Mã lớp') {
          col.width = 40;
        } else {
          col.width = 35;
        }
      });

      mainSheet.dataValidations.add('A2:A1000', {
        type: 'list',
        allowBlank: true,
        formulae: [classRange],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Lỗi',
        error: 'Vui lòng chọn từ danh sách'
      });

      for (let i = 0; i < 5; i++) {
        const col = String.fromCharCode(66 + i * 2);
        mainSheet.dataValidations.add(`${col}2:${col}1000`, {
          type: 'list',
          allowBlank: true,
          formulae: [teacherRange],
          showErrorMessage: true,
          errorStyle: 'error',
          errorTitle: 'Lỗi',
          error: 'Vui lòng chọn từ danh sách'
        });

        const lessonCol = String.fromCharCode(67 + i * 2);
        mainSheet.dataValidations.add(`${lessonCol}2:${lessonCol}1000`, {
          type: 'whole',
          allowBlank: true,
          operator: 'greaterThanOrEqual',
          formulae: [0],
          showErrorMessage: true,
          errorStyle: 'error',
          errorTitle: 'Lỗi',
          error: 'Vui lòng nhập số nguyên không âm'
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'mau_phan_cong.xlsx';
      link.click();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error creating Excel:', error);
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={createExcelTemplate}
      disabled={isLoading}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        backgroundColor: isLoading ? '#ccc' : '#1976d2',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        fontWeight: 500,
        transition: 'background-color 0.2s',
      }}
      onMouseOver={e => !isLoading && (e.currentTarget.style.backgroundColor = '#1565c0')}
      onMouseOut={e => !isLoading && (e.currentTarget.style.backgroundColor = '#1976d2')}
    >
      {isLoading ? (
        <Circles color="#ffffff" height={20} width={20} />
      ) : (
        <>
          <Download style={{ fontSize: 20 }} /> Tải mẫu Excel
        </>
      )}
    </button>
  );
};

export default ExportAssignmentTemplate;