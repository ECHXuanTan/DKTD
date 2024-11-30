import React, { useState, useEffect } from 'react';
import ExcelJS from 'exceljs';
import { Download } from '@mui/icons-material';
import { Circles } from 'react-loader-spinner';
import { getDepartmentTeacherNames } from '../../../../services/teacherService';
import { getDepartmentClassesRemainingLessons } from '../../../../services/statisticsServices';

const ExportTeacherAssignmentTemplate = () => {
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

      validationSheet.addRow(['Teachers', 'Classes', 'RemainingLessons', 'Subject']);
      const teacherCol = validationSheet.getColumn('A');
      teacherCol.values = ['Teachers', ...teachers.map(t => t.name)];
      const teacherRange = `ValidationLists!$A$2:$A$${teachers.length + 1}`;

      let validationRow = 2;
      classes.forEach(c => {
        validationSheet.getCell(`B${validationRow}`).value = c.name;
        validationSheet.getCell(`C${validationRow}`).value = c.remainingLessons;
        validationSheet.getCell(`D${validationRow}`).value = c.subject;
        validationRow++;
      });
      const classRange = `ValidationLists!$B$2:$B$${classes.length + 1}`;

      const headers = ['Tên giáo viên'];
      for (let i = 0; i < 5; i++) {
        headers.push(`Mã lớp ${i + 1}`, 'Số tiết trống', 'Môn học', 'Số tiết');
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
        const row = mainSheet.addRow([]);
        
        for (let j = 0; j < 5; j++) {
          const classCol = 2 + j * 4;
          const remainingCol = classCol + 1;
          const subjectCol = classCol + 2;
          
          const cellRemaining = mainSheet.getCell(`${String.fromCharCode(64 + remainingCol)}${i}`);
          cellRemaining.value = {
            formula: `=IF(ISBLANK(${String.fromCharCode(64 + classCol)}${i}),"",VLOOKUP(${String.fromCharCode(64 + classCol)}${i},ValidationLists!$B$2:$C$${classes.length + 1},2,FALSE))`
          };
          cellRemaining.numFmt = '0';

          const cellSubject = mainSheet.getCell(`${String.fromCharCode(64 + subjectCol)}${i}`);
          cellSubject.value = {
            formula: `=IF(ISBLANK(${String.fromCharCode(64 + classCol)}${i}),"",VLOOKUP(${String.fromCharCode(64 + classCol)}${i},ValidationLists!$B$2:$D$${classes.length + 1},3,FALSE))`
          };
        }
        
        row.eachCell((cell, colNumber) => {
          cell.alignment = {
            vertical: 'middle',
            horizontal: 'center'
          };
        });
      }

      mainSheet.getColumn(1).width = 35;
      for (let i = 0; i < 5; i++) {
        const classCol = mainSheet.getColumn(2 + i * 4);
        const remainingCol = mainSheet.getColumn(3 + i * 4);
        const subjectCol = mainSheet.getColumn(4 + i * 4);
        const lessonCol = mainSheet.getColumn(5 + i * 4);
        classCol.width = 20;
        remainingCol.width = 15;
        subjectCol.width = 20;
        lessonCol.width = 10;
      }

      mainSheet.dataValidations.add('A2:A1000', {
        type: 'list',
        allowBlank: true,
        formulae: [teacherRange],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Lỗi',
        error: 'Vui lòng chọn từ danh sách'
      });

      for (let i = 0; i < 5; i++) {
        const classCol = String.fromCharCode(66 + i * 4);
        const lessonCol = String.fromCharCode(69 + i * 4);

        mainSheet.dataValidations.add(`${classCol}2:${classCol}1000`, {
          type: 'list',
          allowBlank: true,
          formulae: [classRange],
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
      link.download = 'mau_phan_cong_giao_vien.xlsx';
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
        borderRadius: '26px',
        gap: '8px',
        padding: '8px 16px',
        backgroundColor: isLoading ? '#ccc' : '#1976d2',
        color: 'white',
        border: 'none',
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

export default ExportTeacherAssignmentTemplate;