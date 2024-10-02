import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Circles } from 'react-loader-spinner';
import { FaEdit, FaTrash } from 'react-icons/fa';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import { getUser } from '../../services/authServices.js';
import { getTeacherById } from '../../services/teacherService.js';
import { getClassByDepartment } from '../../services/classServices.js';
import { getAllAssignmentTeachers, getClassSubjectInfo, createAssignment, editAssignment, deleteAssignment } from '../../services/assignmentServices.js';
import { getSubjectsByDepartment } from '../../services/subjectServices.js';
import { toast, ToastContainer } from 'react-toastify';
import Modal from 'react-modal';
import 'react-toastify/dist/ReactToastify.css';
import styles from '../../css/Leader/TeacherDeclareScreen.module.css';
import TeacherAssignmentReport from './Component/TeacherAssignmentReport.jsx';

Modal.setAppElement('#root');

const TeacherDeclareScreen = () => { 
    const [user, setUser] = useState(null);
    const [teacher, setTeacher] = useState(null);
    const [classes, setClasses] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [lessonCount, setLessonCount] = useState('');
    const [classSubjectInfo, setClassSubjectInfo] = useState({});
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [newLessonCount, setNewLessonCount] = useState('');
    const [editingClassSubjectInfo, setEditingClassSubjectInfo] = useState({});
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [deletingAssignment, setDeletingAssignment] = useState(null);
    const [classSubjectError, setClassSubjectError] = useState('');
    const { id } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserAndData = async () => {
            try {
                const userData = await getUser();
                setUser(userData);
                
                if (userData) {
                    if (userData.user && userData.user.isAdmin) {
                        navigate('/admin-dashboard');
                        return;
                    }
                    const teacherData = await getTeacherById(id);
                    if(teacherData){
                        setTeacher(teacherData);
                        const classData = await getClassByDepartment(teacherData.department._id);
                        setClasses(classData);
                        const assignmentData = await getAllAssignmentTeachers(teacherData._id);
                        setAssignments(assignmentData);
                        const subjectData = await getSubjectsByDepartment(teacherData.department._id);
                        setSubjects(subjectData);
                    }
                }
                setLoading(false);
            } catch (error) {
                console.error('Error fetching data:', error);
                setErrorMessage(error.message);
                setLoading(false);
            }
        };
        fetchUserAndData();
    }, [navigate, id]);

    useEffect(() => {
        const fetchClassSubjectInfo = async () => {
            if (selectedClass && selectedSubject) {
                try {
                    const info = await getClassSubjectInfo(selectedClass, selectedSubject);
                    setClassSubjectInfo(info);
                    setClassSubjectError('');
                } catch (error) {
                    console.error('Error fetching class subject info:', error);
                    if (error.response && error.response.status === 404) {
                        setClassSubjectError('Môn học không được khai báo trong lớp này');
                    } else {
                        toast.error('Error fetching class information');
                    }
                    setClassSubjectInfo({});
                }
            }
        };

        fetchClassSubjectInfo();
    }, [selectedClass, selectedSubject]);

    const handleClassChange = (e) => {
        setSelectedClass(e.target.value);
        setClassSubjectInfo({});
    };

    const handleSubjectChange = (e) => {
        setSelectedSubject(e.target.value);
    };

    const handleDeclare = async (e) => {
        e.preventDefault();
        if (!selectedClass || !selectedSubject || !lessonCount) {
            toast.error('Vui lòng điền đầy đủ thông tin');
            return;
        }
        
        const lessonCountInt = parseInt(lessonCount);
        if (lessonCountInt > classSubjectInfo.remainingLessons) {
            toast.error(`Số tiết không được vượt quá ${classSubjectInfo.remainingLessons}`);
            return;
        }
        
        try {
            setIsLoading(true);
            const result = await createAssignment(selectedClass, selectedSubject, teacher._id, lessonCountInt);
            setShowModal(false);
            toast.success('Khai báo tiết dạy thành công');
            
            // Cập nhật danh sách assignments
            const updatedAssignments = await getAllAssignmentTeachers(teacher._id);
            setAssignments(updatedAssignments);
            
            // Reset form
            setSelectedClass('');
            setSelectedSubject('');
            setLessonCount('');
            setClassSubjectInfo({});
        } catch (error) {
            console.error('Error creating assignment:', error);
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi khai báo tiết dạy');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = async (assignment) => {
        if (!assignment) {
            console.error('No assignment provided for editing');
            return;
        }
        setEditingAssignment(assignment);
        setNewLessonCount(assignment.completedLessons.toString());
        try {
            const info = await getClassSubjectInfo(assignment.classId, assignment.subjectId);
            setEditingClassSubjectInfo(info);
        } catch (error) {
            console.error('Error fetching class subject info:', error);
            toast.error('Error fetching class information');
        }
    };
  
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!editingAssignment) {
            toast.error('Không có thông tin khai báo để chỉnh sửa');
            return;
        }
        const newLessonsInt = parseInt(newLessonCount);
        
        const maxLessons = editingClassSubjectInfo.remainingLessons + (editingAssignment.completedLessons || 0);
        
        if (newLessonsInt > maxLessons) {
            toast.error(`Số tiết không được vượt quá ${maxLessons}`);
            return;
        }
        
        setIsLoading(true);
        try {
            await editAssignment(editingAssignment.id, newLessonsInt);
            toast.success('Cập nhật khai báo tiết dạy thành công');
            const updatedAssignments = await getAllAssignmentTeachers(teacher._id);
            setAssignments(updatedAssignments);
            setEditingAssignment(null);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật khai báo tiết dạy');
        } finally {
            setIsLoading(false);
        }
    };
        
    const handleDelete = (assignment) => {
        setDeletingAssignment(assignment);
        setShowDeleteConfirmModal(true);
    };

    const confirmDelete = async () => {
        if (deletingAssignment) {
            try {
                setIsLoading(true);
                await deleteAssignment(deletingAssignment.id);
                toast.success('Xóa khai báo tiết dạy thành công');
                const updatedAssignments = await getAllAssignmentTeachers(teacher._id);
                setAssignments(updatedAssignments);
            } catch (error) {
                toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa khai báo tiết dạy');
            } finally {
                setIsLoading(false);
                setShowDeleteConfirmModal(false);
                setDeletingAssignment(null);
            }
        }
    };

    const LoadingSpinner = () => (
        <div className={styles.loadingContainer}>
          <Circles color="#00BFFF" height={80} width={80} />
        </div>
    );

    if (loading) {
        return <LoadingSpinner />;
    }

    return(
        <>
        <Helmet>
            <title>Trang quản lý khai báo tiết dạy cho giáo viên</title>
        </Helmet>
        <Header/>
        <ToastContainer />
        
        <div className={styles.container}>
            <div className={styles.grid}>
                <div className={styles.card}>
                    <h2 className={styles.title}>Thông tin giáo viên</h2>
                    {teacher && (
                        <>
                        <p className={styles.info}><span className={styles.label}>Tên:</span> {teacher.name}</p>
                        <p className={styles.info}><span className={styles.label}>Email:</span> {teacher.email}</p>
                        <p className={styles.info}><span className={styles.label}>Số điện thoại:</span> {teacher.phone}</p>
                        <p className={styles.info}><span className={styles.label}>Chức vụ:</span> {teacher.position}</p>
                        <p className={styles.info}><span className={styles.label}>Tổ bộ môn:</span> {teacher.department.name}</p>
                        <TeacherAssignmentReport teacherId={teacher._id} />
                        </>
                    )}
                </div>
                <div className={styles.card}>
                    <h2 className={styles.title}>Danh sách lớp đã khai báo</h2>
                    {assignments.length > 0 ? (
                        <ul className={styles.assignmentList}>
                        {assignments.map((assignment, index) => (
                            <li key={assignment.id} className={styles.assignmentItem}>
                            <span>Lớp: {assignment.className}, Môn: {assignment.subjectName}, Số tiết: {assignment.completedLessons}</span>
                            <div className={styles.actionButtons}>
                                <button className={styles.editButton} onClick={() => handleEdit(assignment)} disabled={isLoading}>
                                    {isLoading ? <LoadingSpinner /> : <FaEdit />}
                                </button>
                                <button className={styles.deleteButton} onClick={() => handleDelete(assignment)} disabled={isLoading}>
                                    {isLoading ? <LoadingSpinner /> : <FaTrash />}
                                </button>
                            </div>
                            </li>
                        ))}
                        </ul>
                    ) : (
                        <p>Chưa có dữ liệu</p>
                    )}
                    <button className={styles.button} onClick={() => setShowModal(true)}>Khai báo tiết dạy</button>
                </div>
            </div>
        </div>

        <Modal
            isOpen={showModal}
            onRequestClose={() => setShowModal(false)}
            className={styles.modal}
        >
            <h2>Khai báo lớp</h2>
            <form onSubmit={handleDeclare} className={styles.form}>
                <select 
                    className={styles.select}
                    value={selectedClass} 
                    onChange={handleClassChange}
                >
                    <option value="">Chọn lớp</option>
                    {classes.map((cls) => (
                        <option key={cls._id} value={cls._id}>{cls.name}</option>
                    ))}
                </select>
                <select
                    className={styles.select}
                    value={selectedSubject}
                    onChange={handleSubjectChange}
                >
                    <option value="">Chọn môn học</option>
                    {subjects.map((subject) => (
                        <option key={subject._id} value={subject._id}>{subject.name}</option>
                    ))}
                </select>
                {classSubjectError ? (
                    <p style={{textAlign:'center', fontWeight:'600', color: '#dc2f2f'}}>{classSubjectError}</p>
                ) : classSubjectInfo.remainingLessons !== undefined ? (
                    <p>Số tiết còn trống: {classSubjectInfo.remainingLessons}</p>
                ) : null}
                <input 
                    className={styles.input}
                    type="number" 
                    placeholder="Số tiết"
                    value={lessonCount}
                    onChange={(e) => setLessonCount(e.target.value)}
                    disabled={!!classSubjectError}
                />
                <button 
                    className={styles.button} 
                    type="submit" 
                    disabled={isLoading || !!classSubjectError}
                >
                    {isLoading ? <LoadingSpinner/> : 'Khai báo tiết dạy'}
                </button>
            </form>
        </Modal>
        <Modal
            isOpen={!!editingAssignment}
            onRequestClose={() => setEditingAssignment(null)}
            className={styles.modal}
        >
            <h2>Chỉnh sửa khai báo</h2>
            {editingAssignment && (
                <form onSubmit={handleEditSubmit} className={styles.form}>
                    {editingClassSubjectInfo.remainingLessons !== undefined && (
                        <p>Số tiết còn trống: {editingClassSubjectInfo.remainingLessons + (editingAssignment?.completedLessons || 0)}</p>
                    )}
                    <input
                        className={styles.input}
                        type="number"
                        value={newLessonCount}
                        onChange={(e) => setNewLessonCount(e.target.value)}
                        // max={editingClassSubjectInfo.remainingLessons + (editingAssignment?.completedLessons || 0)}
                        required
                    />
                    <button className={styles.button} type="submit" disabled={isLoading}>
                        {isLoading ? <LoadingSpinner/> : 'Cập nhật'}
                    </button>
                </form>
            )}
        </Modal>
        <Modal
            isOpen={showDeleteConfirmModal}
            onRequestClose={() => setShowDeleteConfirmModal(false)}
            className={styles.modal}
        >
            <div className={styles.modal}>
                <h2>Xác nhận xóa</h2>
                <p>Bạn có chắc chắn muốn xóa khai báo này?</p>
                <div className={styles.modalButtons}>
                    <button className={styles.cancelButton} onClick={() => setShowDeleteConfirmModal(false)}>Hủy</button>
                    <button className={styles.deleteButton} onClick={confirmDelete} disabled={isLoading}>
                    {isLoading ? <LoadingSpinner size={20} /> : 'Xóa'}
                    </button>
                </div>
                </div>
        </Modal>

        <Footer/>
        </>
    )
}

export default TeacherDeclareScreen;