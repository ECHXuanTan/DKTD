import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { toast } from 'react-toastify';
import { getTeachersWithoutHomeroom, assignHomeroom } from '../../../../services/teacherService';
import { getDepartmentNames } from '../../../../services/departmentService';
import styles from '../../../../css/Ministry/components/HomeroomAssignmentModal.module.css';

const HomeroomAssignmentModal = ({ isOpen, onClose, onAssignmentComplete }) => {
    const [teachers, setTeachers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [showAssignPopup, setShowAssignPopup] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    
    const [classForm, setClassForm] = useState({
        name: '',
        grade: '10',
        campus: 'Quận 5',
        size: ''
    });
    const [reducedLessonsPerWeek, setReducedLessonsPerWeek] = useState(4);
    const [reducedWeeks, setReducedWeeks] = useState(18);

    const grades = ['10', '11', '12'];
    const campuses = ['Quận 5', 'Thủ Đức'];

    useEffect(() => {
        if (isOpen) {
            fetchTeachersAndDepartments();
        }
    }, [isOpen]);

    const fetchTeachersAndDepartments = async () => {
        try {
            const teachersData = await getTeachersWithoutHomeroom();
            const departmentData = await getDepartmentNames();
            setTeachers(teachersData);
            setDepartments(departmentData);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Không thể tải danh sách giáo viên và tổ chuyên môn');
        }
    };

    const handleAssign = (teacher) => {
        setSelectedTeacher(teacher);
        setClassForm({
            name: '',
            grade: '10',
            campus: 'Quận 5',
            size: ''
        });
        setReducedLessonsPerWeek(4);
        setReducedWeeks(18);
        setShowAssignPopup(true);
    };

    const handleClassFormChange = (e) => {
        const { name, value } = e.target;
        setClassForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAssignSubmit = async (e) => {
        e.preventDefault();
        
        if (!classForm.name || !classForm.grade || !classForm.campus || !classForm.size) {
            toast.error('Vui lòng điền đầy đủ thông tin lớp học');
            return;
        }

        try {
            await assignHomeroom(
                selectedTeacher._id, 
                classForm,
                reducedLessonsPerWeek, 
                reducedWeeks
            );
            
            toast.success('Phân công chủ nhiệm thành công');
            setShowAssignPopup(false);
            await fetchTeachersAndDepartments();
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
                        <form onSubmit={handleAssignSubmit} className={styles.assignForm}>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="name">Tên lớp:</label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={classForm.name}
                                        onChange={handleClassFormChange}
                                        required
                                        className={styles.formInput}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="grade">Khối:</label>
                                    <select
                                        id="grade"
                                        name="grade"
                                        value={classForm.grade}
                                        onChange={handleClassFormChange}
                                        required
                                        className={styles.formSelect}
                                    >
                                        {grades.map(grade => (
                                            <option key={grade} value={grade}>{grade}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="campus">Cơ sở:</label>
                                    <select
                                        id="campus"
                                        name="campus"
                                        value={classForm.campus}
                                        onChange={handleClassFormChange}
                                        required
                                        className={styles.formSelect}
                                    >
                                        {campuses.map(campus => (
                                            <option key={campus} value={campus}>{campus}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="size">Sĩ số:</label>
                                    <input
                                        type="number"
                                        id="size"
                                        name="size"
                                        value={classForm.size}
                                        onChange={handleClassFormChange}
                                        required
                                        min="1"
                                        className={styles.formInput}
                                    />
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="reducedLessonsPerWeek">Số tiết chủ nhiệm một tuần:</label>
                                    <input
                                        type="number"
                                        id="reducedLessonsPerWeek"
                                        value={reducedLessonsPerWeek}
                                        onChange={(e) => setReducedLessonsPerWeek(Number(e.target.value))}
                                        required
                                        min="0"
                                        className={styles.formInput}
                                        readOnly
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="reducedWeeks">Số tuần chủ nhiệm:</label>
                                    <input
                                        type="number"
                                        id="reducedWeeks"
                                        value={reducedWeeks}
                                        onChange={(e) => setReducedWeeks(Number(e.target.value))}
                                        required
                                        min="0"
                                        className={styles.formInput}
                                        readOnly
                                    />
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.totalLessonsGroup}>
                                    <label>Tổng số tiết chủ nhiệm:</label>
                                    <span className={styles.totalLessons}>
                                        {reducedLessonsPerWeek * reducedWeeks}
                                    </span>
                                </div>
                                <div className={styles.buttonGroup}>
                                    <button type="submit" className={styles.submitButton}>Phân Công</button>
                                    <button type="button" onClick={() => setShowAssignPopup(false)} className={styles.cancelButton}>
                                        Hủy
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default HomeroomAssignmentModal;