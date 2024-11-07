import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, Link } from 'react-router-dom';
import { Circles } from 'react-loader-spinner';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import { getUser } from '../../services/authServices.js';
import { getDepartmentClasses } from '../../services/statisticsServices';
import { batchEditAssignments, batchDeleteAssignments } from '../../services/assignmentServices';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Box, Typography, TextField, Select, MenuItem, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination, IconButton, Checkbox } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import styles from '../../css/Leader/LeaderClassScreen.module.css';
import CreateClassAssignmentModal from './Component/CreateClassAssignmentModal.jsx';

const LeaderClassScreen = () => {
    const [user, setUser] = useState(null);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [gradeFilter, setGradeFilter] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedClass, setSelectedClass] = useState(null);
    const [editingClass, setEditingClass] = useState(null);
    const [editingSubject, setEditingSubject] = useState(null);
    const [editValues, setEditValues] = useState({});
    const [deletingClass, setDeletingClass] = useState(null);
    const [selectedAssignments, setSelectedAssignments] = useState([]);
    const [actionLoading, setActionLoading] = useState(false);
    const [loadingClassId, setLoadingClassId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserAndClasses = async () => {
            try {
                const userData = await getUser();
                setUser(userData);
                if (userData) {
                    if (userData.user.isAdmin) {
                        navigate('/admin-dashboard');
                        return;
                    }
                    const classesData = await getDepartmentClasses();
                    if (Array.isArray(classesData) && classesData.length > 0) {
                        const sortedClasses = classesData.sort((a, b) => a.name.localeCompare(b.name));
                        setClasses(sortedClasses);
                    } else {
                        console.error('Invalid classes data:', classesData);
                        toast.error('Định dạng dữ liệu lớp học không hợp lệ. Vui lòng thử lại sau.');
                    }
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.');
            } finally {
                setLoading(false);
            }
        };
        fetchUserAndClasses();
    }, [navigate]);

    const calculateTotalDeclaredLessons = (subject, editValues, currentAssignment = null) => {
        return subject.assignments?.reduce((sum, assignment) => {
            if (assignment.id === currentAssignment?.id) {
                const lessonsPerWeek = editValues[`${assignment.teacherName}-lessonsPerWeek`];
                const numberOfWeeks = editValues[`${assignment.teacherName}-numberOfWeeks`];
                if (lessonsPerWeek && numberOfWeeks) {
                    return sum + (lessonsPerWeek * numberOfWeeks);
                }
                return sum;
            }
            const lessonsPerWeek = editValues[`${assignment.teacherName}-lessonsPerWeek`] || assignment.lessonsPerWeek;
            const numberOfWeeks = editValues[`${assignment.teacherName}-numberOfWeeks`] || assignment.numberOfWeeks;
            return sum + (lessonsPerWeek * numberOfWeeks);
        }, 0) || 0;
    };

    const calculateMaxLessons = (subject, editValues, currentAssignment) => {
        const totalLessons = subject.lessonCount;
        const totalDeclared = calculateTotalDeclaredLessons(subject, editValues, currentAssignment);
        const currentAssignmentLessons = currentAssignment ? (
            (editValues[`${currentAssignment.teacherName}-lessonsPerWeek`] || 0) *
            (editValues[`${currentAssignment.teacherName}-numberOfWeeks`] || 0)
        ) : 0;
        return totalLessons - (totalDeclared - currentAssignmentLessons);
    };

    const handleInputChange = (assignmentTeacherName, field, value, subject, currentAssignment) => {
        if (value === '') {
            setEditValues(prev => ({
                ...prev,
                [`${assignmentTeacherName}-${field}`]: ''
            }));
            return;
        }

        const newValue = parseInt(value);
        if (newValue <= 0) {
            toast.error('Vui lòng nhập số lớn hơn 0');
            return;
        }

        const otherField = field === 'lessonsPerWeek' ? 'numberOfWeeks' : 'lessonsPerWeek';
        const otherValue = editValues[`${assignmentTeacherName}-${otherField}`] || 
                        (field === 'lessonsPerWeek' ? currentAssignment.numberOfWeeks : currentAssignment.lessonsPerWeek);

        const proposedDeclaredLessons = newValue * otherValue;
        const maxLessons = calculateMaxLessons(subject, editValues, currentAssignment);

        if (proposedDeclaredLessons > maxLessons) {
            const maxFieldValue = Math.floor(maxLessons / otherValue);
            toast.warning(`Giá trị tối đa có thể nhập là ${maxFieldValue} để không vượt quá ${maxLessons} tiết`);
            
            setEditValues(prev => ({
                ...prev,
                [`${assignmentTeacherName}-${field}`]: maxFieldValue
            }));
        } else {
            setEditValues(prev => ({
                ...prev,
                [`${assignmentTeacherName}-${field}`]: newValue
            }));
        }
    };

    const getMaxInputValue = (assignmentTeacherName, field, subject, currentAssignment) => {
        const maxLessons = calculateMaxLessons(subject, editValues, currentAssignment);
        const otherField = field === 'lessonsPerWeek' ? 'numberOfWeeks' : 'lessonsPerWeek';
        const otherValue = editValues[`${assignmentTeacherName}-${otherField}`] || 
                        (field === 'lessonsPerWeek' ? currentAssignment.numberOfWeeks : currentAssignment.lessonsPerWeek);

        if (!otherValue) return maxLessons;
        return Math.floor(maxLessons / otherValue);
    };

    const handleSearchChange = (event) => {
        setSearchQuery(event.target.value);
        setPage(0);
    };

    const handleGradeFilterChange = (event) => {
        setGradeFilter(event.target.value);
        setPage(0);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleOpenModal = (classItem, subject) => {
        setSelectedClass({ ...classItem, subject });
        setIsModalOpen(true);
    };

    const handleStartEdit = (classItem, subject) => {
        setEditingClass(classItem._id);
        setEditingSubject(subject.subject._id);
        const initialValues = {};
        subject.assignments.forEach(assignment => {
            initialValues[`${assignment.teacherName}-lessonsPerWeek`] = assignment.lessonsPerWeek;
            initialValues[`${assignment.teacherName}-numberOfWeeks`] = assignment.numberOfWeeks;
        });
        setEditValues(initialValues);
        setDeletingClass(null);
        setSelectedAssignments([]);
    };

    const handleSaveEdit = async (classItem, subject) => {
        try {
            const hasInvalidInput = subject.assignments.some(assignment => {
                const lessonsPerWeek = editValues[`${assignment.teacherName}-lessonsPerWeek`];
                const numberOfWeeks = editValues[`${assignment.teacherName}-numberOfWeeks`];
                return !lessonsPerWeek || lessonsPerWeek <= 0 || !numberOfWeeks || numberOfWeeks <= 0;
            });

            if (hasInvalidInput) {
                toast.error('Vui lòng nhập số tiết/tuần và số tuần lớn hơn 0');
                return;
            }

            setActionLoading(true);
            setLoadingClassId(classItem._id);

            const updatedAssignments = subject.assignments.map(assignment => ({
                assignmentId: assignment.id,
                lessonsPerWeek: parseInt(editValues[`${assignment.teacherName}-lessonsPerWeek`]),
                numberOfWeeks: parseInt(editValues[`${assignment.teacherName}-numberOfWeeks`])
            }));

            await batchEditAssignments(updatedAssignments);

            const classesData = await getDepartmentClasses();
            if (Array.isArray(classesData) && classesData.length > 0) {
                const sortedClasses = classesData.sort((a, b) => a.name.localeCompare(b.name));
                setClasses(sortedClasses);
            }

            setEditingClass(null);
            setEditingSubject(null);
            setEditValues({});
            toast.success('Cập nhật phân công thành công');
        } catch (error) {
            toast.error(error.message || 'Có lỗi xảy ra khi cập nhật phân công');
        } finally {
            setActionLoading(false);
            setLoadingClassId(null);
        }
    };

    const handleStartDelete = (classItem) => {
        setDeletingClass(classItem._id);
        setSelectedAssignments([]);
        setEditingClass(null);
        setEditingSubject(null);
        setEditValues({});
    };

    const handleDeleteSelected = async () => {
        try {
            if (selectedAssignments.length === 0) {
                toast.warning('Vui lòng chọn ít nhất một phân công để xóa');
                return;
            }

            setActionLoading(true);
            setLoadingClassId(deletingClass);
            await batchDeleteAssignments(selectedAssignments);

            const classesData = await getDepartmentClasses();
            if (Array.isArray(classesData) && classesData.length > 0) {
                const sortedClasses = classesData.sort((a, b) => a.name.localeCompare(b.name));
                setClasses(sortedClasses);
            }

            setDeletingClass(null);
            setSelectedAssignments([]);
            toast.success('Xóa phân công thành công');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa phân công');
        } finally {
            setActionLoading(false);
            setLoadingClassId(null);
        }
    };

    const handleCheckAssignment = (assignmentId) => {
        setSelectedAssignments(prev =>
            prev.includes(assignmentId)
                ? prev.filter(id => id !== assignmentId)
                : [...prev, assignmentId]
        );
    };

    const filteredClasses = classes.filter((classItem) =>
        classItem.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (gradeFilter === '' || classItem.grade === parseInt(gradeFilter))
    );

    const paginatedClasses = filteredClasses.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    const uniqueGrades = [...new Set(classes.map(classItem => classItem.grade))];

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <Circles type="TailSpin" color="#00BFFF" height={80} width={80} />
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>Thống kê lớp học tổ bộ môn</title>
            </Helmet>
            <Header />
            <div className={styles.dashboardLeader}>
                <Box m="20px">
                    <Link to="/leader-declare" style={{ textDecoration: 'none', paddingBottom: '5px', fontSize: '20px' }}>
                        <ArrowBackIcon />
                    </Link>
                    <Typography variant="h4" mb={2} style={{ marginTop: '10px' }}>
                        Thống kê lớp học tổ bộ môn
                    </Typography>
                    <Box mb={2}>
                        <Typography>Tổng số lớp: {classes.length}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={3}>
                        <TextField
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder="Tìm kiếm theo tên lớp"
                            style={{ width: '30%' }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Box display="flex" alignItems="center">
                            <Select
                                value={gradeFilter}
                                onChange={handleGradeFilterChange}
                                displayEmpty
                                style={{ width: '200px', marginRight: '10px' }}
                            >
                                <MenuItem value="">Tất cả khối</MenuItem>
                                {uniqueGrades.map((grade) => (
                                    <MenuItem key={grade} value={grade}>Khối {grade}</MenuItem>
                                ))}
                            </Select>
                        </Box>
                    </Box>
                    <div className={styles.tableWrapper}>
                    <TableContainer component={Paper} className={styles.tableContainer}>
                        <Table stickyHeader className={styles.table}>
                            <TableHead>
                                <TableRow>
                                    <TableCell style={{width: '30px', textAlign: 'center'}}>STT</TableCell>
                                    <TableCell>Mã lớp</TableCell>
                                    <TableCell>Môn học</TableCell>
                                    <TableCell style={{textAlign: 'center'}}>Số tiết</TableCell>
                                    <TableCell style={{width: '80px', textAlign: 'center'}}>Tổng số tiết khai báo</TableCell>
                                    <TableCell style={{width: '80px', textAlign: 'center'}}>Số tiết còn lại</TableCell>
                                    <TableCell>Giáo viên</TableCell>
                                    {editingClass && <TableCell style={{width: '50px', textAlign: 'center'}}>Số tiết tối đa</TableCell>}
                                    <TableCell style={{width: '80px', textAlign: 'center'}}>Số tiết/tuần</TableCell>
                                    <TableCell style={{width: '60px', textAlign: 'center'}}>Số tuần</TableCell>
                                    <TableCell style={{width: '70px', textAlign: 'center'}}>Số tiết khai báo</TableCell>
                                    {deletingClass && <TableCell align="center">Chọn</TableCell>}
                                    <TableCell align="center" style={{width: '130px', textAlign: 'center'}}>Thao tác</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedClasses.flatMap((classItem, index) => {
                                    const rowSpan = classItem.subjects?.reduce((sum, subject) =>
                                        sum + ((subject.assignments?.length || 0) || 1), 0) || 1;
                                    return (classItem.subjects || []).flatMap((subject, subjectIndex) => {
                                        const subjectRowSpan = subject.assignments?.length || 1;
                                        const totalDeclaredLessons = calculateTotalDeclaredLessons(subject, editValues);
                                        const remainingLessons = subject.lessonCount - totalDeclaredLessons;
                                        const isEditing = editingClass === classItem._id && editingSubject === subject.subject._id;
                                        const isDeleting = deletingClass === classItem._id;

                                        return (subject.assignments?.length > 0 ? (
                                            (subject.assignments || []).map((assignment, assignmentIndex) => {
                                                const maxLessons = calculateMaxLessons(subject, editValues, assignment);
                                                const currentDeclaredLessons = editValues[`${assignment.teacherName}-lessonsPerWeek`] && editValues[`${assignment.teacherName}-numberOfWeeks`]
                                                    ? editValues[`${assignment.teacherName}-lessonsPerWeek`] * editValues[`${assignment.teacherName}-numberOfWeeks`]
                                                    : assignment.lessonsPerWeek * assignment.numberOfWeeks;

                                                return (
                                                    <TableRow key={`${classItem._id}-${subject.subject.name}-${assignmentIndex}`}>
                                                        {subjectIndex === 0 && assignmentIndex === 0 && (
                                                            <>
                                                                <TableCell style={{textAlign: 'center'}} rowSpan={rowSpan}>{page * rowsPerPage + index + 1}</TableCell>
                                                                <TableCell rowSpan={rowSpan}>{classItem.name}</TableCell>
                                                            </>
                                                        )}
                                                        {assignmentIndex === 0 && (
                                                            <>
                                                                <TableCell rowSpan={subjectRowSpan}>{subject.subject.name}</TableCell>
                                                                <TableCell rowSpan={subjectRowSpan} style={{textAlign: 'center'}}>{subject.lessonCount}</TableCell>
                                                                <TableCell rowSpan={subjectRowSpan} style={{textAlign: 'center'}}>{totalDeclaredLessons}</TableCell>
                                                                <TableCell rowSpan={subjectRowSpan} style={{textAlign: 'center'}}>{remainingLessons}</TableCell>
                                                            </>
                                                        )}
                                                        <TableCell>{assignment.teacherName}</TableCell>
                                                        {editingClass && (
                                                            <TableCell style={{textAlign: 'center'}}>
                                                                {isEditing ? maxLessons : ''}
                                                            </TableCell>
                                                        )}
                                                        <TableCell style={{textAlign: 'center'}}>
                                                            {isEditing ? (
                                                                <Box>
                                                                    <TextField
                                                                        type="number"
                                                                        className={styles.editInput}
                                                                        value={editValues[`${assignment.teacherName}-lessonsPerWeek`] || ''}
                                                                        onChange={(e) => handleInputChange(
                                                                            assignment.teacherName,
                                                                            'lessonsPerWeek',
                                                                            e.target.value,
                                                                            subject,
                                                                            assignment
                                                                        )}
                                                                        size="small"
                                                                        inputProps={{ min: 1 }}
                                                                    />
                                                                    <Typography variant="caption" display="block" color="textSecondary">
                                                                        Max: {getMaxInputValue(assignment.teacherName, 'lessonsPerWeek', subject, assignment)}
                                                                    </Typography>
                                                                </Box>
                                                            ) : assignment.lessonsPerWeek}
                                                        </TableCell>
                                                        <TableCell style={{textAlign: 'center'}}>
                                                            {isEditing ? (
                                                                <Box>
                                                                    <TextField
                                                                        type="number"
                                                                        className={styles.editInput}
                                                                        value={editValues[`${assignment.teacherName}-numberOfWeeks`] || ''}
                                                                        onChange={(e) => handleInputChange(
                                                                            assignment.teacherName,
                                                                            'numberOfWeeks',
                                                                            e.target.value,
                                                                            subject,
                                                                            assignment
                                                                        )}
                                                                        size="small"
                                                                        inputProps={{ min: 1 }}
                                                                    />
                                                                    <Typography variant="caption" display="block" color="textSecondary">
                                                                        Max: {getMaxInputValue(assignment.teacherName, 'numberOfWeeks', subject, assignment)}
                                                                    </Typography>
                                                                </Box>
                                                            ) : assignment.numberOfWeeks}
                                                        </TableCell>
                                                        <TableCell style={{textAlign: 'center'}}>{currentDeclaredLessons}</TableCell>
                                                        {deletingClass && (
                                                            <TableCell align="center">
                                                                {isDeleting && (
                                                                    <Checkbox
                                                                        checked={selectedAssignments.includes(assignment.id)}
                                                                        onChange={() => handleCheckAssignment(assignment.id)}
                                                                        disabled={actionLoading && loadingClassId === classItem._id}
                                                                    />
                                                                )}
                                                            </TableCell>
                                                        )}
                                                        {subjectIndex === 0 && assignmentIndex === 0 && (
                                                            <TableCell rowSpan={rowSpan} align="center" style={{textAlign: 'center'}}>
                                                                {isEditing ? (
                                                                    <div className={styles.buttonsContainer}>
                                                                        <IconButton
                                                                            className={styles.actionIcon}
                                                                            onClick={() => handleSaveEdit(classItem, subject)}
                                                                            disabled={actionLoading && loadingClassId === classItem._id}
                                                                        >
                                                                            {actionLoading && loadingClassId === classItem._id ? (
                                                                                <div style={{ width: 24, height: 24 }}>
                                                                                    <Circles color="#1976d2" height={24} width={24} />
                                                                                </div>
                                                                            ) : (
                                                                                <SaveIcon style={{ color: "#4caf50" }} />
                                                                            )}
                                                                        </IconButton>
                                                                        <IconButton
                                                                            className={styles.actionIcon}
                                                                            onClick={() => {
                                                                                setEditingClass(null);
                                                                                setEditingSubject(null);
                                                                                setEditValues({});
                                                                            }}
                                                                            disabled={actionLoading && loadingClassId === classItem._id}
                                                                        >
                                                                            <CancelIcon style={{ color: "#f44336" }} />
                                                                        </IconButton>
                                                                    </div>
                                                                ) : isDeleting ? (
                                                                    <div className={styles.buttonsContainer}>
                                                                        <IconButton
                                                                            className={`${styles.actionIcon} ${styles.deleteIcon}`}
                                                                            onClick={handleDeleteSelected}
                                                                            disabled={actionLoading && loadingClassId === classItem._id}
                                                                        >
                                                                            {actionLoading && loadingClassId === classItem._id ? (
                                                                                <div style={{ width: 24, height: 24 }}>
                                                                                    <Circles color="#d32f2f" height={24} width={24} />
                                                                                </div>
                                                                            ) : (
                                                                                <DeleteIcon style={{ color: "#f44336" }} />
                                                                            )}
                                                                        </IconButton>
                                                                        <IconButton
                                                                            className={styles.actionIcon}
                                                                            onClick={() => setDeletingClass(null)}
                                                                            disabled={actionLoading && loadingClassId === classItem._id}
                                                                        >
                                                                            <CancelIcon style={{ color: "#f44336" }} />
                                                                        </IconButton>
                                                                    </div>
                                                                ) : (
                                                                    <div className={styles.buttonsContainer}>
                                                                        <IconButton
                                                                            className={styles.actionIcon}
                                                                            onClick={() => handleStartEdit(classItem, subject)}
                                                                            disabled={actionLoading && loadingClassId === classItem._id}
                                                                        >
                                                                            {actionLoading && loadingClassId === classItem._id ? (
                                                                                <div style={{ width: 24, height: 24 }}>
                                                                                    <Circles color="#1976d2" height={24} width={24} />
                                                                                </div>
                                                                            ) : (
                                                                                <EditIcon style={{ color: "#4caf50" }} />
                                                                            )}
                                                                        </IconButton>
                                                                        <IconButton
                                                                            className={`${styles.actionIcon} ${styles.deleteIcon}`}
                                                                            onClick={() => handleStartDelete(classItem)}
                                                                            disabled={actionLoading}
                                                                        >
                                                                            <DeleteIcon style={{ color: "#f44336" }} />
                                                                        </IconButton>
                                                                        <IconButton
                                                                            className={styles.actionIcon}
                                                                            onClick={() => handleOpenModal(classItem, subject)}
                                                                            disabled={actionLoading}
                                                                        >
                                                                            <AddCircleIcon style={{ color: "#113f67" }} />
                                                                        </IconButton>
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                );
                                            })
                                        ) : (
                                            <TableRow key={`${classItem._id}-${subject.subject.name}`}>
                                                {subjectIndex === 0 && (
                                                    <>
                                                        <TableCell rowSpan={rowSpan}>{page * rowsPerPage + index + 1}</TableCell>
                                                        <TableCell rowSpan={rowSpan}>{classItem.name}</TableCell>
                                                    </>
                                                )}
                                                <TableCell>{subject.subject.name}</TableCell>
                                                <TableCell style={{textAlign: 'center'}}>{subject.lessonCount}</TableCell>
                                                <TableCell style={{textAlign: 'center'}}>0</TableCell>
                                                <TableCell style={{textAlign: 'center'}}>{subject.lessonCount}</TableCell>
                                                <TableCell>Chưa phân công</TableCell>
                                                {editingClass && <TableCell></TableCell>}
                                                <TableCell style={{textAlign: 'center'}}>0</TableCell>
                                                <TableCell style={{textAlign: 'center'}}>0</TableCell>
                                                <TableCell style={{textAlign: 'center'}}>0</TableCell>
                                                {deletingClass && <TableCell></TableCell>}
                                                {subjectIndex === 0 && (
                                                    <TableCell rowSpan={rowSpan} align="center">
                                                        <IconButton
                                                            className={styles.actionIcon}
                                                            onClick={() => handleOpenModal(classItem, subject)}
                                                            disabled={actionLoading}
                                                        >
                                                            <AddCircleIcon style={{ color: "#113f67" }} />
                                                        </IconButton>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ));
                                    });
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                        <TablePagination
                            rowsPerPageOptions={[25, 50, 100]}
                            component="div"
                            count={filteredClasses.length}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={handleChangePage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            style={{ overflow: 'unset' }}
                        />
                    </div>
                </Box>
            </div>
            {selectedClass && (
                <CreateClassAssignmentModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedClass(null);
                    }}
                    classData={selectedClass}
                    onAssignmentCreate={async () => {
                        const classesData = await getDepartmentClasses();
                        if (Array.isArray(classesData) && classesData.length > 0) {
                            const sortedClasses = classesData.sort((a, b) => a.name.localeCompare(b.name));
                            setClasses(sortedClasses);
                        }
                    }}
                />
            )}
            <Footer />
            <ToastContainer />
        </>
    );
};

export default LeaderClassScreen;