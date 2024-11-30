import React, { useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import * as XLSX from 'xlsx';
import { getExportDepartmentTeachers } from '../../../services/statisticsServices';
import { toast } from 'react-toastify';

const ExportDepartmentTeachers = ({ departmentId, departmentName }) => {
  const [loading, setLoading] = useState(false);

  const getLastName = (fullName) => {
    const nameParts = fullName.trim().split(' ');
    return nameParts[nameParts.length - 1];
  };

  const getTotalClasses = (teachingDetails) => {
    return teachingDetails.length;
  };

  const getTotalReducedLessons = (teacher) => {
    return (teacher.homeroomInfo?.totalReducedLessons || 0) + (teacher.totalReducedLessons || 0);
  };

  const getReductionReasons = (teacher) => {
    const reasons = [];
    if (teacher.homeroomInfo?.reductionReason) reasons.push(teacher.homeroomInfo.reductionReason);
    if (teacher.reductionReason && teacher.reductionReason.includes(', ')) {
      reasons.push(...teacher.reductionReason.split(', '));
    } else if (teacher.reductionReason) {
      reasons.push(teacher.reductionReason);
    }
    return reasons.filter(Boolean).join(' + ');
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const teachers = await getExportDepartmentTeachers(departmentId);

      const data = teachers.map((teacher, index) => ({
        STT: index + 1,
        'Họ và tên': teacher.name,
        Tên: getLastName(teacher.name),
        'Số lớp': getTotalClasses(teacher.teachingDetails),
        'Hình thức giáo viên': teacher.type,
        'KC CS1': teacher.totalLessonsQ5NS,
        'Ch CS1': teacher.totalLessonsQ5S,
        'KC CS2': teacher.totalLessonsTDNS,
        'Ch CS2': teacher.totalLessonsTDS,
        'Tổng số tiết': teacher.totalAssignment,
        'Số tiết chuẩn': teacher.basicTeachingLessons,
        'Số tiết giảm': getTotalReducedLessons(teacher),
        'Nội dung giảm': getReductionReasons(teacher),
        'Ghi chú': ''
      }));

      const worksheet = XLSX.utils.json_to_sheet([], { skipHeader: true });

      // Add custom headers
      XLSX.utils.sheet_add_aoa(worksheet, [
        ['STT', 'Họ và tên', 'Tên', 'Số lớp', 'Hình thức giáo viên', 'Trong học kỳ 1_18 tuần', '', '', '', 'Tổng số tiết', 'Số tiết chuẩn', 'Số tiết giảm', 'Nội dung giảm', 'Ghi chú'],
        ['', '', '', '', '', 'KC CS1', 'Ch CS1', 'KC CS2', 'Ch CS2', '', '', '', '', ''],
        ['', '', '', '', '', 
          data.reduce((sum, teacher) => sum + teacher['KC CS1'], 0),
          data.reduce((sum, teacher) => sum + teacher['Ch CS1'], 0),
          data.reduce((sum, teacher) => sum + teacher['KC CS2'], 0),
          data.reduce((sum, teacher) => sum + teacher['Ch CS2'], 0),
          '', '', '', '', ''
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
        { s: { r: 0, c: 9 }, e: { r: 2, c: 9 } }, // Merge "Tổng số tiết"
        { s: { r: 0, c: 10 }, e: { r: 2, c: 10 } }, // Merge "Số tiết chuẩn"
        { s: { r: 0, c: 11 }, e: { r: 2, c: 11 } }, // Merge "Số tiết giảm"
        { s: { r: 0, c: 12 }, e: { r: 2, c: 12 } }, // Merge "Nội dung giảm"
        { s: { r: 0, c: 13 }, e: { r: 2, c: 13 } }  // Merge "Ghi chú"
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
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Department Teachers');
      XLSX.writeFile(workbook, `Tính_giờ_dạy_${departmentName}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Có lỗi xảy ra khi xuất file Excel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="contained" 
      onClick={handleExport}
      disabled={loading}
      startIcon={loading ? <CircularProgress size={20} /> : <CloudDownloadIcon />}
      style={{ borderRadius: '26px', fontWeight: 'bold', marginRight: '10px', backgroundColor: '#d98236' }}
    >
      {loading ? 'Đang tải file' : 'Tải kết quả'}
    </Button>
  );
};

export default ExportDepartmentTeachers;