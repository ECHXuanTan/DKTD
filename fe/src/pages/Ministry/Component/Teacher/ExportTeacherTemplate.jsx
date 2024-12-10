import React, { useState, useEffect } from 'react';
import ExcelJS from 'exceljs';
import { Download } from '@mui/icons-material';
import { Circles } from 'react-loader-spinner';
import { getSubject } from '../../../../services/subjectServices';
import { getAllDepartment } from '../../../../services/departmentService';

const ExportTeacherTemplate = () => {
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [subjectsData, departmentsData] = await Promise.all([
        getSubject(),
        getAllDepartment()
      ]);

      const filteredSubjects = subjectsData.filter(subject => 
        !["HT", "PTH", "GVĐT", "HTQT", "VP"].includes(subject.name)
      );
      setSubjects(filteredSubjects);

      const filteredDepartments = departmentsData.filter(dept => 
        dept.name !== "Tổ GVĐT"
      );
      setDepartments(filteredDepartments);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createExcelTemplate = async () => {
    try {
      setIsLoading(true);
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Template');
      const validationSheet = workbook.addWorksheet('ValidationLists');
      validationSheet.state = 'hidden';

      validationSheet.getColumn('A').values = ['Departments', ...departments.map(d => d.name)];
      const departmentRange = `ValidationLists!$A$2:$A$${departments.length + 1}`;

      validationSheet.getColumn('B').values = ['Subjects', ...subjects.map(s => s.name)];
      const subjectRange = `ValidationLists!$B$2:$B$${subjects.length + 1}`;

      validationSheet.getColumn('C').values = ['TeacherTypes', 'Cơ hữu', 'Thỉnh giảng'];
      const typeRange = 'ValidationLists!$C$2:$C$3';

      const headers = [
        'Họ và tên',
        'Email',
        'Số điện thoại',
        'Tổ chuyên môn',
        'Môn học giảng dạy',
        'Hình thức giáo viên',
        'Số tiết dạy một tuần',
        'Số tuần dạy',
        'Số tiết giảm 1 tuần 1',
        'Số tuần giảm 1',
        'Nội dung giảm 1',
        'Số tiết giảm 1 tuần 2',
        'Số tuần giảm 2',
        'Nội dung giảm 2',
        'Số tiết giảm 1 tuần 3',
        'Số tuần giảm 3',
        'Nội dung giảm 3'
      ];

      worksheet.addRow(headers);

      const sampleData = [
        ['Nguyễn Văn A', 'nguyenvana@example.com', '0923456789', 'Tổ Vật lý', 'VẬT LÝ', 'Cơ hữu', '20', '15', '2', '18', 'PTN Lý', '3', '15', 'NCKH', '', '', ''],
        ['Trần Thị B', 'tranthib@example.com', '0987654321', 'Tổ Tiếng Anh', 'TIẾNG ANH', 'Thỉnh giảng', '', '', '', '', '', '', '', '', '', '', '']
      ];
      
      sampleData.forEach(row => worksheet.addRow(row));

      const headerRow = worksheet.getRow(1);
      headerRow.eachCell(cell => {
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

      worksheet.getColumn('A').width = 25;
      worksheet.getColumn('B').width = 30;
      worksheet.getColumn('C').width = 15;
      worksheet.getColumn('D').width = 20;
      worksheet.getColumn('E').width = 20;
      worksheet.getColumn('F').width = 15;
      worksheet.getColumn('G').width = 15;
      worksheet.getColumn('H').width = 15;

      worksheet.dataValidations.add('D2:D1000', {
        type: 'list',
        allowBlank: false,
        formulae: [departmentRange],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Lỗi',
        error: 'Vui lòng chọn từ danh sách'
      });

      worksheet.dataValidations.add('E2:E1000', {
        type: 'list',
        allowBlank: false,
        formulae: [subjectRange],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Lỗi',
        error: 'Vui lòng chọn từ danh sách'
      });

      worksheet.dataValidations.add('F2:F1000', {
        type: 'list',
        allowBlank: false,
        formulae: [typeRange],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Lỗi',
        error: 'Vui lòng chọn từ danh sách'
      });

      const numberColumns = ['G', 'H', 'I', 'J', 'L', 'M', 'O', 'P'];
      numberColumns.forEach(col => {
        worksheet.dataValidations.add(`${col}2:${col}1000`, {
          type: 'whole',
          allowBlank: true,
          operator: 'between',
          formulae: [0, 100],
          showErrorMessage: true,
          errorStyle: 'error',
          errorTitle: 'Lỗi',
          error: 'Vui lòng nhập số từ 0 đến 100'
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'mau_tao_giao_vien.xlsx';
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

export default ExportTeacherTemplate;