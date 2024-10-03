import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, Link } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { Circles } from 'react-loader-spinner';
import 'react-toastify/dist/ReactToastify.css';
import styles from '../../css/Ministry/Class.module.css';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import { getUser } from '../../services/authServices.js';
import { getClasses, updateSubjectLessonCount, removeSubjectFromClass, addSubjectToClass, deleteClass } from '../../services/classServices.js';
import { getSubject } from '../../services/subjectServices.js';
import { Box, Typography, TextField, Button, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Select, MenuItem, TableFooter, TablePagination } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SingleClassModal from './Component/SingleClassModal.jsx';
import MultiClassModal from './Component/MultiClassModal.jsx';
import EditSubjectModal from './Component/EditSubjectModal.jsx';
import DeleteSubjectModal from './Component/DeleteSubjectModal.jsx';
import AddSubjectModal from './Component/AddSubjectModal.jsx';
import DeleteClassModal from './Component/DeleteClassModal.jsx';

const ClassScreen = () => { 
    const [user, setUser] = useState(null);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [gradeFilter, setGradeFilter] = useState('');
    const [showSingleClassModal, setShowSingleClassModal] = useState(false);
    const [showMultiClassModal, setShowMultiClassModal] = useState(false);
    const [showEditSubjectModal, setShowEditSubjectModal] = useState(false);
    const [showDeleteSubjectModal, setShowDeleteSubjectModal] = useState(false);
    const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
    const [showDeleteClassModal, setShowDeleteClassModal] = useState(false);
    const [currentClass, setCurrentClass] = useState(null);
    const [currentSubject, setCurrentSubject] = useState(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
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
                    const classData = await getClasses();
                    setClasses(classData);
                    const subjectData = await getSubject();
                    setSubjects(subjectData);
                }
                setLoading(false);
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('Đã xảy ra lỗi khi tải dữ liệu');
                setLoading(false);
            }
        };
        fetchUserAndData();
    }, [navigate]);

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

    const handleClassAdded = async () => {
        try {
            const updatedClassData = await getClasses();
            setClasses(updatedClassData);
            toast.success('Danh sách lớp đã được cập nhật');
        } catch (error) {
            console.error('Error refreshing classes:', error);
            toast.error('Không thể cập nhật danh sách lớp');
        }
    };

    const handleEditSubject = (classItem, subject) => {
        setCurrentClass(classItem);
        setCurrentSubject(subject);
        setShowEditSubjectModal(true);
    };

    const handleDeleteSubject = (classItem, subject) => {
        setCurrentClass(classItem);
        setCurrentSubject(subject);
        setShowDeleteSubjectModal(true);
    };

    const handleAddSubject = (classItem) => {
        setCurrentClass(classItem);
        setShowAddSubjectModal(true);
    };

    const handleDeleteClass = (classItem) => {
        setCurrentClass(classItem);
        setShowDeleteClassModal(true);
    };

    const handleUpdateSubject = async (newLessonCount) => {
        try {
            await updateSubjectLessonCount(currentClass._id, currentSubject.subject._id, parseInt(newLessonCount));
            const updatedClasses = classes.map(classItem => 
                classItem._id === currentClass._id
                    ? {
                        ...classItem,
                        subjects: classItem.subjects.map(subject => 
                            subject.subject._id === currentSubject.subject._id
                                ? {...subject, lessonCount: parseInt(newLessonCount)}
                                : subject
                        )
                    }
                    : classItem
            );
            setClasses(updatedClasses);
            setShowEditSubjectModal(false);
            toast.success('Cập nhật môn học thành công');
        } catch (err) {
            toast.error('Cập nhật môn học thất bại');
        }
    };

    const handleRemoveSubject = async () => {
        try {
            await removeSubjectFromClass(currentClass._id, currentSubject.subject._id);
            const updatedClasses = classes.map(classItem => 
                classItem._id === currentClass._id
                    ? {
                        ...classItem,
                        subjects: classItem.subjects.filter(subject => subject.subject._id !== currentSubject.subject._id)
                    }
                    : classItem
            );
            setClasses(updatedClasses);
            setShowDeleteSubjectModal(false);
            toast.success('Xóa môn học thành công');
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message === 'Không thể xóa môn học đã được phân công giảng dạy') {
                toast.error('Không thể xóa môn học đã được phân công giảng dạy');
            } else {
                toast.error('Xóa môn học thất bại');
            }
        }
    };

    const handleAddNewSubject = async (subjectId, lessonCount) => {
        try {
            const response = await addSubjectToClass(currentClass._id, subjectId, parseInt(lessonCount));
            const addedSubject = subjects.find(subject => subject._id === subjectId);
            const updatedClasses = classes.map(classItem => 
                classItem._id === currentClass._id
                    ? {
                        ...classItem,
                        subjects: [
                            ...classItem.subjects,
                            {
                                _id: response.class.subjects[response.class.subjects.length - 1]._id,
                                subject: {
                                    _id: addedSubject._id,
                                    name: addedSubject.name
                                },
                                lessonCount: parseInt(lessonCount)
                            }
                        ]
                    }
                    : classItem
            );
            setClasses(updatedClasses);
            setShowAddSubjectModal(false);
            toast.success('Thêm môn học thành công');
        } catch (err) {
            if (err.response && err.response.status === 400) {
                toast.error(err.response.data.message || 'Thêm môn học thất bại');
            } else {
                toast.error('Thêm môn học thất bại. Vui lòng thử lại sau.');
            }
        }
    };

    const handleDeleteClassConfirm = async () => {
        try {
            await deleteClass(currentClass._id);
            const updatedClasses = classes.filter(classItem => classItem._id !== currentClass._id);
            setClasses(updatedClasses);
            setShowDeleteClassModal(false);
            toast.success('Xóa lớp học thành công');
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message === 'Không thể xóa lớp học đã có môn được phân công giảng dạy') {
                toast.error('Không thể xóa lớp học đã có môn được phân công giảng dạy');
            } else {
                toast.error('Xóa lớp học thất bại');
            }
        }
    };

    const columns = [
        { field: 'index', label: 'STT', width: '5%' },
        { field: 'name', label: 'Tên lớp', width: '15%' },
        { field: 'grade', label: 'Khối', width: '5%' },
        { field: 'campus', label: 'Cơ sở', width: '8%' },
        { field: 'updatedAt', label: 'Lần điều chỉnh gần nhất', width: '15%' },
        { field: 'subjects', label: 'Môn học', width: '15%' },
        { field: 'lessonCount', label: 'Số tiết', width: '10%' },
        { field: 'subjectActions', label: 'Thao tác môn học', width: '15%', align: 'center' },
        { field: 'classActions', label: 'Thao tác lớp', width: '15%' },
    ];

    const filteredClasses = classes
        .filter((classItem) =>
            classItem.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
            (gradeFilter === '' || classItem.grade === parseInt(gradeFilter))
        );

    const paginatedClasses = filteredClasses.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

    const rows = paginatedClasses.flatMap((classItem, classIndex) => {
        const baseIndex = page * rowsPerPage + classIndex + 1;
        return classItem.subjects.map((subject, subjectIndex) => ({
            id: `${classItem._id}-${subject.subject._id}`,
            index: subjectIndex === 0 ? baseIndex : null,
            name: subjectIndex === 0 ? classItem.name : null,
            grade: subjectIndex === 0 ? classItem.grade : null,
            campus: subjectIndex === 0 ? classItem.campus : null,
            updatedAt: subjectIndex === 0 ? new Date(classItem.updatedAt).toLocaleString() : null,
            subjects: subject.subject.name,
            lessonCount: subject.lessonCount,
            subjectActions: (
                <>
                    <Button onClick={() => handleEditSubject(classItem, subject)}>
                        <EditIcon />
                    </Button>
                    <Button onClick={() => handleDeleteSubject(classItem, subject)}>
                        <DeleteIcon style={{color: '#ef5a5a'}} />
                    </Button>
                </>
            ),
            classActions: subjectIndex === 0 ? (
                <>
                    <Button onClick={() => handleAddSubject(classItem)}>
                        <AddIcon />
                    </Button>
                    <Button onClick={() => handleDeleteClass(classItem)}>
                        <DeleteForeverIcon style={{color: 'red'}} />
                    </Button>
                </>
            ) : null,
            isFirstRow: subjectIndex === 0,
            rowSpan: classItem.subjects.length,
        }));
    });

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
                <title>Trang khai báo lớp học</title>
            </Helmet>
            <Header />
            <ToastContainer  style={{ zIndex: 9999999 }}/>
            <div className={styles.classDashboardMinistry}>
                <Box m="20px">
                    <Link to="/ministry-declare" style={{ display: 'block', textDecoration: 'none', marginBottom: '5px', fontSize: '20px' }}>
                        <ArrowBackIcon />
                    </Link>
                    <Typography variant="h4" mb={2} className={styles.sectionTitle}>
                        Danh sách lớp học
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
                        <div style={{display: 'flex', gap: '20px'}}>
                            <Select
                                value={gradeFilter}
                                onChange={handleGradeFilterChange}
                                displayEmpty
                                style={{ width: '200px' }}
                            >
                                <MenuItem value="">Tất cả khối</MenuItem>
                                {uniqueGrades.map((grade) => (
                                    <MenuItem key={grade} value={grade}>Khối {grade}</MenuItem>
                                ))}
                            </Select>
                            <Button 
                                variant="contained" 
                                onClick={() => setShowSingleClassModal(true)}
                                style={{ marginRight: '10px', backgroundColor: '#53a8b6', fontWeight: '600' }}
                            >
                                Tạo 1 lớp
                            </Button>
                            <Button 
                                variant="contained" 
                                onClick={() => setShowMultiClassModal(true)}
                                style={{ backgroundColor: '#24527a', fontWeight: '600' }}
                            >Tạo nhiều lớp
                            </Button>
                        </div>
                    </Box>
                    <div className={styles.tableWrapper}>
                        <TableContainer component={Paper} className={styles.tableContainer}>
                            <Table stickyHeader className={styles.table}>
                                <TableHead>
                                    <TableRow>
                                        {columns.map((column) => (
                                            <TableCell key={column.field} style={{ width: column.width }}>
                                                {column.label}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rows.map((row) => (
                                        <TableRow key={row.id}>
                                            {columns.map((column) => {
                                                if (row.isFirstRow || column.field === 'subjects' || column.field === 'lessonCount' || column.field === 'subjectActions') {
                                                    return (
                                                        <TableCell 
                                                            key={`${row.id}-${column.field}`}
                                                            rowSpan={column.field === 'subjects' || column.field === 'lessonCount' || column.field === 'subjectActions' ? 1 : row.rowSpan}
                                                        >
                                                            {row[column.field]}
                                                        </TableCell>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TableFooter className={styles.tableFooter}>
                            <TableRow>
                                <TablePagination
                                    rowsPerPageOptions={[25, 50, 100, { label: 'All', value: -1 }]}
                                    colSpan={columns.length}
                                    count={filteredClasses.length}
                                    rowsPerPage={rowsPerPage}
                                    page={page}
                                    SelectProps={{
                                        inputProps: { 'aria-label': 'rows per page' },
                                        native: true,
                                    }}
                                    onPageChange={handleChangePage}
                                    onRowsPerPageChange={handleChangeRowsPerPage}
                                />
                            </TableRow>
                        </TableFooter>
                    </div>
                </Box>
            </div>
            <Footer />
        
            <SingleClassModal
                isOpen={showSingleClassModal}
                onClose={() => setShowSingleClassModal(false)}
                onClassAdded={handleClassAdded}
                subjects={subjects}
            />
    
            <MultiClassModal
                isOpen={showMultiClassModal}
                onClose={() => setShowMultiClassModal(false)}
                onClassesAdded={handleClassAdded}
            />
    
            <EditSubjectModal
                isOpen={showEditSubjectModal}
                onClose={() => setShowEditSubjectModal(false)}
                onUpdateSubject={handleUpdateSubject}
                subject={currentSubject}
            />
    
            <DeleteSubjectModal
                isOpen={showDeleteSubjectModal}
                onClose={() => setShowDeleteSubjectModal(false)}
                onDeleteSubject={handleRemoveSubject}
                subject={currentSubject}
            />
    
            <AddSubjectModal
                isOpen={showAddSubjectModal}
                onClose={() => setShowAddSubjectModal(false)}
                onAddSubject={handleAddNewSubject}
                subjects={subjects}
                currentClass={currentClass}
            />
    
            <DeleteClassModal
                isOpen={showDeleteClassModal}
                onClose={() => setShowDeleteClassModal(false)}
                onDeleteClass={handleDeleteClassConfirm}
                classItem={currentClass}
            />
        </>
    );
}

export default ClassScreen;