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

      const workbook = new ExcelJS.Workbook();
      const mainSheet = workbook.addWorksheet('Template');
      const validationSheet = workbook.addWorksheet('ValidationLists');
      validationSheet.state = 'hidden';

      // Add class names and remaining lessons to validation sheet
      validationSheet.addRow(['Classes', 'RemainingLessons']);
      classes.forEach(c => {
        validationSheet.addRow([c.name, c.remainingLessons]);
      });
      const classRange = `ValidationLists!$A$2:$A$${classes.length + 1}`;

      const teacherCol = validationSheet.getColumn('C');
      teacherCol.values = ['Teachers', ...teachers.map(t => t.name)];
      const teacherRange = `ValidationLists!$C$2:$C$${teachers.length + 1}`;

      const headers = ['Mã lớp', 'Số tiết trống'];
      for (let i = 1; i <= 5; i++) {
        headers.push(`Tên giáo viên ${i}`, `Số tiết ${i}`);
      }

      mainSheet.addRow(headers);
      
      // Style the header row
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

      // Add formula for empty lessons and style all cells
      for (let i = 2; i <= 1000; i++) {
        const row = mainSheet.addRow([]);
        
        // Set formula for remaining lessons column
        const cell = mainSheet.getCell(`B${i}`);
        cell.value = {
          formula: `=IF(ISBLANK(A${i}),"",VLOOKUP(A${i},ValidationLists!$A$2:$B$${classes.length + 1},2,FALSE))`
        };
        cell.numFmt = '0';
        
        // Style all cells in the row
        row.eachCell((cell, colNumber) => {
          cell.alignment = {
            vertical: 'middle',
            horizontal: colNumber === 2 ? 'center' : 'left'
          };
        });
      }

      // Set column widths
      mainSheet.getColumn('A').width = 20; // Mã lớp
      mainSheet.getColumn('B').width = 15; // Số tiết trống
      for (let i = 0; i < 5; i++) {
        const teacherCol = mainSheet.getColumn(3 + i * 2);
        const lessonCol = mainSheet.getColumn(4 + i * 2);
        teacherCol.width = 35; // Tên giáo viên
        lessonCol.width = 10; // Số tiết
      }

      // Add data validation for class selection
      mainSheet.dataValidations.add('A2:A1000', {
        type: 'list',
        allowBlank: true,
        formulae: [classRange],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Lỗi',
        error: 'Vui lòng chọn từ danh sách'
      });

      // Add validations for teachers and lesson numbers
      for (let i = 0; i < 5; i++) {
        const teacherCol = String.fromCharCode(67 + i * 2);
        const lessonCol = String.fromCharCode(68 + i * 2);

        mainSheet.dataValidations.add(`${teacherCol}2:${teacherCol}1000`, {
          type: 'list',
          allowBlank: true,
          formulae: [teacherRange],
          showErrorMessage: true,
          errorStyle: 'error',
          errorTitle: 'Lỗi',
          error: 'Vui lòng chọn từ danh sách'
        });

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
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
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