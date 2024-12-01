import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, Link } from 'react-router-dom';
import { Circles } from 'react-loader-spinner';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import { getUser } from '../../services/authServices.js';
import { getDepartmentClasses } from '../../services/statisticsServices';
import { batchEditAssignments, batchDeleteAssignments } from '../../services/assignmentServices';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Box, Typography, TextField, Select, MenuItem, InputAdornment, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination, IconButton, Checkbox } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import styles from '../../css/Leader/LeaderClassScreen.module.css';
import CreateClassAssignmentModal from './Component/CreateClassAssignmentModal.jsx';
import ExportDepartmentTeachersExcel from './Component/Class/ExportDepartmentTeachersExcel.jsx';
import ImportAssignmentsModal from './Component/Class/ImportAssignmentsModal.jsx';

const LeaderClassScreen = () => {
    const [user, setUser] = useState(null);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [gradeFilter, setGradeFilter] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedClass, setSelectedClass] = useState(null);
    const [editingClass, setEditingClass] = useState(null);
    const [editingSubject, setEditingSubject] = useState(null);
    const [editValues, setEditValues] = useState({});
    const [deletingClass, setDeletingClass] = useState(null);
    const [selectedAssignments, setSelectedAssignments] = useState([]);
    const [actionLoading, setActionLoading] = useState(false);
    const [loadingClassId, setLoadingClassId] = useState(null);
    const [subjectFilter, setSubjectFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
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

    const uniqueSubjects = [...new Set(classes.flatMap(classItem => 
        classItem.subjects.map(subject => subject.subject.name)
    ))].sort();

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

    const handleStatusFilterChange = (event) => {
        setStatusFilter(event.target.value);
        setPage(0);
    };

    const handleStartEdit = (classItem, subject) => {
        setEditingClass(classItem._id);
        setEditingSubject(subject.subject._id);
        const initialValues = {};
        subject.assignments.forEach(assignment => {
            initialValues[`${assignment.teacherName}-completedLessons`] = assignment.completedLessons;
        });
        setEditValues(initialValues);
        setDeletingClass(null);
        setSelectedAssignments([]);
    };
    
    const handleSaveEdit = async (classItem, subject) => {
        try {
            const hasInvalidInput = subject.assignments.some(assignment => {
                const completedLessons = editValues[`${assignment.teacherName}-completedLessons`];
                return !completedLessons || completedLessons <= 0;
            });
    
            if (hasInvalidInput) {
                toast.error('Vui lòng nhập số tiết lớn hơn 0');
                return;
            }
    
            setActionLoading(true);
            setLoadingClassId(classItem._id);
    
            const updatedAssignments = subject.assignments.map(assignment => ({
                assignmentId: assignment.id,
                completedLessons: parseInt(editValues[`${assignment.teacherName}-completedLessons`])
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
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật phân công');
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

    const filteredClasses = classes.filter((classItem) => {
        const nameMatch = classItem.name.toLowerCase().includes(searchQuery.toLowerCase());
        const gradeMatch = gradeFilter === '' || classItem.grade === parseInt(gradeFilter);
        const subjectMatch = subjectFilter === '' || classItem.subjects.some(
            subject => subject.subject.name === subjectFilter
        );

        // Add status filter logic
        const statusMatch = statusFilter === '' || classItem.subjects.every(subject => {
            const totalDeclaredLessons = subject.assignments?.reduce((sum, a) => sum + a.completedLessons, 0) || 0;
            const remainingLessons = subject.lessonCount - totalDeclaredLessons;
            return statusFilter === 'completed' ? remainingLessons === 0 : remainingLessons > 0;
        });

        return nameMatch && gradeMatch && subjectMatch && statusMatch;
    });

    const paginatedClasses = filteredClasses.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    const uniqueGrades = [...new Set(classes.map(classItem => classItem.grade))];

    const handleSubjectFilterChange = (event) => {
        setSubjectFilter(event.target.value);
        setPage(0);
    };

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
                        <Box display="flex" alignItems="center" gap="10px">
                        <TextField
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder="Tìm kiếm theo tên lớp"
                            style={{ flexGrow: 1 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Select
                            value={gradeFilter}
                            onChange={handleGradeFilterChange}
                            displayEmpty
                            style={{ width: '200px'}}
                        >
                            <MenuItem value="">Tất cả khối</MenuItem>
                            {uniqueGrades.map((grade) => (
                                <MenuItem key={grade} value={grade}>Khối {grade}</MenuItem>
                            ))}
                        </Select>
                        <Select
                            value={subjectFilter}
                            onChange={handleSubjectFilterChange}
                            displayEmpty
                            style={{ minWidth: '180px' }}
                        >
                            <MenuItem value="">Tất cả môn học</MenuItem>
                            {uniqueSubjects.map((subject) => (
                                <MenuItem key={subject} value={subject}>{subject}</MenuItem>
                            ))}
                        </Select>
                        <Select
                            value={statusFilter}
                            onChange={handleStatusFilterChange}
                            displayEmpty
                            style={{ minWidth: '180px' }}
                        >
                            <MenuItem value="">Tất cả trạng thái</MenuItem>
                            <MenuItem value="completed">Đã hoàn thành</MenuItem>
                            <MenuItem value="incomplete">Chưa hoàn thành</MenuItem>
                        </Select>
                        </Box>

                        <Box display="flex" alignItems="center">
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={() => setIsImportModalOpen(true)}
                                startIcon={<CloudUploadIcon />}
                                style={{ marginRight: '10px', fontWeight: 'bold', borderRadius: '26px' }}
                            >
                                Tạo phân công
                            </Button>
                            <ExportDepartmentTeachersExcel />
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
                                        const totalDeclaredLessons = subject.assignments?.reduce((sum, a) => sum + a.completedLessons, 0) || 0;
                                        const remainingLessons = subject.lessonCount - totalDeclaredLessons;
                                        const isEditing = editingClass === classItem._id && editingSubject === subject.subject._id;
                                        const isDeleting = deletingClass === classItem._id;

                                        return (subject.assignments?.length > 0 ? (
                                            (subject.assignments || []).map((assignment, assignmentIndex) => {
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
                                                                {isEditing ? remainingLessons + assignment.completedLessons : ''}
                                                            </TableCell>
                                                        )}
                                                        <TableCell style={{textAlign: 'center'}}>
                                                            {isEditing ? (
                                                                <Box>
                                                                    <TextField
                                                                        type="number"
                                                                        className={styles.editInput}
                                                                        value={editValues[`${assignment.teacherName}-completedLessons`] || ''}
                                                                        onChange={(e) => {
                                                                            const value = e.target.value;
                                                                            const numValue = parseInt(value);
                                                                            const maxLessons = remainingLessons + assignment.completedLessons;
                                                                            
                                                                            if (value === '' || (numValue >= 0 && numValue <= maxLessons)) {
                                                                                setEditValues(prev => ({
                                                                                    ...prev,
                                                                                    [`${assignment.teacherName}-completedLessons`]: value
                                                                                }));
                                                                            }
                                                                        }}
                                                                        size="small"
                                                                        inputProps={{ min: 1, max: remainingLessons + assignment.completedLessons }}
                                                                    />
                                                                </Box>
                                                            ) : assignment.completedLessons}
                                                        </TableCell>
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
                                                                            <CancelIcon style={{ color: "#ccc" }} />
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
                                                                            <CancelIcon style={{ color: "#ccc" }} />
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
                                                        <TableCell style={{textAlign: 'center'}} rowSpan={rowSpan}>{page * rowsPerPage + index + 1}</TableCell>
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
                                                {deletingClass && <TableCell></TableCell>}
                                                {subjectIndex === 0 && (
                                                    <TableCell rowSpan={rowSpan} align="center" style={{textAlign: 'center'}}>
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
            <ImportAssignmentsModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onAssignmentCreate={async () => {
                    const classesData = await getDepartmentClasses();
                    if (Array.isArray(classesData) && classesData.length > 0) {
                    const sortedClasses = classesData.sort((a, b) => a.name.localeCompare(b.name));
                    setClasses(sortedClasses);
                    }
                }}
            />
            <Footer />
            <ToastContainer />
        </>
    );
};

export default LeaderClassScreen;