import React, { useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import * as XLSX from 'xlsx';
import { exportDepartmentTeachers } from '../../../../services/statisticsServices';

const ExportDepartmentTeachersExcel = () => {
  const [isLoading, setIsLoading] = useState(false);

  const getLastName = (fullName) => {
    const nameParts = fullName.trim().split(' ');
    return nameParts[nameParts.length - 1];
  };

  const prepareTeacherRows = (teachers) => {
    let rows = [];
    let totals = {
      kcCs1: 0,
      chCs1: 0,
      kcCs2: 0,
      chCs2: 0
    };

    teachers.forEach((teacher) => {
      if (teacher.assignments && teacher.assignments.length > 0) {
        teacher.assignments.forEach((assignment) => {
          let kcCs1 = '', chCs1 = '', kcCs2 = '', chCs2 = '';

          if (assignment.campus === "Quận 5") {
            if (assignment.isSpecialized) {
              chCs1 = assignment.completedLessons;
              totals.chCs1 += assignment.completedLessons;
            } else {
              kcCs1 = assignment.completedLessons;
              totals.kcCs1 += assignment.completedLessons;
            }
          } else if (assignment.campus === "Thủ Đức") {
            if (assignment.isSpecialized) {
              chCs2 = assignment.completedLessons;
              totals.chCs2 += assignment.completedLessons;
            } else {
              kcCs2 = assignment.completedLessons;
              totals.kcCs2 += assignment.completedLessons;
            }
          }

          rows.push({
            STT: rows.length + 1,
            'Họ và tên': teacher.name,
            'Tên': getLastName(teacher.name),
            'Số lớp': teacher.assignments.length,
            'Hình thức Giáo viên': teacher.type,
            'KC CS1': kcCs1,
            'Ch CS1': chCs1,
            'KC CS2': kcCs2,
            'Ch CS2': chCs2,
            'Bộ môn': teacher.departmentName || '',
            'Môn': assignment.subject.name,
            'Lớp': assignment.class.name,
            'Sĩ số': assignment.class.size,
            'Ch/KC': assignment.isSpecialized ? 'Ch' : 'KC',
            'Ghi chú': ''
          });
        });
      }
    });

    return { rows, totals };
  };

  const handleExport = async () => {
    try {
      setIsLoading(true);
      const response = await exportDepartmentTeachers();
      const teachers = response.teachers;
      
      const { rows, totals } = prepareTeacherRows(teachers);
      
      const worksheet = XLSX.utils.json_to_sheet([], { skipHeader: true });

      XLSX.utils.sheet_add_aoa(worksheet, [
        ['STT', 'Họ và tên', 'Tên', 'Số lớp', 'Hình thức Giáo viên', 'Trong học kỳ 1_18 tuần', '', '', '', 'Bộ môn', 'Môn', 'Lớp', 'Sĩ số', 'Ch/KC', 'Ghi chú'],
        ['', '', '', '', '', 'KC CS1', 'Ch CS1', 'KC CS2', 'Ch CS2', '', '', '', '', '', ''],
        ['', '', '', '', '', totals.kcCs1, totals.chCs1, totals.kcCs2, totals.chCs2, '', '', '', '', '', '']
      ], { origin: 'A1' });

      XLSX.utils.sheet_add_json(worksheet, rows, { origin: 'A4', skipHeader: true });

      worksheet['!merges'] = [
        { s: { r: 0, c: 5 }, e: { r: 0, c: 8 } },
        { s: { r: 0, c: 0 }, e: { r: 2, c: 0 } },
        { s: { r: 0, c: 1 }, e: { r: 2, c: 1 } },
        { s: { r: 0, c: 2 }, e: { r: 2, c: 2 } },
        { s: { r: 0, c: 3 }, e: { r: 2, c: 3 } },
        { s: { r: 0, c: 4 }, e: { r: 2, c: 4 } },
        { s: { r: 0, c: 9 }, e: { r: 2, c: 9 } },
        { s: { r: 0, c: 10 }, e: { r: 2, c: 10 } },
        { s: { r: 0, c: 11 }, e: { r: 2, c: 11 } },
        { s: { r: 0, c: 12 }, e: { r: 2, c: 12 } },
        { s: { r: 0, c: 13 }, e: { r: 2, c: 13 } },
        { s: { r: 0, c: 14 }, e: { r: 2, c: 14 } }
      ];

      const colWidths = {
        A: 5,
        B: 25,
        C: 15,
        D: 8,
        E: 15,
        F: 10,
        G: 10,
        H: 10,
        I: 10,
        J: 15,
        K: 20,
        L: 12,
        M: 8,
        N: 8,
        O: 15
      };

      worksheet['!cols'] = Object.keys(colWidths).map(key => ({ wch: colWidths[key] }));

      const range = XLSX.utils.decode_range(worksheet['!ref']);
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell_address = { c: C, r: R };
          const cell_ref = XLSX.utils.encode_cell(cell_address);
          if (!worksheet[cell_ref]) continue;
          if (!worksheet[cell_ref].s) worksheet[cell_ref].s = {};
          worksheet[cell_ref].s.font = { name: 'Times New Roman' };
        }
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Department Teachers');
      XLSX.writeFile(workbook, 'Tính_giờ_dạy_theo_tổ.xlsx');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="contained" 
      onClick={handleExport}
      disabled={isLoading}
      startIcon={isLoading ? <CircularProgress size={20} /> : <CloudDownloadIcon />}
      style={{ borderRadius: '26px', fontWeight: 'bold', marginRight: '10px', backgroundColor: '#d98236' }}
    >
      {isLoading ? 'Đang tải file' : 'Tải kết quả'}
    </Button>
  );
};

export default ExportDepartmentTeachersExcel;