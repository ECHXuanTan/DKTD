import React, { useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import * as XLSX from 'xlsx';
import { getExportDepartmentTeachers } from '../../../services/statisticsServices';
import { toast } from 'react-toastify';

const ExportDepartmentTeachers = ({ departmentId, departmentName }) => {
  const [loading, setLoading] = useState(false);

  const excludedIds = [
    "67801209b2349d98214e33b0",
    "6720a875ecc34e29a4c2642c",
    "677feb6ab2349d98214e175b",
    "678079b1b2349d98214e7848",
    "67807f9cb2349d98214e7f5c",
    "67808309b2349d98214e85cf",
    "678088aeb2349d98214e8ac3",
    "6710730c6ad80da90b6489ff",
    "6746e4e5153d5710f1c1a64c"
  ];

  const getLastName = (fullName) => {
    const nameParts = fullName.trim().split(' ');
    return nameParts[nameParts.length - 1];
  };

  const getTotalClasses = (teachingDetails, hasHomeroom) => {
    return teachingDetails.length + (hasHomeroom ? 1 : 0);
  };

  const getTotalReducedLessons = (teacher) => {
    return (
      (teacher.homeroomReduction?.totalReducedLessons || 0) +
      teacher.reductions.reduce((sum, reduction) => sum + (reduction.reducedLessons || 0), 0)
    );
  };

  const getReductionReasons = (teacher) => {
    const reasons = [];
    if (teacher.homeroomReduction?.reductionReason) reasons.push(teacher.homeroomReduction.reductionReason);
    teacher.reductions.forEach((reduction) => {
      if (reduction.reductionReason) reasons.push(reduction.reductionReason);
    });
    return reasons.filter(Boolean).join(' + ');
  };

  const adjustHomeroomLessons = (teacher) => {
    let homeroomAdjustment = { KC_CS1: 0, KC_CS2: 0 };
    if (teacher.homeroomReduction?.className) {
      const prefix = teacher.homeroomReduction.className.slice(0, 2);
      if (prefix === 'Q5') {
        homeroomAdjustment.KC_CS1 += 36;
      } else if (prefix === 'TĐ') {
        homeroomAdjustment.KC_CS2 += 36;
      }
    }
    return homeroomAdjustment;
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const teachers = await getExportDepartmentTeachers(departmentId);

      const filteredTeachers = teachers.filter(
        (teacher) => !excludedIds.includes(String(teacher.id))
      );

      const data = filteredTeachers.map((teacher, index) => {
        const homeroomAdjustment = adjustHomeroomLessons(teacher);
        return {
          STT: index + 1,
          'Họ và tên': teacher.name,
          Tên: getLastName(teacher.name),
          'Số lớp': getTotalClasses(teacher.teachingDetails, Boolean(teacher.homeroomReduction)),
          'Hình thức giáo viên': teacher.type,
          'KC CS1': teacher.totalLessonsQ5NS + homeroomAdjustment.KC_CS1,
          'Ch CS1': teacher.totalLessonsQ5S,
          'KC CS2': teacher.totalLessonsTDNS + homeroomAdjustment.KC_CS2,
          'Ch CS2': teacher.totalLessonsTDS,
          'Tổng số tiết': teacher.totalAssignment,
          'Số tiết chuẩn': teacher.type === 'Cơ hữu' ? teacher.basicTeachingLessons : '',
          'Số tiết giảm': teacher.type === 'Cơ hữu' ? getTotalReducedLessons(teacher) : '',
          'Nội dung giảm': teacher.type === 'Cơ hữu' ? getReductionReasons(teacher) : '',
          'Ghi chú': ''
        };
      });

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
