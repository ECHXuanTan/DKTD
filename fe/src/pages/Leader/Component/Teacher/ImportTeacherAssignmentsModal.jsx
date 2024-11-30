import React, { useState, useEffect } from 'react';
import { Circles } from 'react-loader-spinner';
import { toast } from 'react-toastify';
import Modal from 'react-modal';
import * as XLSX from 'xlsx';
import { CloudUpload, DeleteOutline } from '@mui/icons-material';
import { getDepartmentTeacherNames } from '../../../../services/teacherService';
import { createBulkTeacherAssignments } from '../../../../services/assignmentServices';
import { getDepartmentClasses } from '../../../../services/statisticsServices';
import ExportTeacherAssignmentTemplate from './ExportTeacherAssignmentTemplate';
import TeacherExcelPreview from './TeacherExcelPreview';
import styles from '../../../../css/Leader/Components/ImportAssignmentsModal.module.css';

const ImportTeacherAssignmentsModal = ({ isOpen, onClose, onAssignmentCreate }) => {
  const [file, setFile] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [errors, setErrors] = useState([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teachersResponse, classesResponse] = await Promise.all([
          getDepartmentTeacherNames(),
          getDepartmentClasses()
        ]);

        if (teachersResponse.success && teachersResponse.data) {
          setTeachers(teachersResponse.data);
        }

        if (Array.isArray(classesResponse)) {
          setClasses(classesResponse);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Lỗi khi tải dữ liệu');
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const validateData = (data) => {
    console.log('Starting validation with data:', data);
    const errors = [];
    const assignments = [];
    const teacherAssignments = new Map();
    const teacherClassAssignments = new Map(); // Track class assignments per teacher

    data.forEach((row, index) => {
      const rowNumber = index + 2;
      console.log(`Validating row ${rowNumber}:`, row);

      const teacherName = row['Tên giáo viên']?.trim();
      const teacher = teachers.find(t => t.name === teacherName);

      if (!teacherName || !teacher) {
        errors.push(`Dòng ${rowNumber}: Không tìm thấy giáo viên "${teacherName}"`);
        return;
      }

      if (!teacherAssignments.has(teacher._id)) {
        teacherAssignments.set(teacher._id, {
          teacherId: teacher._id,
          classes: []
        });
        teacherClassAssignments.set(teacher._id, new Set()); // Initialize set of assigned classes
      }

      const teacherAssignment = teacherAssignments.get(teacher._id);
      const assignedClasses = teacherClassAssignments.get(teacher._id);
      console.log(`Processing assignments for teacher ${teacherName} (ID: ${teacher._id})`);

      const classColumns = Object.keys(row).filter(key => key.startsWith('Mã lớp '));
      
      classColumns.forEach(classKey => {
        const position = classKey.replace('Mã lớp ', '');
        const classCode = row[classKey]?.trim();
        const lessonsKey = `Số tiết ${position}`;
        const lessons = parseInt(row[lessonsKey]);

        console.log(`Processing class assignment:`, {
          position,
          classCode,
          lessonsKey,
          lessons,
          rawLessonsValue: row[lessonsKey]
        });

        if (!classCode) return;

        // Check if this class has already been assigned to this teacher
        if (assignedClasses.has(classCode)) {
          errors.push(`Dòng ${rowNumber}: Lớp "${classCode}" đã được phân công cho giáo viên "${teacherName}" trong một dòng khác`);
          return;
        }

        if (isNaN(lessons) || lessons <= 0) {
          console.log(`Invalid lessons value for class ${classCode}:`, lessons);
          errors.push(`Dòng ${rowNumber}: Số tiết không hợp lệ cho lớp "${classCode}"`);
          return;
        }

        const classData = classes.find(c => c.name === classCode);
        if (!classData) {
          errors.push(`Dòng ${rowNumber}: Không tìm thấy lớp "${classCode}"`);
          return;
        }

        const remainingSubjects = classData.subjects.filter(s => {
          const totalAssigned = s.assignments?.reduce((sum, a) => sum + a.completedLessons, 0) || 0;
          return s.lessonCount > totalAssigned;
        });

        if (remainingSubjects.length === 0) {
          errors.push(`Dòng ${rowNumber}: Không còn môn học nào có tiết trống trong lớp "${classCode}"`);
          return;
        }

        const subjectData = remainingSubjects[0];
        const totalAssignedLessons = subjectData.assignments?.reduce((sum, a) => sum + a.completedLessons, 0) || 0;
        const remainingLessons = subjectData.lessonCount - totalAssignedLessons;

        if (lessons > remainingLessons) {
          errors.push(
            `Dòng ${rowNumber}: Số tiết (${lessons}) vượt quá số tiết còn lại (${remainingLessons}) của môn ${subjectData.subject.name} trong lớp "${classCode}"`
          );
          return;
        }

        assignedClasses.add(classCode); // Mark this class as assigned to this teacher
        teacherAssignment.classes.push({
          classId: classData._id,
          subjectId: subjectData.subject._id,
          completedLessons: lessons
        });
      });
    });

    const finalAssignments = Array.from(teacherAssignments.values()).filter(a => a.classes.length > 0);
    console.log('Final assignments to be submitted:', finalAssignments);
    console.log('Validation errors:', errors);

    return { errors, assignments: finalAssignments };
  };

  const processFile = async (file) => {
    try {
      setFile(file);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        defval: "",
        raw: false 
      });

      console.log('Raw Excel Data:', jsonData);

      const processedData = jsonData
        .filter(row => row['Tên giáo viên'] && row['Tên giáo viên'].trim())
        .map(row => {
          const newRow = { 'Tên giáo viên': row['Tên giáo viên'] };
          
          let maxClass = 1;
          while (row[`Mã lớp ${maxClass}`] !== undefined && maxClass <= 7) {
            maxClass++;
          }
          maxClass--;

          console.log('Processing row:', {
            teacher: row['Tên giáo viên'],
            maxClass,
            originalRow: row
          });

          for (let i = 1; i <= maxClass; i++) {
            const classKey = `Mã lớp ${i}`;
            const classValue = row[classKey];

            if (classValue && classValue.trim()) {
              newRow[classKey] = classValue.trim();
              if (i === 1 && row['Số tiết']) {
                // Special case for first class
                newRow[`Số tiết ${i}`] = parseInt(row['Số tiết']) || 0;
              } else if (row[`Số tiết_${i-1}`]) {
                newRow[`Số tiết ${i}`] = parseInt(row[`Số tiết_${i-1}`]) || 0;
              } else if (row[`Số tiết ${i}`]) {
                newRow[`Số tiết ${i}`] = parseInt(row[`Số tiết ${i}`]) || 0;
              } else {
                newRow[`Số tiết ${i}`] = 0;
              }
            }
          }

          console.log('Processed row result:', newRow);
          return newRow;
        });

      console.log('Final Processed Data:', processedData);

      const validationResult = validateData(processedData);
      console.log('Validation Result:', validationResult);

      setErrors(validationResult.errors);
      setParsedData(processedData);
    } catch (error) {
      console.error('Error processing Excel file:', error);
      toast.error('Lỗi khi đọc file Excel');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      await processFile(droppedFile);
    }
  };

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      await processFile(selectedFile);
    }
  };

  const handleDataChange = (newData) => {
    setParsedData(newData);
    const { errors } = validateData(newData);
    setErrors(errors);
  };

  const handleEditStateChange = (state) => {
    setIsEditing(state);
  };

  const removeFile = () => {
    setFile(null);
    setParsedData(null);
    setErrors([]);
    setIsEditing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!parsedData || parsedData.length === 0) {
      toast.error('Vui lòng tải lên file Excel hợp lệ');
      return;
    }

    const { errors, assignments } = validateData(parsedData);
    if (errors.length > 0) {
      setErrors(errors);
      return;
    }

    try {
      setIsLoading(true);
      await createBulkTeacherAssignments(assignments);
      await onAssignmentCreate();
      handleClose();
      toast.success('Phân công giảng dạy thành công');
    } catch (error) {
      console.error('Error creating assignments:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi phân công tiết dạy');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData(null);
    setErrors([]);
    setIsEditing(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
      className={styles.modal}
      overlayClassName={styles.modalOverlay}
      ariaHideApp={false}
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <h2 className={styles.modalTitle}>Tải lên danh sách phân công theo giáo viên</h2>
        
        <div className={styles.formContent}>
          <div className={styles.instructions}>
            <div className={styles.instructionsHeader}>
              <h3>Hướng dẫn:</h3>
              <ExportTeacherAssignmentTemplate />
            </div>
            <ul>
              <li>Tổng số tiết khai báo không được vượt quá số tiết còn lại của môn học</li>
              <li>Tên giáo viên và mã lớp phải khớp với dữ liệu trong hệ thống</li>
              <li>Một lớp chỉ được khai báo một lần duy nhất cho mỗi giáo viên</li>
              <li>Một giáo viên có thể xuất hiện nhiều dòng</li>
            </ul>
          </div>

          <div
            className={`${styles.dropZone} ${isDragActive ? styles.dragActive : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload').click()}
          >
            <CloudUpload className={styles.dropZoneIcon} />
            <p className={styles.dropZoneText}>
              Kéo thả file Excel hoặc click để chọn file
            </p>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="file-upload"
            />
          </div>

          {file && (
            <div className={styles.fileInfo}>
              <p className={styles.fileName}>{file.name}</p>
              <button
                type="button"
                onClick={removeFile}
                className={styles.removeFile}
              >
                <DeleteOutline />
              </button>
            </div>
          )}

          {file && parsedData && (
            <TeacherExcelPreview 
              data={parsedData} 
              onDataChange={handleDataChange} 
              classes={classes}
              teachers={teachers}
              onEditStateChange={handleEditStateChange}
            />
          )}

          {errors.length > 0 && (
            <div className={styles.errorList}>
              <h3>Lỗi dữ liệu:</h3>
              <ul>
                {errors.map((error, index) => (
                  <li key={index} className={styles.errorItem}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {parsedData && !errors.length && !isEditing && (
            <div className={styles.summary}>
              <p>Số lượng dòng phân công: {parsedData.length}</p>
            </div>
          )}
        </div>

        <div className={styles.modalButtons}>
          <button 
            type="button" 
            className={styles.cancelButton} 
            onClick={handleClose}
          >
            Hủy
          </button>
          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={isLoading || !parsedData || errors.length > 0 || isEditing}
          >
            {isLoading ? <Circles color="#ffffff" height={20} width={20} /> : 'Phân công'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ImportTeacherAssignmentsModal;