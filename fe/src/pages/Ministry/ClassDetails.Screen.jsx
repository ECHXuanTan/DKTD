import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getClassById, updateSubjectLessonCount, removeSubjectFromClass, addSubjectToClass, deleteClass } from '../../services/classServices';
import { getUser } from '../../services/authServices';
import { getSubject } from '../../services/subjectServices.js';
import { Helmet } from 'react-helmet';
import { Circles } from 'react-loader-spinner';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import Modal from 'react-modal';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from '../../css/Ministry/ClassDetail.module.css';
import { FaEdit, FaTrash, FaPlus, FaArrowLeft } from 'react-icons/fa'; 

Modal.setAppElement('#root');

const ClassDetail = () => {
    const [user, setUser] = useState(null);
    const [classDetail, setClass] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editModalIsOpen, setEditModalIsOpen] = useState(false);
    const [deleteModalIsOpen, setDeleteModalIsOpen] = useState(false);
    const [deleteClassModalIsOpen, setDeleteClassModalIsOpen] = useState(false);
    const [currentSubject, setCurrentSubject] = useState(null);
    const [newLessonCount, setNewLessonCount] = useState('');
    const [addModalIsOpen, setAddModalIsOpen] = useState(false);
    const [allSubjects, setAllSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [newSubjectLessonCount, setNewSubjectLessonCount] = useState('');
    const { id } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchClass = async () => {
          try {
            const userData = await getUser();
            setUser(userData);
            
            if (userData) {
                if (!userData || userData.user.role !== 1) {
                    // Redirect based on user role
                    switch(userData.user.role) {
                        case 2:
                        navigate('/admin-dashboard');
                        break;
                        case 0:
                        navigate('/user-dashboard');
                        break;
                        default:
                        navigate('/login');
                    }
                }
                const data = await getClassById(id);
                setClass(data);
                const subjectsData = await getSubject();
                setAllSubjects(subjectsData);
            }
            setLoading(false);
          } catch (err) {
            setError(err.message);
            setLoading(false);
            toast.error('Tải dữ liệu thất bại');
          }
        };
    
        fetchClass();
      }, [id, navigate]);

    const handleEdit = (subject) => {
        setCurrentSubject(subject);
        setNewLessonCount(subject.lessonCount);
        setEditModalIsOpen(true);
    };

    const handleDelete = (subject) => {
        setCurrentSubject(subject);
        setDeleteModalIsOpen(true);
    };

    const handleUpdateSubject = async () => {
        try {
            await updateSubjectLessonCount(id, currentSubject.subject._id, parseInt(newLessonCount));
            const updatedSubjects = classDetail.subjects.map(subject => 
                subject.subject._id === currentSubject.subject._id 
                    ? {...subject, lessonCount: parseInt(newLessonCount)} 
                    : subject
            );
            setClass({...classDetail, subjects: updatedSubjects});
            setEditModalIsOpen(false);
            toast.success('Cập nhật môn học thành công');
        } catch (err) {
            toast.error('Cập nhật môn học thất bại');
        }
    };

    const handleRemoveSubject = async () => {
        try {
            await removeSubjectFromClass(id, currentSubject.subject._id);
            const updatedSubjects = classDetail.subjects.filter(subject => subject.subject._id !== currentSubject.subject._id);
            setClass({...classDetail, subjects: updatedSubjects});
            setDeleteModalIsOpen(false);
            toast.success('Xóa môn học thành công');
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message === 'Không thể xóa môn học đã được phân công giảng dạy') {
                toast.error('Không thể xóa môn học đã được phân công giảng dạy');
            } else {
                toast.error('Xóa môn học thất bại');
            }
            setDeleteModalIsOpen(false);
        }
    };

    const handleAddSubject = async () => {
        try {
            const response = await addSubjectToClass(id, selectedSubject, parseInt(newSubjectLessonCount));
            
            const addedSubject = allSubjects.find(subject => subject._id === selectedSubject);
            
            const updatedClass = {
                ...classDetail,
                subjects: [
                    ...classDetail.subjects,
                    {
                        _id: response.class.subjects[response.class.subjects.length - 1]._id,
                        subject: {
                            _id: addedSubject._id,
                            name: addedSubject.name
                        },
                        lessonCount: parseInt(newSubjectLessonCount)
                    }
                ]
            };
            
            setClass(updatedClass);
            setAddModalIsOpen(false);
            setSelectedSubject('');
            setNewSubjectLessonCount('');
            toast.success('Thêm môn học thành công');
        } catch (err) {
            if (err.response && err.response.status === 400) {
                toast.error(err.response.data.message || 'Thêm môn học thất bại');
            } else {
                toast.error('Thêm môn học thất bại. Vui lòng thử lại sau.');
            }
        }
    };

    const handleDeleteClass = async () => {
        try {
            await deleteClass(id);
            toast.success('Xóa lớp học thành công');
            navigate('/ministry-class');
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message === 'Không thể xóa lớp học đã có môn được phân công giảng dạy') {
                toast.error('Không thể xóa lớp học đã có môn được phân công giảng dạy');
            } else {
                toast.error('Xóa lớp học thất bại');
            }
        }
        setDeleteClassModalIsOpen(false);
    };

    if (loading) {
        return (
          <div className="loading-container">
            <Circles type="TailSpin" color="#00BFFF" height={80} width={80} />
          </div>
        );
    }
    
    if (error) {
        return <div className="error-message">{error}</div>;
    }
    
    return (
        <>
            <Helmet>
                <title>Thông tin chi tiết của lớp {classDetail.name}</title>
            </Helmet>
            <Header />
            <main className={styles.container}>
            <Link to="/ministry-class" className={styles.backButton}>
                <FaArrowLeft /> 
            </Link>
                <div className={styles.header}>
                    <h1 className={styles.title}>{classDetail.name}</h1>
                    <p className={styles.subtitle}>Thông tin chi tiết lớp học</p>
                </div>
                <div className={styles.info}>
                    <div className={styles.infoItem}>
                        <p className={styles.infoLabel}>Khối</p>
                        <p>{classDetail.grade}</p>
                    </div>
                    <div className={styles.infoItem}>
                        <p className={styles.infoLabel}>Cơ sở</p>
                        <p>{classDetail.campus}</p>
                    </div>
                </div>
                <h2>Danh sách môn học</h2>
                <button className={styles.addSubjectCard} onClick={() => setAddModalIsOpen(true)}>
                    <FaPlus /> Thêm môn học
                </button>
                <button className={styles.deleteClassButton} onClick={() => setDeleteClassModalIsOpen(true)}>
                    <FaTrash /> Xóa lớp học
                </button>
                <div className={styles.subjectsGrid}>
                    {classDetail.subjects.map((subject) => (
                        <div key={subject._id} className={styles.subjectCard}>
                            <h3 className={styles.subjectName}>{subject.subject.name}</h3>
                            <p className={styles.lessonCount}>Số tiết: {subject.lessonCount}</p>
                            <div className={styles.actionButtons}>
                                <button 
                                    onClick={() => handleEdit(subject)}
                                    className={styles.editButton}
                                >
                                    <FaEdit /> Chỉnh sửa
                                </button>
                                <button 
                                    onClick={() => handleDelete(subject)}
                                    className={styles.deleteButton}
                                >
                                    <FaTrash /> Xóa
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
            <Footer />

            <Modal
                isOpen={editModalIsOpen}
                onRequestClose={() => setEditModalIsOpen(false)}
                contentLabel="Edit Subject"
                className={styles.modal}
                overlayClassName={styles.overlay}
            >
                <h2>Điều chỉnh khai báo môn học</h2>
                <p>Môn học: {currentSubject?.subject.name}</p>
                <label>
                    Khai báo tiết học:
                    <input
                        type="number"
                        value={newLessonCount}
                        onChange={(e) => setNewLessonCount(e.target.value)}
                    />
                </label>
                <button onClick={handleUpdateSubject}>Cập nhật</button>
                <button onClick={() => setEditModalIsOpen(false)}>Hủy</button>
            </Modal>

            <Modal
                isOpen={deleteModalIsOpen}
                onRequestClose={() => setDeleteModalIsOpen(false)}
                contentLabel="Delete Subject"
                className={styles.modal}
                overlayClassName={styles.overlay}
            >
                <h2>Xóa môn học</h2>
                <p>Bạn có chắc muốn xóa {currentSubject?.subject.name} khỏi lớp?</p>
                <button onClick={handleRemoveSubject}>Xóa</button>
                <button onClick={() => setDeleteModalIsOpen(false)}>Hủy</button>
            </Modal>

            <Modal
                isOpen={addModalIsOpen}
                onRequestClose={() => setAddModalIsOpen(false)}
                contentLabel="Add Subject"
                className={styles.modal}
                overlayClassName={styles.overlay}
            >
                <h2>Thêm môn học mới</h2>
                <select 
                    value={selectedSubject} 
                    onChange={(e) => setSelectedSubject(e.target.value)}
                >
                    <option value="">Chọn môn học</option>
                    {allSubjects.map((subject) => (
                        <option key={subject._id} value={subject._id}>
                            {subject.name}
                        </option>
                    ))}
                </select>
                <label>
                    Số tiết học:
                    <input
                        type="number"
                        value={newSubjectLessonCount}
                        onChange={(e) => setNewSubjectLessonCount(e.target.value)}
                    />
                </label>
                <button onClick={handleAddSubject}>Thêm</button>
                <button onClick={() => setAddModalIsOpen(false)}>Hủy</button>
            </Modal>

            <Modal
                isOpen={deleteClassModalIsOpen}
                onRequestClose={() => setDeleteClassModalIsOpen(false)}
                contentLabel="Delete Class"
                className={styles.modal}
                overlayClassName={styles.overlay}
            >
                <h2>Xóa lớp học</h2>
                <p>Bạn có chắc muốn xóa lớp {classDetail.name}?</p>
                <p>Lưu ý: Lớp học không thể được xóa nếu đã có môn học được phân công giảng dạy.</p>
                <button onClick={handleDeleteClass}>Xóa</button>
                <button onClick={() => setDeleteClassModalIsOpen(false)}>Hủy</button>
            </Modal>

            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
        </>
    );
}

export default ClassDetail;