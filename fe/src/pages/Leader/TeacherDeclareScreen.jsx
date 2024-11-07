import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Circles } from 'react-loader-spinner';
import { FaEdit, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import { getUser } from '../../services/authServices.js';
import { getTeacherById } from '../../services/teacherService.js';
import { getAllAssignmentTeachers, getClassSubjectInfo, createAssignment, editAssignment, deleteAssignment } from '../../services/assignmentServices.js';
import { getSubjectsByDepartment } from '../../services/subjectServices.js';
import { getClassesBySubject } from '../../services/classServices.js';
import { toast, ToastContainer } from 'react-toastify';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Modal from 'react-modal';
import 'react-toastify/dist/ReactToastify.css';
import styles from '../../css/Leader/TeacherDeclareScreen.module.css';
import TeacherAssignmentReport from './Component/TeacherAssignmentReport.jsx';
import CreateAssignmentModal from './Component/CreateAssignmentModal.jsx';

Modal.setAppElement('#root');

const TeacherDeclareScreen = () => { 
    const [user, setUser] = useState(null);
    const [teacher, setTeacher] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editValues, setEditValues] = useState({
        lessonsPerWeek: '',
        numberOfWeeks: ''
    });
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [deletingAssignment, setDeletingAssignment] = useState(null);
    const [selectedGrade, setSelectedGrade] = useState('all');
    const [maxLessons, setMaxLessons] = useState({});
    const { id } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserAndData = async () => {
            try {
                const userData = await getUser();
                setUser(userData);
                
                if (userData) {
                    if (!userData || userData.user.role !== 0) {
                        switch(userData.user.role) {
                          case 1:
                            navigate('/ministry-declare');
                            break;
                          default:
                            navigate('/login');
                        }
                    }
                    const teacherData = await getTeacherById(id);
                    if(teacherData){
                        setTeacher(teacherData);
                        const assignmentData = await getAllAssignmentTeachers(teacherData._id);
                        setAssignments(assignmentData);
                        const subjectData = await getSubjectsByDepartment(teacherData.department._id);
                        setSubjects(subjectData);
                    }
                }
                setLoading(false);
            } catch (error) {
                console.error('Error fetching data:', error);
                setLoading(false);
            }
        };
        fetchUserAndData();
    }, [navigate, id]);

    useEffect(() => {
        if (teacher && assignments) {
            const totalLessons = assignments.reduce((sum, assignment) => 
                sum + assignment.completedLessons, 0);
            
            setTeacher(prevTeacher => ({
                ...prevTeacher,
                totalAssignment: totalLessons
            }));
        }
    }, [assignments]);

    const handleCreateAssignment = async (assignments) => {
        try {
            setIsLoading(true);
            await createAssignment(assignments);
            toast.success('Phân công tiết dạy thành công');
            
            const updatedAssignments = await getAllAssignmentTeachers(teacher._id);
            setAssignments(updatedAssignments);
            
            setShowModal(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi phân công tiết dạy');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartEdit = async (assignment) => {
        try {
            const info = await getClassSubjectInfo(assignment.classId, assignment.subjectId, teacher._id);
            setMaxLessons({
                [assignment.id]: info.remainingLessons + assignment.completedLessons
            });
            setEditingId(assignment.id);
            setEditValues({
                lessonsPerWeek: assignment.lessonsPerWeek.toString(),
                numberOfWeeks: assignment.numberOfWeeks.toString()
            });
        } catch (error) {
            toast.error('Lỗi khi lấy thông tin số tiết');
        }
    };

    const handleEditSubmit = async (assignment) => {
        const lessonsPerWeek = parseInt(editValues.lessonsPerWeek);
        const numberOfWeeks = parseInt(editValues.numberOfWeeks);

        if (isNaN(lessonsPerWeek) || isNaN(numberOfWeeks) || 
            lessonsPerWeek < 0 || numberOfWeeks < 0) {
            toast.error('Số tiết một tuần và số tuần không hợp lệ');
            return;
        }

        const totalLessons = lessonsPerWeek * numberOfWeeks;
        if (totalLessons > maxLessons[assignment.id]) {
            toast.error(`Tổng số tiết không được vượt quá ${maxLessons[assignment.id]}`);
            return;
        }
        
        try {
            setIsLoading(true);
            await editAssignment(assignment.id, lessonsPerWeek, numberOfWeeks);
            toast.success('Cập nhật phân công tiết dạy thành công');
            const updatedAssignments = await getAllAssignmentTeachers(teacher._id);
            setAssignments(updatedAssignments);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật phân công tiết dạy');
        } finally {
            setIsLoading(false);
            setEditingId(null);
            setEditValues({ lessonsPerWeek: '', numberOfWeeks: '' });
            setMaxLessons({});
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
                toast.success('Xóa phân công tiết dạy thành công');
                const updatedAssignments = await getAllAssignmentTeachers(teacher._id);
                setAssignments(updatedAssignments);
            } catch (error) {
                toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa phân công tiết dạy');
            } finally {
                setIsLoading(false);
                setShowDeleteConfirmModal(false);
                setDeletingAssignment(null);
            }
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditValues({ lessonsPerWeek: '', numberOfWeeks: '' });
        setMaxLessons({});
    };

    const filteredAssignments = assignments.filter(assignment => 
        selectedGrade === 'all' ? true : assignment.grade === parseInt(selectedGrade)
    );

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <Circles color="#00BFFF" height={80} width={80} />
            </div>
        );
    }

    return(
        <>
            <Helmet>
                <title>Trang quản lý phân công tiết dạy cho giáo viên</title>
            </Helmet>
            <Header/>
            <ToastContainer />
            
            <div className={styles.container}>
                <Link to="/leader-declare" className={styles.backLink}>
                    <ArrowBackIcon/>
                </Link>
                <div className={styles.grid}>
                    <div className={styles.card}>
                        <h2 className={styles.title}>Thông tin giáo viên</h2>
                        {teacher && (
                            <>
                                <p className={styles.info}><span className={styles.label}>Tên:</span> {teacher.name}</p>
                                <p className={styles.info}><span className={styles.label}>Email:</span> {teacher.email}</p>
                                <p className={styles.info}><span className={styles.label}>Số điện thoại:</span> {teacher.phone}</p>
                                <p className={styles.info}><span className={styles.label}>Môn học giảng dạy:</span> {teacher.teachingSubjects?.name}</p>
                                <p className={styles.info}><span className={styles.label}>Tổ bộ môn:</span> {teacher.department.name}</p>
                                <p className={styles.info}><span className={styles.label}>Tổng số tiết đã phân công:</span> {teacher.totalAssignment || 0}</p>
                                <p className={styles.info}><span className={styles.label}>Số tiết chuẩn:</span> {teacher.basicTeachingLessons || 0}</p>
                                <p className={styles.info}><span className={styles.label}>Số tiết dư:</span> {
                                    teacher.basicTeachingLessons && teacher.totalAssignment > teacher.basicTeachingLessons 
                                    ? teacher.totalAssignment - teacher.basicTeachingLessons 
                                    : 0
                                }</p>
                                <p className={styles.info}><span className={styles.label}>Lớp chủ nhiệm:</span> {teacher.homeroom?.class || 'Không có'}</p>
                                <div className={styles.buttonGroup}>
                                    <button className={styles.button} onClick={() => setShowModal(true)}>Phân công tiết dạy</button>
                                    <TeacherAssignmentReport teacherId={teacher._id} />
                                </div>
                            </>
                        )}
                    </div>
                    <div className={styles.card}>
                        <div className={styles.headerSection}>
                            <h2 className={styles.title}>Danh sách lớp đã phân công</h2>
                            <select 
                                className={styles.gradeSelect}
                                value={selectedGrade}
                                onChange={(e) => setSelectedGrade(e.target.value)}
                            >
                                <option value="all">Tất cả</option>
                                <option value="10">Khối 10</option>
                                <option value="11">Khối 11</option>
                                <option value="12">Khối 12</option>
                            </select>
                        </div>
                        {assignments.length > 0 ? (
                            <div className={styles.tableContainer}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>STT</th>
                                            <th>Lớp</th>
                                            <th>Môn học</th>
                                            {editingId !== null && <th>Số tiết trống</th>}
                                            <th>Số tiết/tuần</th>
                                            <th>Số tuần</th>
                                            <th>Tổng số tiết</th>
                                            <th>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAssignments.map((assignment, index) => (
                                            <tr key={assignment.id}>
                                                <td>{index + 1}</td>
                                                <td>{assignment.className}</td>
                                                <td>{assignment.subjectName}</td>
                                                {editingId !== null && (
                                                    <td>{editingId === assignment.id ? maxLessons[assignment.id] : ''}</td>
                                                )}
                                                <td>
                                                    {editingId === assignment.id ? (
                                                        <input
                                                            type="number"
                                                            className={styles.editInput}
                                                            value={editValues.lessonsPerWeek}
                                                            onChange={(e) => {
                                                                const value = e.target.value;
                                                                const numberOfWeeks = parseInt(editValues.numberOfWeeks) || 0;
                                                                if (value === '' || 
                                                                    (parseInt(value) >= 0 && 
                                                                    parseInt(value) * numberOfWeeks <= maxLessons[assignment.id])) {
                                                                    setEditValues(prev => ({
                                                                        ...prev,
                                                                        lessonsPerWeek: value
                                                                    }));
                                                                }
                                                            }}
                                                            min="0"
                                                        />
                                                    ) : (
                                                        assignment.lessonsPerWeek
                                                    )}
                                                </td>
                                                <td>
                                                    {editingId === assignment.id ? (
                                                        <input
                                                            type="number"
                                                            className={styles.editInput}
                                                            value={editValues.numberOfWeeks}
                                                            onChange={(e) => {
                                                                const value = e.target.value;
                                                                const lessonsPerWeek = parseInt(editValues.lessonsPerWeek) || 0;
                                                                if (value === '' || 
                                                                    (parseInt(value) >= 0 && 
                                                                    lessonsPerWeek * parseInt(value) <= maxLessons[assignment.id])) {
                                                                    setEditValues(prev => ({
                                                                        ...prev,
                                                                        numberOfWeeks: value
                                                                    }));
                                                                }
                                                            }}
                                                            min="0"
                                                        />
                                                    ) : (
                                                        assignment.numberOfWeeks
                                                    )}
                                                </td>
                                                <td>
                                                    {editingId === assignment.id ? (
                                                        <div className={styles.totalLessons}>
                                                            {(parseInt(editValues.lessonsPerWeek) || 0) * 
                                                            (parseInt(editValues.numberOfWeeks) || 0)}
                                                        </div>
                                                    ) : (
                                                        assignment.completedLessons
                                                    )}
                                                </td>
                                                <td>
                                                <div className={styles.actionButtons}>
                                                        {editingId === assignment.id ? (
                                                            <div className={styles.editGroup}>
                                                                <button 
                                                                    className={styles.editAction}
                                                                    onClick={() => handleEditSubmit(assignment)}
                                                                    disabled={isLoading}
                                                                >
                                                                    <FaCheck />
                                                                </button>
                                                                <button 
                                                                    className={styles.editAction}
                                                                    onClick={handleCancelEdit}
                                                                >
                                                                    <FaTimes />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <button 
                                                                    className={styles.editButton}
                                                                    onClick={() => handleStartEdit(assignment)}
                                                                    disabled={isLoading || editingId !== null}
                                                                >
                                                                    <FaEdit />
                                                                </button>
                                                                <button
                                                                    className={styles.deleteButton}
                                                                    onClick={() => handleDelete(assignment)}
                                                                    disabled={isLoading}
                                                                >
                                                                    <FaTrash />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p>Giáo viên chưa có dữ liệu phân công</p>
                        )}
                    </div>
                </div>
            </div>

            <CreateAssignmentModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                subjects={subjects}
                teacherId={teacher?._id}
                onAssignmentCreate={handleCreateAssignment}
                existingAssignments={assignments}
            />

            <Modal
                isOpen={showDeleteConfirmModal}
                onRequestClose={() => setShowDeleteConfirmModal(false)}
                className={styles.modal}
            >
                <div className={styles.modal}>
                    <h2>Xác nhận xóa</h2>
                    <p>Bạn có chắc chắn muốn xóa phân công này?</p>
                    <div className={styles.modalButtons}>
                        <button 
                            className={styles.cancelButton} 
                            onClick={() => setShowDeleteConfirmModal(false)}
                        >
                            Hủy
                        </button>
                        <button 
                            className={styles.deleteButton} 
                            onClick={confirmDelete} 
                            disabled={isLoading}
                        >
                            {isLoading ? 
                                <Circles color="#ffffff" height={20} width={20} /> : 
                                'Xóa'
                            }
                        </button>
                    </div>
                </div>
            </Modal>

            <Footer/>
        </>
    );
};

export default TeacherDeclareScreen;