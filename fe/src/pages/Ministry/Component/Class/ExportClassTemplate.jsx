import React, { useState, useEffect } from 'react';
import ExcelJS from 'exceljs';
import { Download } from '@mui/icons-material';
import { Circles } from 'react-loader-spinner';
import { getSubject } from '../../../../services/subjectServices';

const ExportClassTemplate = () => {
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setIsLoading(true);
      const subjectsData = await getSubject();
      const filteredSubjects = subjectsData.filter(subject => 
        !["HT", "PHT", "GVĐT", "HTQT", "VP"].includes(subject.name)
      );
      setSubjects(filteredSubjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createExcelTemplate = async () => {
    try {
      setIsLoading(true);

      if (subjects.length === 0) {
        await fetchSubjects();
        if (subjects.length === 0) {
          throw new Error('Không có dữ liệu môn học để tạo template');
        }
      }

      const workbook = new ExcelJS.Workbook();
      const mainSheet = workbook.addWorksheet('Template');
      const validationSheet = workbook.addWorksheet('ValidationLists');
      validationSheet.state = 'hidden';

      // Add subjects to validation sheet
      validationSheet.getColumn('A').values = ['Subjects', ...subjects.map(s => s.name)];
      const subjectRange = `ValidationLists!$A$2:$A$${subjects.length + 1}`;

      // Add campus list to validation sheet
      validationSheet.getColumn('B').values = ['Campus', 'Quận 5', 'Thủ Đức'];
      const campusRange = 'ValidationLists!$B$2:$B$3';

      // Add grade list to validation sheet
      validationSheet.getColumn('C').values = ['Grade', '10', '11', '12'];
      const gradeRange = 'ValidationLists!$C$2:$C$4';

      const headers = ['Tên lớp', 'Khối', 'Sĩ số', 'Cơ sở', 'Môn học', 'Số tiết/tuần', 'Số tuần'];
      mainSheet.addRow(headers);

      // Style header row
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

      // Add sample data
      const sampleData = [
        ['10 ANH TEST', '10', '40', 'Quận 5', 'TOÁN', '3', '15'],
        ['10 ANH TEST', '10', '40', 'Quận 5', 'NGỮ VĂN', '2', '20'],
        ['10 ANH TEST', '10', '40', 'Quận 5', 'TIẾNG ANH', '3', '15'],
        ['11 SINH TEST', '11', '45', 'Thủ Đức', 'SINH HỌC', '2', '15'],
        ['11 SINH TEST', '11', '45', 'Thủ Đức', 'HÓA HỌC', '2', '15']
      ];

      sampleData.forEach(row => mainSheet.addRow(row));

      // Style all cells and add validations
      for (let i = 2; i <= 1000; i++) {
        const row = mainSheet.getRow(i);
        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
      }

      // Set column widths
      mainSheet.getColumn('A').width = 20; // Tên lớp
      mainSheet.getColumn('B').width = 10; // Khối
      mainSheet.getColumn('C').width = 10; // Sĩ số
      mainSheet.getColumn('D').width = 15; // Cơ sở
      mainSheet.getColumn('E').width = 25; // Môn học
      mainSheet.getColumn('F').width = 15; // Số tiết/tuần
      mainSheet.getColumn('G').width = 10; // Số tuần

      // Add data validations
      mainSheet.dataValidations.add('B2:B1000', {
        type: 'list',
        allowBlank: false,
        formulae: [gradeRange],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Lỗi',
        error: 'Vui lòng chọn từ danh sách'
      });

      mainSheet.dataValidations.add('D2:D1000', {
        type: 'list',
        allowBlank: false,
        formulae: [campusRange],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Lỗi',
        error: 'Vui lòng chọn từ danh sách'
      });

      mainSheet.dataValidations.add('E2:E1000', {
        type: 'list',
        allowBlank: false,
        formulae: [subjectRange],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Lỗi',
        error: 'Vui lòng chọn từ danh sách'
      });

      // Add number validations
      mainSheet.dataValidations.add('C2:C1000', {
        type: 'whole',
        allowBlank: false,
        operator: 'between',
        formulae: [1, 100],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Lỗi',
        error: 'Vui lòng nhập số từ 1 đến 100'
      });

      mainSheet.dataValidations.add('F2:G1000', {
        type: 'whole',
        allowBlank: false,
        operator: 'between',
        formulae: [1, 50],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Lỗi',
        error: 'Vui lòng nhập số từ 1 đến 50'
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'mau_tao_lop.xlsx';
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
          <Download style={{ fontSize: 20 }} /> Tải xuống mẫu Excel
        </>
      )}
    </button>
  );
};

export default ExportClassTemplate;