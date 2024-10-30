import React, { useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import * as XLSX from 'xlsx';
import { getTeacherDetails } from '../../../../services/statisticsServices';

const ExportTeachersClassExcel = () => {
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
      chCs2: 0,
      weeklyKcCs1: 0,
      weeklyChCs1: 0,
      weeklyKcCs2: 0,
      weeklyChCs2: 0
    };

    teachers.forEach((teacher) => {
      if (teacher.assignments && teacher.assignments.length > 0) {
        teacher.assignments.forEach((assignment) => {
          let kcCs1 = '', chCs1 = '', kcCs2 = '', chCs2 = '';
          let weeklyKcCs1 = '', weeklyChCs1 = '', weeklyKcCs2 = '', weeklyChCs2 = '';

          if (assignment.class.campus === "Quận 5") {
            if (assignment.subject.isSpecialized) {
              chCs1 = assignment.completedLessons;
              weeklyChCs1 = assignment.lessonsPerWeek;
              totals.chCs1 += assignment.completedLessons;
              totals.weeklyChCs1 += assignment.lessonsPerWeek;
            } else {
              kcCs1 = assignment.completedLessons;
              weeklyKcCs1 = assignment.lessonsPerWeek;
              totals.kcCs1 += assignment.completedLessons;
              totals.weeklyKcCs1 += assignment.lessonsPerWeek;
            }
          } else if (assignment.class.campus === "Thủ Đức") {
            if (assignment.subject.isSpecialized) {
              chCs2 = assignment.completedLessons;
              weeklyChCs2 = assignment.lessonsPerWeek;
              totals.chCs2 += assignment.completedLessons;
              totals.weeklyChCs2 += assignment.lessonsPerWeek;
            } else {
              kcCs2 = assignment.completedLessons;
              weeklyKcCs2 = assignment.lessonsPerWeek;
              totals.kcCs2 += assignment.completedLessons;
              totals.weeklyKcCs2 += assignment.lessonsPerWeek;
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
            'Bộ môn': teacher.teachingSubjects || '',
            'Môn': assignment.subject.name,
            'Lớp': assignment.class.name,
            'Sĩ số': assignment.class.size,
            'Ch/KC': assignment.subject.isSpecialized ? 'Ch' : 'KC',
            'Cơ sở': assignment.class.campus === "Quận 5" ? 1 : 2,
            'KC CS1 tuần': weeklyKcCs1,
            'Ch CS1 tuần': weeklyChCs1,
            'KC CS2 tuần': weeklyKcCs2,
            'Ch CS2 tuần': weeklyChCs2,
            'Số tuần HK1': assignment.numberOfWeeks,
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
      const response = await getTeacherDetails();
      const teachers = response.teachers;
      
      const { rows, totals } = prepareTeacherRows(teachers);
      
      const worksheet = XLSX.utils.json_to_sheet([], { skipHeader: true });

      XLSX.utils.sheet_add_aoa(worksheet, [
        ['STT', 'Họ và tên', 'Tên', 'Số lớp', 'Hình thức Giáo viên', 'Trong học kỳ 1_18 tuần', '', '', '', 'Bộ môn', 'Môn', 'Lớp', 'Sĩ số', 'Ch/KC', 'Cơ sở', 'Trong 1 tuần', '', '', '', 'Số tuần HK1', 'Ghi chú'],
        ['', '', '', '', '', 'KC CS1', 'Ch CS1', 'KC CS2', 'Ch CS2', '', '', '', '', '', '', 'KC CS1', 'Ch CS1', 'KC CS2', 'Ch CS2', '', ''],
        ['', '', '', '', '', totals.kcCs1, totals.chCs1, totals.kcCs2, totals.chCs2, '', '', '', '', '', '', totals.weeklyKcCs1, totals.weeklyChCs1, totals.weeklyKcCs2, totals.weeklyChCs2, '', '']
      ], { origin: 'A1' });

      XLSX.utils.sheet_add_json(worksheet, rows, { origin: 'A4', skipHeader: true });

      worksheet['!merges'] = [
        { s: { r: 0, c: 5 }, e: { r: 0, c: 8 } },
        { s: { r: 0, c: 15 }, e: { r: 0, c: 18 } },
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
        { s: { r: 0, c: 14 }, e: { r: 2, c: 14 } },
        { s: { r: 0, c: 19 }, e: { r: 2, c: 19 } },
        { s: { r: 0, c: 20 }, e: { r: 2, c: 20 } }
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
        O: 8,
        P: 10,
        Q: 10,
        R: 10,
        S: 10,
        T: 12,
        U: 15
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
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Teachers Statistics');
      XLSX.writeFile(workbook, 'Tính_giờ_dạy_theo_lớp.xlsx');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="contained" 
      color="primary" 
      onClick={handleExport}
      disabled={isLoading}
      startIcon={isLoading ? <CircularProgress size={20} /> : null}
      style={{borderRadius: '26px', fontWeight: 'bold',}}
    >
      {isLoading ? 'Đang tải file' : 'Xuất file Excel'}
    </Button>
  );
};

export default ExportTeachersClassExcel;