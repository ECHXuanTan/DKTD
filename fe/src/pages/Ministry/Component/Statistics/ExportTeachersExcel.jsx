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
    if (teacher.homeroom?.reductionReason) reasons.push(teacher.homeroom.reductionReason);
    if (teacher.teacherReduction?.reductionReason) reasons.push(teacher.teacherReduction.reductionReason);
    return reasons.join(' + ');
  };

  const processTeacherData = (teachers) => {
    // Create a map to store aggregated teacher data by email
    const teacherMap = new Map();

    teachers.forEach(teacher => {
      if (teacherMap.has(teacher.email)) {
        // Get existing teacher data
        const existingTeacher = teacherMap.get(teacher.email);

        // Aggregate numeric fields
        existingTeacher.totalLessonsQ5S = (existingTeacher.totalLessonsQ5S || 0) + (teacher.totalLessonsQ5S || 0);
        existingTeacher.totalLessonsQ5NS = (existingTeacher.totalLessonsQ5NS || 0) + (teacher.totalLessonsQ5NS || 0);
        existingTeacher.totalLessonsTDS = (existingTeacher.totalLessonsTDS || 0) + (teacher.totalLessonsTDS || 0);
        existingTeacher.totalLessonsTDNS = (existingTeacher.totalLessonsTDNS || 0) + (teacher.totalLessonsTDNS || 0);
        existingTeacher.totalAssignment = (existingTeacher.totalAssignment || 0) + (teacher.totalAssignment || 0);

        // Combine teaching details if they exist
        if (teacher.teachingDetails) {
          existingTeacher.teachingDetails = [
            ...(existingTeacher.teachingDetails || []),
            ...(teacher.teachingDetails || [])
          ];
        }

        // Combine teaching subjects if different
        if (teacher.teachingSubjects && !existingTeacher.teachingSubjects.includes(teacher.teachingSubjects)) {
          existingTeacher.teachingSubjects = `${existingTeacher.teachingSubjects}, ${teacher.teachingSubjects}`;
        }

        teacherMap.set(teacher.email, existingTeacher);
      } else {
        // Create new entry
        teacherMap.set(teacher.email, { ...teacher });
      }
    });

    // Convert map back to array
    return Array.from(teacherMap.values());
  };

  const handleExport = async () => {
    // Process and aggregate teacher data
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
      'Số tiết giảm': getTotalReducedLessons(teacher),
      'Nội dung giảm': getReductionReasons(teacher),
      'Ghi chú': ''
    }));

    const worksheet = XLSX.utils.json_to_sheet([], { skipHeader: true });

    // Add custom headers
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

    // Add data starting from the fourth row
    XLSX.utils.sheet_add_json(worksheet, data, { origin: 'A4', skipHeader: true });

    // Merge cells for the custom headers
    worksheet['!merges'] = [
      { s: { r: 0, c: 5 }, e: { r: 0, c: 8 } }, // Merge "Trong học kỳ 1_18 tuần"
      { s: { r: 0, c: 0 }, e: { r: 2, c: 0 } }, // Merge "STT"
      { s: { r: 0, c: 1 }, e: { r: 2, c: 1 } }, // Merge "Họ và tên"
      { s: { r: 0, c: 2 }, e: { r: 2, c: 2 } }, // Merge "Tên"
      { s: { r: 0, c: 3 }, e: { r: 2, c: 3 } }, // Merge "Số lớp"
      { s: { r: 0, c: 4 }, e: { r: 2, c: 4 } }, // Merge "Hình thức giáo viên"
      { s: { r: 0, c: 9 }, e: { r: 2, c: 9 } }, // Merge "Bộ môn"
      { s: { r: 0, c: 10 }, e: { r: 2, c: 10 } }, // Merge "Tổng số tiết"
      { s: { r: 0, c: 11 }, e: { r: 2, c: 11 } }, // Merge "Số tiết chuẩn"
      { s: { r: 0, c: 12 }, e: { r: 2, c: 12 } }, // Merge "Số tiết giảm"
      { s: { r: 0, c: 13 }, e: { r: 2, c: 13 } }, // Merge "Nội dung giảm"
      { s: { r: 0, c: 14 }, e: { r: 2, c: 14 } }  // Merge "Ghi chú"
    ];

    // Apply font to all cells
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