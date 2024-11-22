import React, { useState, useEffect } from 'react';
import { Circles } from 'react-loader-spinner';
import { toast } from 'react-toastify';
import Modal from 'react-modal';
import * as XLSX from 'xlsx';
import { CloudUpload, DeleteOutline } from '@mui/icons-material';
import { getDepartmentTeacherNames } from '../../../../services/teacherService';
import { createBulkAssignments } from '../../../../services/assignmentServices';
import { getDepartmentClasses } from '../../../../services/statisticsServices';
import ExportAssignmentTemplate from './ExportAssignmentTemplate';
import ExcelPreview from './ExcelPreview';
import styles from '../../../../css/Leader/Components/ImportAssignmentsModal.module.css';

const ImportAssignmentsModal = ({ isOpen, onClose, onAssignmentCreate }) => {
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
          console.log('classesResponse',classesResponse);
          setClasses(classesResponse);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Lỗi khi tải dữ liệu.');
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const validateData = (data) => {
    const errors = [];
    const assignments = [];
    const processedClasses = new Set();

    data.forEach((row, index) => {
      const rowNumber = index + 2;
      const rawClassName = row['Mã lớp'];
      const className = rawClassName.split('(')[0].trim();

      if (processedClasses.has(className)) {
        errors.push(`Dòng ${rowNumber}: Lớp "${className}" đã được khai báo trước đó`);
        return;
      }
      
      const classData = classes.find(c => c.name === className);
      if (!classData) {
        errors.push(`Dòng ${rowNumber}: Không tìm thấy lớp "${className}"`);
        return;
      }

      const remainingSubjects = classData.subjects.filter(s => {
        const totalAssigned = s.assignments?.reduce((sum, a) => sum + a.completedLessons, 0) || 0;
        return s.lessonCount > totalAssigned;
      });

      if (remainingSubjects.length === 0) {
        errors.push(`Dòng ${rowNumber}: Không còn môn học nào có tiết trống trong lớp "${className}"`);
        return;
      }

      const subjectData = remainingSubjects[0];
      const totalAssignedLessons = subjectData.assignments?.reduce((sum, a) => sum + a.completedLessons, 0) || 0;
      const remainingLessons = subjectData.lessonCount - totalAssignedLessons;

      let totalNewLessons = 0;
      const rowAssignments = [];
      const teachersInRow = new Set();

      const pairs = Object.entries(row).reduce((acc, [key, value]) => {
        if (key.startsWith('Tên giáo viên')) {
          const index = key.match(/\d+/)[0];
          const lessonsKey = `Số tiết ${index}`;
          if (row[lessonsKey]) {
            acc.push({
              teacherName: value,
              lessons: parseInt(row[lessonsKey])
            });
          }
        }
        return acc;
      }, []);

      for (const pair of pairs) {
        const { teacherName, lessons } = pair;

        if (!teacherName || typeof lessons !== 'number' || isNaN(lessons)) {
          continue;
        }

        if (teachersInRow.has(teacherName)) {
          errors.push(`Dòng ${rowNumber}: Giáo viên "${teacherName}" xuất hiện nhiều lần trong cùng một lớp`);
          continue;
        }

        const teacher = teachers.find(t => t.name.toLowerCase() === teacherName.toLowerCase());
        if (!teacher) {
          errors.push(`Dòng ${rowNumber}: Không tìm thấy giáo viên "${teacherName}"`);
          continue;
        }

        if (lessons <= 0) {
          errors.push(`Dòng ${rowNumber}: Số tiết phải lớn hơn 0 cho giáo viên "${teacherName}"`);
          continue;
        }

        teachersInRow.add(teacherName);
        totalNewLessons += lessons;
        rowAssignments.push({
          classId: classData._id,
          subjectId: subjectData.subject._id,
          teacherId: teacher._id,
          completedLessons: lessons
        });
      }

      if (totalNewLessons > remainingLessons) {
        errors.push(
          `Dòng ${rowNumber}: Tổng số tiết (${totalNewLessons}) vượt quá số tiết còn lại (${remainingLessons}) của môn ${subjectData.subject.name}`
        );
        return;
      }

      if (rowAssignments.length > 0) {
        processedClasses.add(className);
        assignments.push(...rowAssignments);
      }
    });

    return { errors, assignments };
  };

  const handleDataChange = (newData) => {
    setParsedData(newData);
    const { errors } = validateData(newData);
    setErrors(errors);
  };

  const handleEditStateChange = (state) => {
    setIsEditing(state);
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
    if (droppedFile && (droppedFile.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || 
                       droppedFile.type === "application/vnd.ms-excel")) {
      await processFile(droppedFile);
    } else {
      toast.error('Vui lòng chỉ tải lên file Excel (.xlsx, .xls)');
    }
  };

  const processFile = async (file) => {
    try {
      setFile(file);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
  
      const { errors } = validateData(jsonData);
      setErrors(errors);
      setParsedData(jsonData);
    } catch (error) {
      console.error('Error parsing Excel:', error);
      toast.error('Lỗi khi đọc file Excel');
    }
  };

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      await processFile(selectedFile);
    }
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
      await createBulkAssignments(assignments);
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
        <h2 className={styles.modalTitle}>Tải lên danh sách phân công</h2>
        
        <div className={styles.formContent}>
          <div className={styles.instructions}>
            <div className={styles.instructionsHeader}>
              <h3>Hướng dẫn:</h3>
              <ExportAssignmentTemplate />
            </div>
            <ul>
              <li>Tổng số tiết khai báo không được vượt quá số tiết còn lại của môn học</li>
              <li>Mã lớp và tên giáo viên phải khớp với dữ liệu trong hệ thống</li>
              <li>Mỗi lớp chỉ được khai báo một lần</li>
              <li>Mỗi giáo viên chỉ được khai báo một lần trong cùng một lớp</li>
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
              accept=".xlsx,.xls"
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
            <ExcelPreview 
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
              <p>Số lượng phân công: {parsedData.length}</p>
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

export default ImportAssignmentsModal;