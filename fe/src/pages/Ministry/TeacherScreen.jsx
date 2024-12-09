import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, Link } from 'react-router-dom';
import Modal from 'react-modal';
import { Circles } from 'react-loader-spinner';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from '../../css/Ministry/Teacher.module.css';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import { getUser } from '../../services/authServices.js';
import { getAllTeachers, createTeacher, updateTeacher, deleteTeacher, createManyTeachers } from '../../services/teacherService.js';
import { getDepartmentNames } from '../../services/departmentService.js';
import { getNonSpecializedSubjects } from '../../services/subjectServices.js';
import { Box, Typography, TextField, Button, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Select, MenuItem, TableFooter, TablePagination } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import SingleTeacherModal from './Component/Teacher/SingleTeacherModal.jsx';
import MultiTeacherModal from './Component/Teacher/MultiTeacherModal';
import EditTeacherModal from './Component/Teacher/EditTeacherModal';
import HomeroomAssignmentModal from './Component/Teacher/HomeroomModal.jsx';

Modal.setAppElement('#root');

const TeacherScreen = () => {
    const [user, setUser] = useState(null);
    const [teachers, setTeachers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [nonSpecializedSubjects, setNonSpecializedSubjects] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSingleTeacherModal, setShowSingleTeacherModal] = useState(false);
    const [showMultiTeacherModal, setShowMultiTeacherModal] = useState(false);
    const [showEditTeacherModal, setShowEditTeacherModal] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState(null);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [showHomeroomAssignmentModal, setShowHomeroomAssignmentModal] = useState(false);
    const [teacherToDelete, setTeacherToDelete] = useState(null);
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const navigate = useNavigate();

    const fetchTeachers = async () => {
        try {
            const teacherData = await getAllTeachers();
            setTeachers(teacherData);
        } catch (error) {
            console.error('Error fetching teachers:', error);
            toast.error('Có lỗi xảy ra khi tải danh sách giáo viên');
        }
    };

    useEffect(() => {
        const fetchUserAndData = async () => {
            try {
                const userData = await getUser();
                setUser(userData);
                
                if (userData) {
                    if (!userData || userData.user.role !== 1) {
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
                    await fetchTeachers();
                    const departmentData = await getDepartmentNames();
                    setDepartments(departmentData);
                    const subjectData = await getNonSpecializedSubjects();
                    setNonSpecializedSubjects(subjectData);
                }
                setLoading(false);
            } catch (error) {
                console.error('Error fetching data:', error);
                setErrorMessage(error.message);
                setShowModal(true);
                setLoading(false);
            }
        };
        fetchUserAndData();
    }, [navigate]);

    const handleSearchChange = (event) => {
        setSearchQuery(event.target.value);
        setPage(0);
    };

    const handleDepartmentChange = (event) => {
        setSelectedDepartment(event.target.value);
        setPage(0);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleEditTeacher = (teacher) => {
        setEditingTeacher(teacher);
        setShowEditTeacherModal(true);
    };

    const handleDeleteConfirm = (teacher) => {
        setTeacherToDelete(teacher);
        setShowDeleteConfirmModal(true);
    };

    const handleDelete = async () => {
        if (teacherToDelete) {
            try {
                await deleteTeacher(teacherToDelete._id);
                setShowDeleteConfirmModal(false);
                setTeacherToDelete(null);
                toast.success('Xóa giáo viên thành công!');
                await fetchTeachers();
            } catch (error) {
                console.error('Error deleting teacher:', error);
                if (error.response && error.response.data && error.response.data.message) {
                    toast.error(error.response.data.message);
                } else {
                    toast.error('Có lỗi xảy ra khi xóa giáo viên');
                }
                setShowDeleteConfirmModal(false);
                setTeacherToDelete(null);
            }
        }
    };

    const handleHomeroomAssignmentComplete = async () => {
        try {
            await fetchTeachers();
            toast.success('Phân công chủ nhiệm thành công');
        } catch (error) {
            console.error('Error fetching updated teacher data:', error);
            toast.error('Có lỗi xảy ra khi cập nhật danh sách giáo viên');
        }
    };

    const getReductionsText = (teacher) => {
        const reductions = [];
        
        if (teacher.homeroom) {
            reductions.push(`GVCN (${teacher.homeroom.totalReducedLessons})`);
        }
        
        if (teacher.reductions && teacher.reductions.length > 0) {
            const otherReductions = teacher.reductions.map(reduction => 
                `${reduction.reductionReason} (${reduction.reducedLessons})`
            );
            reductions.push(...otherReductions);
        }
        
        return reductions.length > 0 ? reductions.join(' + ') : '-';
    };

    const columns = [
        { field: 'index', label: 'STT', width: '5%', sticky: true },
        { field: 'name', label: 'Tên giáo viên', width: '15%', sticky: true },
        { field: 'email', label: 'Email', width: '15%' },
        { field: 'phone', label: 'Số điện thoại', width: '10%' },
        { field: 'department', label: 'Tổ chuyên môn', width: '15%' },
        { field: 'teachingSubjects', label: 'Tổ bộ môn', width: '15%' },
        { field: 'type', label: 'Hình thức GV', width: '10%' },
        { field: 'homeroom', label: 'Lớp chủ nhiệm', width: '10%' },
        { field: 'lessonsPerWeek', label: 'Số tiết/tuần', width: '8%' },
        { field: 'teachingWeeks', label: 'Số tuần dạy', width: '8%' },
        { field: 'basicTeachingLessons', label: 'Tiết chuẩn', width: '8%' },
        { field: 'reductions', label: 'Giảm trừ', width: '15%' },
        { field: 'totalReductionLessons', label: 'Tổng số tiết giảm', width: '10%' },
        { field: 'actions', label: 'Thao tác', width: '10%' },
    ];

    const filteredTeachers = teachers
        .filter(teacher => 
            (teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            teacher.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
            (selectedDepartment ? teacher.department && teacher.department._id === selectedDepartment : true)
        );

    const paginatedTeachers = rowsPerPage > 0
        ? filteredTeachers.slice(page * rowsPerPage, (page + 1) * rowsPerPage)
        : filteredTeachers;

    const rows = paginatedTeachers.map((teacher, index) => ({
        id: teacher._id,
        index: page * rowsPerPage + index + 1,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        department: teacher.department ? teacher.department.name : '-',
        teachingSubjects: teacher.teachingSubjects ? teacher.teachingSubjects.name : '-',
        type: teacher.type,
        homeroom: teacher.homeroom ? teacher.homeroom.class : '-',
        lessonsPerWeek: teacher.lessonsPerWeek || '-',
        teachingWeeks: teacher.teachingWeeks || '-',
        basicTeachingLessons: teacher.basicTeachingLessons || '-',
        reductions: getReductionsText(teacher),
        totalReductionLessons: (teacher.totalReducedLessons || 0) + (teacher.homeroom ? teacher.homeroom.totalReducedLessons || 0 : 0),
        actions: (
            <div className={styles.actionButtons}>
                <Button onClick={() => handleEditTeacher(teacher)}>
                    <EditIcon /> Sửa
                </Button>
                <Button onClick={() => handleDeleteConfirm(teacher)}>
                    <DeleteIcon style={{color: '#ef5a5a'}} /> Xóa
                </Button>
            </div>
        ),
    }));

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
                <title>Trang quản lý giáo viên</title>
            </Helmet>
            <Header/>
            <ToastContainer />
            <div className={styles.teacherDashboard}>
                <Box m="20px">
                    <Link to="/ministry-declare" style={{ display: 'block', textDecoration: 'none', marginBottom: '5px', fontSize: '20px' }}>
                        <ArrowBackIcon />
                    </Link>
                    <Typography variant="h4" mb={2} className={styles.sectionTitle}>
                        Danh sách giáo viên
                    </Typography>
                    <Box mb={2}>
                        <Typography>Tổng số giáo viên: {teachers.length}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={3}>
                        <Box display="flex" gap="20px" alignItems="center">
                            <TextField
                                value={searchQuery}
                                onChange={handleSearchChange}
                                placeholder="Tìm kiếm theo tên hoặc email"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <Select
                                value={selectedDepartment}
                                onChange={handleDepartmentChange}
                                displayEmpty
                                style={{ minWidth: 200 }}
                            >
                                <MenuItem value="">Tất cả tổ chuyên môn</MenuItem>
                                {departments.map((dept) => (
                                    <MenuItem key={dept._id} value={dept._id}>
                                        {dept.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Box>
                        <Box display="flex" gap="20px">
                            <Button 
                                variant="contained" 
                                onClick={() => setShowSingleTeacherModal(true)}
                                style={{ backgroundColor: '#53a8b6', fontWeight: '600', borderRadius: '26px' }}
                            >
                                Tạo 1 giáo viên
                            </Button>
                            <Button 
                                variant="contained" 
                                onClick={() => setShowMultiTeacherModal(true)}
                                style={{ backgroundColor: '#24527a', fontWeight: '600', borderRadius: '26px' }}
                            >
                                Tạo nhiều giáo viên
                            </Button>
                            <Button 
                                onClick={() => setShowHomeroomAssignmentModal(true)}
                                variant="contained"
                                style={{ backgroundColor: '#4caf50', fontWeight: '600', borderRadius: '26px' }}
                            >
                                Phân công chủ nhiệm
                            </Button>
                        </Box>
                    </Box>
                    <div className={styles.tableWrapper}>
                        <TableContainer component={Paper} className={styles.tableContainer}>
                            <div className={styles.horizontalScroll}>
                                <Table stickyHeader className={styles.table}>
                                    <TableHead>
                                        <TableRow>
                                            {columns.map((column) => (
                                                <TableCell
                                                    key={column.field} 
                                                    style={{ width: column.width, minWidth: column.width }}
                                                    className={column.sticky ? styles.stickyColumn : ''}
                                                >
                                                    {column.label}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {rows.map((row) => (
                                            <TableRow key={row.id}>
                                                {columns.map((column) => (
                                                    <TableCell 
                                                        key={`${row.id}-${column.field}`}
                                                        className={column.sticky ? styles.stickyColumn : ''}
                                                    >
                                                        {row[column.field]}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </TableContainer>
                        <TableFooter className={styles.tableFooter}>
                            <TableRow>
                                <TablePagination
                                    rowsPerPageOptions={[25, 50, 100, { label: 'All', value: -1 }]}
                                    colSpan={columns.length}
                                    count={filteredTeachers.length}
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
            <Footer/>

            <SingleTeacherModal
                isOpen={showSingleTeacherModal}
                onClose={() => {
                    setShowSingleTeacherModal(false);
                    fetchTeachers();
                }}
                departments={departments}
                nonSpecializedSubjects={nonSpecializedSubjects}
            />

            <MultiTeacherModal
                isOpen={showMultiTeacherModal}
                onClose={() => {
                    setShowMultiTeacherModal(false);
                    fetchTeachers();
                }}
                onTeachersAdded={fetchTeachers}
            />

            <EditTeacherModal
                isOpen={showEditTeacherModal}
                onClose={() => {
                    setShowEditTeacherModal(false);
                    fetchTeachers();
                }}
                editingTeacher={editingTeacher}
                departments={departments}
                nonSpecializedSubjects={nonSpecializedSubjects}
                onTeacherUpdated={fetchTeachers}
            />

            <HomeroomAssignmentModal
                isOpen={showHomeroomAssignmentModal}
                onClose={() => {
                    setShowHomeroomAssignmentModal(false);
                    fetchTeachers();
                }}
                onAssignmentComplete={handleHomeroomAssignmentComplete}
            />

            <Modal
                isOpen={showDeleteConfirmModal}
                onRequestClose={() => setShowDeleteConfirmModal(false)}
                contentLabel="Xác nhận xóa giáo viên"
                className={styles.modal}
                overlayClassName={styles.overlay}
            >
                <h2 className={styles.modalTitle}>Xác nhận xóa giáo viên</h2>
                <p style={{textAlign: "justify", maxWidth: '350px', margin: '0 auto'}}>
                    Bạn có chắc chắn muốn xóa giáo viên <strong>{teacherToDelete ? teacherToDelete.name : ''}</strong>?
                </p>
                <div className={styles.formActions}>
                    <button onClick={handleDelete} className={styles.deleteButton}>Xóa</button>
                    <button onClick={() => setShowDeleteConfirmModal(false)} className={styles.cancelButton}>Hủy</button>
                </div>
            </Modal>
        </>
    );
}

export default TeacherScreen;