import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
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
import { Box, Typography, TextField, Button, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Select, Menu, MenuItem, TableFooter, TablePagination } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FilterListIcon from '@mui/icons-material/FilterList';
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
    const [anchorEl, setAnchorEl] = useState(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const navigate = useNavigate();

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
                    const teacherData = await getAllTeachers();
                    setTeachers(teacherData);
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

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleDepartmentFilterClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleDepartmentFilterClose = () => {
        setAnchorEl(null);
    };

    const handleDepartmentSelect = (departmentId) => {
        setSelectedDepartment(departmentId);
        handleDepartmentFilterClose();
    };

    const handleEditTeacher = (teacher) => {
        setEditingTeacher(teacher);
        setShowEditTeacherModal(true);
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditingTeacher(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            await updateTeacher(editingTeacher._id, editingTeacher);
            setShowEditTeacherModal(false);
            toast.success('Cập nhật giáo viên thành công!');
            const updatedTeacherData = await getAllTeachers();
            setTeachers(updatedTeacherData);
        } catch (error) {
            console.error('Error updating teacher:', error);
            toast.error('Có lỗi xảy ra khi cập nhật giáo viên.');
        }
    };

    const handleDeleteConfirm = (teacher) => {
        setTeacherToDelete(teacher);
        console.log(teacher);
        setShowDeleteConfirmModal(true);
    };

    const handleDelete = async () => {
        if (teacherToDelete) {
            try {
                await deleteTeacher(teacherToDelete._id);
                setShowDeleteConfirmModal(false);
                setTeacherToDelete(null);
                toast.success('Xóa giáo viên thành công!');
                const updatedTeacherData = await getAllTeachers();
                setTeachers(updatedTeacherData);
            } catch (error) {
                console.error('Error deleting teacher:', error);
                if (error.response && error.response.data && error.response.data.message) {
                    // Display the specific error message from the server
                    toast.error(error.response.data.message);
                    setShowDeleteConfirmModal(false);
                    setTeacherToDelete(null);
                } else {
                    // Fallback to a generic error message
                    toast.error('Có lỗi xảy ra khi xóa giáo viên');
                    setShowDeleteConfirmModal(false);
                    setTeacherToDelete(null);
                }
            }
        }
    };

    const handleHomeroomAssignmentComplete = async () => {
        try {
            const updatedTeacherData = await getAllTeachers();
            setTeachers(updatedTeacherData);
            toast.success('Phân công chủ nhiệm thành công');
        } catch (error) {
            console.error('Error fetching updated teacher data:', error);
            toast.error('Có lỗi xảy ra khi cập nhật danh sách giáo viên');
        }
    };

    const updateTeacherList = async () => {
        try {
            const updatedTeacherData = await getAllTeachers();
            setTeachers(updatedTeacherData);
        } catch (error) {
            console.error('Error fetching updated teacher data:', error);
            toast.error('Có lỗi xảy ra khi cập nhật danh sách giáo viên');
        }
    };

    const columns = [
        { field: 'index', label: 'STT', width: '5%', sticky: true },
        { field: 'name', label: 'Tên giáo viên', width: '15%', sticky: true },
        { field: 'email', label: 'Email', width: '15%' },
        { field: 'phone', label: 'Số điện thoại', width: '10%' },
        { field: 'department', label: 'Tổ chuyên môn', width: '15%' },
        { field: 'teachingSubjects', label: 'Môn giảng dạy', width: '15%' },
        { field: 'type', label: 'Hình thức GV', width: '10%' },
        { field: 'lessonsPerWeek', label: 'Số tiết/tuần', width: '8%' },
        { field: 'teachingWeeks', label: 'Số tuần dạy', width: '8%' },
        { field: 'reducedLessonsPerWeek', label: 'Số tiết giảm một tuần', width: '10%' },
        { field: 'reducedWeeks', label: 'Số tuần giảm', width: '8%' },
        { field: 'totalReducedLessons', label: 'Tổng số tiết giảm', width: '10%' },
        { field: 'reductionReason', label: 'Nội dung giảm', width: '15%' },
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

    const rows = paginatedTeachers.flatMap((teacher, index) => {
        const baseIndex = page * rowsPerPage + index + 1;
        const generalRow = {
            id: `${teacher._id}-general`,
            index: baseIndex,
            name: teacher.name,
            email: teacher.email,
            phone: teacher.phone,
            department: teacher.department ? teacher.department.name : '-',
            teachingSubjects: teacher.teachingSubjects ? teacher.teachingSubjects.name : '-',
            type: teacher.type,
            lessonsPerWeek: teacher.lessonsPerWeek || '-',
            teachingWeeks: teacher.teachingWeeks || '-',
            reducedLessonsPerWeek: teacher.reducedLessonsPerWeek || '-',
            reducedWeeks: teacher.reducedWeeks || '-',
            totalReducedLessons: teacher.totalReducedLessons || '-',
            reductionReason: teacher.reductionReason || '-',
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
            isFirstRow: true,
            rowSpan: teacher.homeroom ? 2 : 1,
        };

        if (teacher.homeroom) {
            const homeroomRow = {
                id: `${teacher._id}-homeroom`,
                index: null,
                name: null,
                email: null,
                phone: null,
                department: null,
                teachingSubjects: null,
                type: null,
                lessonsPerWeek: null,
                teachingWeeks: null,
                reducedLessonsPerWeek: teacher.homeroom.reducedLessonsPerWeek || '-',
                reducedWeeks: teacher.homeroom.reducedWeeks || '-',
                totalReducedLessons: teacher.homeroom.totalReducedLessons || '-',
                reductionReason: 'GVCN',
                actions: null,
                isFirstRow: false,
                rowSpan: 1,
            };
            return [generalRow, homeroomRow];
        }
        return [generalRow];
    });

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
                        <TextField
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder="Tìm kiếm theo tên hoặc email"
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
                            <Button 
                                variant="outlined" 
                                onClick={handleDepartmentFilterClick}
                                startIcon={<FilterListIcon />}
                            >
                                Lọc theo tổ chuyên môn
                            </Button>
                            <Menu
                                anchorEl={anchorEl}
                                open={Boolean(anchorEl)}
                                onClose={handleDepartmentFilterClose}
                            >
                                <MenuItem onClick={() => handleDepartmentSelect('')}>Tất cả</MenuItem>
                                {departments.map((dept) => (
                                    <MenuItem key={dept._id} onClick={() => handleDepartmentSelect(dept._id)}>
                                        {dept.name}
                                    </MenuItem>
                                ))}
                            </Menu>
                            <Button 
                                variant="contained" 
                                onClick={() => setShowSingleTeacherModal(true)}
                                style={{ marginRight: '10px', backgroundColor: '#53a8b6', fontWeight: '600' }}
                            >
                                Thêm 1 giáo viên
                            </Button>
                            <Button 
                                variant="contained" 
                                onClick={() => setShowMultiTeacherModal(true)}
                                style={{ backgroundColor: '#24527a', fontWeight: '600' }}
                            >
                                Thêm nhiều giáo viên
                                </Button>
                            <Button 
                                onClick={() => setShowHomeroomAssignmentModal(true)}
                                variant="contained"
                                style={{ marginRight: '10px', backgroundColor: '#4caf50', fontWeight: '600' }}
                                >
                                Phân công chủ nhiệm
                            </Button>
                        </div>
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
                                                {columns.map((column) => {
                                                    if (row.isFirstRow || !['index', 'name', 'email', 'phone', 'department', 'teachingSubjects', 'type', 'lessonsPerWeek', 'teachingWeeks', 'actions'].includes(column.field)) {
                                                        return (
                                                            <TableCell 
                                                                key={`${row.id}-${column.field}`}
                                                                rowSpan={column.field === 'reducedLessonsPerWeek' || column.field === 'reducedWeeks' || column.field === 'totalReducedLessons' || column.field === 'reductionReason' ? 1 : row.rowSpan}
                                                                className={column.sticky ? styles.stickyColumn : ''}
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
                onClose={() => setShowSingleTeacherModal(false)}
                departments={departments}
                nonSpecializedSubjects={nonSpecializedSubjects}
            />

            <MultiTeacherModal
                isOpen={showMultiTeacherModal}
                onClose={() => setShowMultiTeacherModal(false)}
                onTeachersAdded={updateTeacherList}
            />

            <EditTeacherModal
                isOpen={showEditTeacherModal}
                onClose={() => setShowEditTeacherModal(false)}
                editingTeacher={editingTeacher}
                departments={departments}
                nonSpecializedSubjects={nonSpecializedSubjects}
                onTeacherUpdated={updateTeacherList}
            />

            <HomeroomAssignmentModal
                isOpen={showHomeroomAssignmentModal}
                onClose={() => setShowHomeroomAssignmentModal(false)}
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
                <p style={{textAlign: "center"}}>Bạn có chắc chắn muốn xóa giáo viên này?</p>
                <div className={styles.formActions}>
                    <button onClick={handleDelete} className={styles.deleteButton}>Xóa</button>
                    <button onClick={() => setShowDeleteConfirmModal(false)} className={styles.cancelButton}>Hủy</button>
                </div>
            </Modal>
        </>
    );
}

export default TeacherScreen;