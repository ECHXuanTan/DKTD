import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Circles } from 'react-loader-spinner';
import { toast } from 'react-toastify';
import Modal from 'react-modal';
import { getClassesBySubject } from '../../../services/classServices';
import { getClassSubjectInfo } from '../../../services/assignmentServices';
import styles from '../../../css/Leader/Components/CreateAssignmentModal.module.css';

const CreateAssignmentModal = ({ 
  isOpen, 
  onClose, 
  subjects, 
  teacherId,
  onAssignmentCreate,
  existingAssignments 
}) => {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [classes, setClasses] = useState([]);
  const [classAssignments, setClassAssignments] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [weeklyLessons, setWeeklyLessons] = useState({});
  const [numberOfWeeks, setNumberOfWeeks] = useState({});

  useEffect(() => {
    if (selectedSubject) {
      fetchClasses();
    }
  }, [selectedSubject]);

  const filteredClasses = useMemo(() => {
    let filtered = classes;
    if (selectedGrade !== 'all') {
      filtered = filtered.filter(cls => cls.grade === parseInt(selectedGrade));
    }
    if (searchTerm.trim()) {
      filtered = filtered.filter(cls => 
        cls.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
      );
    }
    return filtered;
  }, [selectedGrade, searchTerm, classes]);

  useEffect(() => {
    const newClassAssignments = {};
    Object.keys(weeklyLessons).forEach(classId => {
      const weekly = weeklyLessons[classId] || 0;
      const weeks = numberOfWeeks[classId] || 0;
      newClassAssignments[classId] = weekly * weeks;
    });
    setClassAssignments(newClassAssignments);
  }, [weeklyLessons, numberOfWeeks]);

  const fetchClasses = useCallback(async () => {
    try {
      setIsLoading(true);
      const classesData = await getClassesBySubject(selectedSubject);
      
      const availableClasses = classesData.classes.filter(cls => 
        !existingAssignments.some(assignment => 
          assignment.subjectId === selectedSubject && assignment.classId === cls._id
        )
      );

      const classInfoPromises = availableClasses.map(async cls => {
        const info = await getClassSubjectInfo(cls._id, selectedSubject, teacherId);
        return {
          ...cls,
          remainingLessons: info.remainingLessons,
          totalLessons: info.totalLessons
        };
      });

      const classesWithInfo = await Promise.all(classInfoPromises);
      const sortedClasses = classesWithInfo.sort((a, b) => {
        if (a.grade !== b.grade) return a.grade - b.grade;
        return a.name.localeCompare(b.name, 'vi');
      });
      
      setClasses(sortedClasses);

      const initialWeeklyLessons = {};
      const initialNumberOfWeeks = {};
      sortedClasses.forEach(cls => {
        initialWeeklyLessons[cls._id] = '';
        initialNumberOfWeeks[cls._id] = '';
      });
      setWeeklyLessons(initialWeeklyLessons);
      setNumberOfWeeks(initialNumberOfWeeks);

      if (availableClasses.length === 0) {
        toast.info('Không có lớp học khả dụng cho môn học này');
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Lỗi khi tải danh sách lớp học');
    } finally {
      setIsLoading(false);
    }
  }, [selectedSubject, existingAssignments, teacherId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSubject) {
      toast.error('Vui lòng chọn môn học');
      return;
    }
  
    const assignments = Object.entries(classAssignments)
      .filter(([_, value]) => value && parseInt(value) > 0)
      .map(([classId]) => ({
        classId,
        subjectId: selectedSubject,
        teacherId,  
        lessonsPerWeek: parseInt(weeklyLessons[classId]),
        numberOfWeeks: parseInt(numberOfWeeks[classId])
      }));
  
    if (assignments.length === 0) {
      toast.error('Vui lòng nhập số tiết cho ít nhất một lớp');
      return;
    }
  
    try {
      setIsLoading(true);
      // Chỉ gọi callback, không gọi API trực tiếp
      await onAssignmentCreate(assignments);
      handleClose();
    } catch (error) {
      console.error('Error creating assignments:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi phân công tiết dạy');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedSubject('');
    setSelectedGrade('all');
    setSearchTerm('');
    setClasses([]);
    setWeeklyLessons({});
    setNumberOfWeeks({});
    setClassAssignments({});
    onClose();
  };

  const handleWeeklyLessonsChange = (classId, value) => {
    const classInfo = classes.find(c => c._id === classId);
    if (!classInfo) return;

    const numValue = value === '' ? '' : parseInt(value);
    const weeks = numberOfWeeks[classId] ? parseInt(numberOfWeeks[classId]) : 0;
    const totalLessons = numValue * weeks;

    if (value === '' || (numValue >= 0 && totalLessons <= classInfo.remainingLessons)) {
      setWeeklyLessons(prev => ({
        ...prev,
        [classId]: value
      }));
    }
  };

  const handleNumberOfWeeksChange = (classId, value) => {
    const classInfo = classes.find(c => c._id === classId);
    if (!classInfo) return;

    const numValue = value === '' ? '' : parseInt(value);
    const weekly = weeklyLessons[classId] ? parseInt(weeklyLessons[classId]) : 0;
    const totalLessons = weekly * numValue;

    if (value === '' || (numValue >= 0 && totalLessons <= classInfo.remainingLessons)) {
      setNumberOfWeeks(prev => ({
        ...prev,
        [classId]: value
      }));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
      className={styles.modal}
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <h2 className={styles.modalTitle}>Phân công tiết dạy</h2>
        <div className={styles.formContent}>
          <select
            className={styles.select}
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            <option value="">Chọn môn học</option>
            {subjects.map((subject) => (
              <option key={subject._id} value={subject._id}>{subject.name}</option>
            ))}
          </select>

          {classes.length > 0 && (
            <div className={styles.filterGroup}>
              <select
                className={styles.filterSelect}
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
              >
                <option value="all">Tất cả khối</option>
                <option value="10">Khối 10</option>
                <option value="11">Khối 11</option>
                <option value="12">Khối 12</option>
              </select>

              <input
                type="text"
                className={styles.filterInput}
                placeholder="Tìm kiếm lớp..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}

          {isLoading ? (
            <div className={styles.loadingContainer}>
              <Circles color="#00BFFF" height={50} width={50} />
            </div>
          ) : filteredClasses.length > 0 ? (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Lớp</th>
                    <th>Số tiết trống</th>
                    <th>Số tiết/tuần</th>
                    <th>Số tuần</th>
                    <th>Tổng số tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClasses.map((cls) => (
                    <tr key={cls._id} className={cls.remainingLessons === 0 ? styles.disabledRow : ''}>
                      <td>{cls.name}</td>
                      <td>{cls.remainingLessons}/{cls.totalLessons}</td>
                      <td>
                        <input
                          type="number"
                          className={styles.lessonInput}
                          value={weeklyLessons[cls._id]}
                          onChange={(e) => handleWeeklyLessonsChange(cls._id, e.target.value)}
                          min="0"
                          disabled={cls.remainingLessons === 0}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className={styles.lessonInput}
                          value={numberOfWeeks[cls._id]}
                          onChange={(e) => handleNumberOfWeeksChange(cls._id, e.target.value)}
                          min="0"
                          disabled={cls.remainingLessons === 0}
                        />
                      </td>
                      <td>
                        {classAssignments[cls._id] || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : selectedSubject && (
            <p className={styles.noDataText}>Không có lớp học khả dụng</p>
          )}
        </div>

        <div className={styles.modalButtons}>
          <button type="button" className={styles.cancelButton} onClick={handleClose}>
            Hủy
          </button>
          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? <Circles color="#ffffff" height={20} width={20} /> : 'Phân công'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateAssignmentModal;