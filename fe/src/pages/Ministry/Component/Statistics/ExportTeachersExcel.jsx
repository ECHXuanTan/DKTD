import React from 'react';
import { Button } from '@mui/material';
import * as XLSX from 'xlsx';

const ExportTeachersExcel = ({ teachers }) => {
  const getLastName = (fullName) => {
    const nameParts = fullName.trim().split(' ');
    return nameParts[nameParts.length - 1];
  };

  const getTotalClasses = (teachingDetails) => {
    return teachingDetails?.length || 0;
  };

  const getTotalReducedLessons = (teacher) => {
    return (teacher.homeroom?.totalReducedLessons || 0) + (teacher.teacherReduction?.totalReducedLessons || 0);
  };

  const getReductionReasons = (teacher) => {
    const reasons = [];
    
    if (teacher.type === "Cơ hữu") {
      if (teacher.homeroomInfo) {
        reasons.push('GVCN');
      }
    
      if (teacher.reductions && teacher.reductions.length > 0) {
        const otherReasons = teacher.reductions.map(reduction => reduction.reductionReason);
        reasons.push(...otherReasons);
      }
    }
  
    return reasons.join(' + ') || '-';
  };

  const processTeacherData = (teachers) => {
    const teacherMap = new Map();

    teachers.forEach(teacher => {
      if (teacher.totalAssignment === 0) return;
      
      if (teacherMap.has(teacher.email)) {
        const existingTeacher = teacherMap.get(teacher.email);

        existingTeacher.totalLessonsQ5S = (existingTeacher.totalLessonsQ5S || 0) + (teacher.totalLessonsQ5S || 0);
        existingTeacher.totalLessonsQ5NS = (existingTeacher.totalLessonsQ5NS || 0) + (teacher.totalLessonsQ5NS || 0);
        existingTeacher.totalLessonsTDS = (existingTeacher.totalLessonsTDS || 0) + (teacher.totalLessonsTDS || 0);
        existingTeacher.totalLessonsTDNS = (existingTeacher.totalLessonsTDNS || 0) + (teacher.totalLessonsTDNS || 0);
        existingTeacher.totalAssignment = (existingTeacher.totalAssignment || 0) + (teacher.totalAssignment || 0);

        if (teacher.teachingDetails) {
          existingTeacher.teachingDetails = [
            ...(existingTeacher.teachingDetails || []),
            ...(teacher.teachingDetails || [])
          ];
        }

        if (teacher.teachingSubjects && !existingTeacher.teachingSubjects.includes(teacher.teachingSubjects)) {
          existingTeacher.teachingSubjects = `${existingTeacher.teachingSubjects}, ${teacher.teachingSubjects}`;
        }

        teacherMap.set(teacher.email, existingTeacher);
      } else {
        teacherMap.set(teacher.email, { ...teacher });
      }
    });

    return Array.from(teacherMap.values());
  };

  const handleExport = async () => {
    const processedTeachers = processTeacherData(teachers);

    const data = processedTeachers.map((teacher, index) => ({
      STT: index + 1,
      'Họ và tên': teacher.name,
      Tên: getLastName(teacher.name),
      'Số lớp': getTotalClasses(teacher.teachingDetails),
      'Hình thức giáo viên': teacher.type,
      'KC CS1': teacher.totalLessonsQ5NS || 0,
      'Ch CS1': teacher.totalLessonsQ5S || 0,
      'KC CS2': teacher.totalLessonsTDNS || 0,
      'Ch CS2': teacher.totalLessonsTDS || 0,
      'Bộ môn': teacher.teachingSubjects,
      'Tổng số tiết': teacher.totalAssignment || 0,
      'Số tiết chuẩn': teacher.basicTeachingLessons, 
      'Số tiết giảm': teacher.totalReductions,
      'Nội dung giảm': getReductionReasons(teacher),
      'Ghi chú': ''
    }));

    const worksheet = XLSX.utils.json_to_sheet([], { skipHeader: true });

    XLSX.utils.sheet_add_aoa(worksheet, [
      ['STT', 'Họ và tên', 'Tên', 'Số lớp', 'Hình thức giáo viên', 'Trong học kỳ 1_18 tuần', '', '', '', 'Bộ môn', 'Tổng số tiết', 'Số tiết chuẩn', 'Số tiết giảm', 'Nội dung giảm', 'Ghi chú'],
      ['', '', '', '', '', 'KC CS1', 'Ch CS1', 'KC CS2', 'Ch CS2', '', '', '', '', '', ''],
      ['', '', '', '', '', 
        data.reduce((sum, teacher) => sum + teacher['KC CS1'], 0),
        data.reduce((sum, teacher) => sum + teacher['Ch CS1'], 0),
        data.reduce((sum, teacher) => sum + teacher['KC CS2'], 0),
        data.reduce((sum, teacher) => sum + teacher['Ch CS2'], 0),
        '', '', '', '', '', ''
      ]
    ], { origin: 'A1' });

    XLSX.utils.sheet_add_json(worksheet, data, { origin: 'A4', skipHeader: true });

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
    XLSX.writeFile(workbook, 'Tính_giờ_dạy_theo_gv.xlsx');
  };

  return (
    <Button variant="contained" color="primary" onClick={handleExport} style={{borderRadius: '26px', fontWeight: 'bold'}}>
      Xuất file Excel
    </Button>
  );
};

export default ExportTeachersExcel;