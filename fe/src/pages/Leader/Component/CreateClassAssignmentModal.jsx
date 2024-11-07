import React, { useState, useEffect } from 'react';
import { Circles } from 'react-loader-spinner';
import { toast } from 'react-toastify';
import Modal from 'react-modal';
import { getDepartmentTeacherNames } from '../../../services/teacherService';
import { createAssignment } from '../../../services/assignmentServices';
import styles from '../../../css/Leader/Components/CreateClassAssignmentModal.module.css';

const CreateClassAssignmentModal = ({ isOpen, onClose, classData, onAssignmentCreate }) => {
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [weeklyLessons, setWeeklyLessons] = useState('');
  const [numberOfWeeks, setNumberOfWeeks] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const totalAssignedLessons = classData?.subject?.assignments?.reduce((sum, a) => sum + a.completedLessons, 0) || 0;
  const remainingLessons = (classData?.subject?.lessonCount || 0) - totalAssignedLessons;
  const isDisabled = remainingLessons <= 0;

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const response = await getDepartmentTeacherNames();
        if (response.success && response.data) {
          setTeachers(response.data);
        }
      } catch (error) {
        console.error('Error fetching teachers:', error);
        toast.error('Lỗi khi tải danh sách giáo viên');
      }
    };

    if (isOpen) {
      fetchTeachers();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTeacher) {
      toast.error('Vui lòng chọn giáo viên');
      return;
    }

    if (!weeklyLessons || !numberOfWeeks) {
      toast.error('Vui lòng nhập đầy đủ số tiết/tuần và số tuần');
      return;
    }

    const calculatedLessons = parseInt(weeklyLessons) * parseInt(numberOfWeeks);
    
    if (calculatedLessons > remainingLessons) {
      toast.error(`Tổng số tiết (${calculatedLessons}) vượt quá số tiết trống (${remainingLessons})`);
      return;
    }

    try {
      setIsLoading(true);
      await createAssignment([{
        classId: classData._id,
        subjectId: classData.subject.subject._id,
        teacherId: selectedTeacher,
        lessonsPerWeek: parseInt(weeklyLessons),
        numberOfWeeks: parseInt(numberOfWeeks)
      }]);
      
      await onAssignmentCreate();
      handleClose();
      toast.success('Phân công giảng dạy thành công');
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi phân công tiết dạy');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedTeacher('');
    setWeeklyLessons('');
    setNumberOfWeeks('');
    onClose();
  };

  const handleWeeklyLessonsChange = (e) => {
    const value = e.target.value;
    const numValue = parseInt(value);
    const numWeeks = parseInt(numberOfWeeks || '0');
    
    if (value === '' || (numValue >= 0 && numValue * numWeeks <= remainingLessons)) {
      setWeeklyLessons(value);
    }
  };

  const handleNumberOfWeeksChange = (e) => {
    const value = e.target.value;
    const numValue = parseInt(value);
    const numWeekly = parseInt(weeklyLessons || '0');
    
    if (value === '' || (numValue >= 0 && numValue * numWeekly <= remainingLessons)) {
      setNumberOfWeeks(value);
    }
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
        <h2 className={styles.modalTitle}>Phân công tiết dạy</h2>
        <div className={styles.formContent}>
          <div className={styles.classInfo}>
            <p><strong>Lớp:</strong> {classData?.name}</p>
            <p><strong>Môn học:</strong> {classData?.subject?.subject?.name}</p>
            <p><strong>Số tiết:</strong> {classData?.subject?.lessonCount}</p>
            <p><strong>Số tiết đã phân công:</strong> {totalAssignedLessons}</p>
            <p><strong>Số tiết trống:</strong> {remainingLessons}</p>
          </div>

          <select
            className={styles.select}
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)}
            disabled={isDisabled}
          >
            <option value="">Chọn giáo viên</option>
            {teachers.map((teacher) => (
              <option key={teacher._id} value={teacher._id}>{teacher.name}</option>
            ))}
          </select>

          <div className={styles.inputGroup}>
            <div>
              <label>Số tiết/tuần:</label>
              <input
                type="number"
                className={styles.input}
                value={weeklyLessons}
                onChange={handleWeeklyLessonsChange}
                min="0"
                disabled={isDisabled}
              />
            </div>
            <div>
              <label>Số tuần:</label>
              <input
                type="number"
                className={styles.input}
                value={numberOfWeeks}
                onChange={handleNumberOfWeeksChange}
                min="0"
                disabled={isDisabled}
              />
            </div>
          </div>

          <div className={styles.totalLessons}>
            <strong>Tổng số tiết:</strong> {weeklyLessons && numberOfWeeks ? 
              parseInt(weeklyLessons) * parseInt(numberOfWeeks) : 0
            }
          </div>
        </div>

        <div className={styles.modalButtons}>
          <button type="button" className={styles.cancelButton} onClick={handleClose}>
            Hủy
          </button>
          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={isLoading || isDisabled}
          >
            {isLoading ? <Circles color="#ffffff" height={20} width={20} /> : 'Phân công'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateClassAssignmentModal;