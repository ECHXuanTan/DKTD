import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { toast } from 'react-toastify';
import { getTeachersWithoutHomeroom, assignHomeroom } from '../../../../services/teacherService';
import { getUnassignedHomerooms } from '../../../../services/classServices';
import { getDepartmentNames } from '../../../../services/departmentService';
import styles from '../../../../css/Ministry/components/HomeroomAssignmentModal.module.css';

const HomeroomAssignmentModal = ({ isOpen, onClose, onAssignmentComplete }) => {
    const [teachers, setTeachers] = useState([]);
    const [classes, setClasses] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [selectedClass, setSelectedClass] = useState('');
    const [reducedLessonsPerWeek, setReducedLessonsPerWeek] = useState(0);
    const [reducedWeeks, setReducedWeeks] = useState(0);
    const [showAssignPopup, setShowAssignPopup] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchTeachersAndClasses();
            fetchDepartments();
        }
    }, [isOpen]);

    const fetchTeachersAndClasses = async () => {
        try {
            const teachersData = await getTeachersWithoutHomeroom();
            const classesData = await getUnassignedHomerooms();
            setTeachers(teachersData);
            setClasses(classesData);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Không thể tải danh sách giáo viên và lớp học');
        }
    };

    const fetchDepartments = async () => {
        try {
            const departmentData = await getDepartmentNames();
            setDepartments(departmentData);
        } catch (error) {
            console.error('Error fetching departments:', error);
            toast.error('Không thể tải danh sách tổ chuyên môn');
        }
    };

    const handleAssign = (teacher) => {
        setSelectedTeacher(teacher);
        setShowAssignPopup(true);
    };

    const handleAssignSubmit = async (e) => {
        e.preventDefault();
        if (!selectedClass) {
            toast.error('Vui lòng chọn lớp học');
            return;
        }
        try {
            await assignHomeroom(selectedTeacher._id, selectedClass, reducedLessonsPerWeek, reducedWeeks);
            toast.success('Phân công chủ nhiệm thành công');
            setShowAssignPopup(false);
            await fetchTeachersAndClasses();
            onAssignmentComplete();
            if (teachers.length === 1) {
                onClose();
            }
        } catch (error) {
            console.error('Error assigning homeroom:', error);
            toast.error('Có lỗi xảy ra khi phân công chủ nhiệm');
        }
    };

    const handleSearchChange = (event) => {
        setSearchQuery(event.target.value);
    };

    const handleDepartmentChange = (event) => {
        setSelectedDepartment(event.target.value);
    };

    const filteredTeachers = teachers.filter(teacher => 
        teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (selectedDepartment ? teacher.department._id === selectedDepartment : true)
    );

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onClose}
            contentLabel="Phân Công Chủ Nhiệm"
            className={styles.modal}
            overlayClassName={styles.overlay}
        >
            <h2 className={styles.modalTitle}>Phân Công Chủ Nhiệm</h2>
            <div className={styles.filterContainer}>
                <input
                    type="text"
                    placeholder="Tìm kiếm giáo viên..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className={styles.searchInput}
                />
                <select
                    value={selectedDepartment}
                    onChange={handleDepartmentChange}
                    className={styles.departmentSelect}
                >
                    <option value="">Tất cả tổ chuyên môn</option>
                    {departments.map((dept) => (
                        <option key={dept._id} value={dept._id}>{dept.name}</option>
                    ))}
                </select>
            </div>
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Tên giáo viên</th>
                            <th>Khoa</th>
                            <th>Môn giảng dạy</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTeachers.map((teacher, index) => (
                            <tr key={teacher._id}>
                                <td>{index + 1}</td>
                                <td>{teacher.name}</td>
                                <td>{teacher.department.name}</td>
                                <td>{teacher.teachingSubjects.name}</td>
                                <td>
                                    <button onClick={() => handleAssign(teacher)} className={styles.assignButton}>
                                        Phân công
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className={styles.formActions}>
                <button onClick={onClose} className={styles.cancelButton}>Đóng</button>
            </div>

            {showAssignPopup && (
                <div className={styles.popup}>
                    <div className={styles.popupContent}>
                        <h3>Phân Công Chủ Nhiệm cho {selectedTeacher?.name}</h3>
                        <form onSubmit={handleAssignSubmit}>
                            <div className={styles.formGroup}>
                                <label htmlFor="class">Lớp học:</label>
                                <select
                                    id="class"
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                    required
                                >
                                    <option value="">Chọn lớp học</option>
                                    {classes.map((cls) => (
                                        <option key={cls._id} value={cls._id}>{cls.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="reducedLessonsPerWeek">Số tiết giảm một tuần:</label>
                                <input
                                    type="number"
                                    id="reducedLessonsPerWeek"
                                    value={reducedLessonsPerWeek}
                                    onChange={(e) => setReducedLessonsPerWeek(Number(e.target.value))}
                                    required
                                    min="0"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="reducedWeeks">Số tuần giảm:</label>
                                <input
                                    type="number"
                                    id="reducedWeeks"
                                    value={reducedWeeks}
                                    onChange={(e) => setReducedWeeks(Number(e.target.value))}
                                    required
                                    min="0"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Tổng số tiết giảm:</label>
                                <span>{reducedLessonsPerWeek * reducedWeeks}</span>
                            </div>
                            <div className={styles.popupActions}>
                                <button type="submit" className={styles.submitButton}>Phân Công</button>
                                <button type="button" onClick={() => setShowAssignPopup(false)} className={styles.cancelButton}>Hủy</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default HomeroomAssignmentModal;