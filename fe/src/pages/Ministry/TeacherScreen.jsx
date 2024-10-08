import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, Link } from 'react-router-dom';
import Modal from 'react-modal';
import { Circles } from 'react-loader-spinner';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as XLSX from 'xlsx';
import FileSaver from 'file-saver';
import styles from '../../css/Ministry/Teacher.module.css';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import { getUser } from '../../services/authServices.js';
import { getAllTeachers, createTeacher, updateTeacher, deleteTeacher, createManyTeachers } from '../../services/teacherService.js';
import { getDepartmentNames } from '../../services/departmentService.js';
import { getNonSpecializedSubjects } from '../../services/subjectServices.js';
import { Box, Typography, TextField, Button, InputAdornment, Menu, MenuItem } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FilterListIcon from '@mui/icons-material/FilterList';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import SingleTeacherModal from './Component/Teacher/SingleTeacherModal.jsx';
import MultiTeacherModal from './Component/Teacher/MultiTeacherModal';
import EditTeacherModal from './Component/Teacher/EditTeacherModal';

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
    const [showAddOptions, setShowAddOptions] = useState(false);
    const [showSingleTeacherModal, setShowSingleTeacherModal] = useState(false);
    const [showMultiTeacherModal, setShowMultiTeacherModal] = useState(false);
    const [showEditTeacherModal, setShowEditTeacherModal] = useState(false);
    const [newTeacher, setNewTeacher] = useState({
        name: '',
        email: '',
        phone: '',
        position: 'Giáo viên',
        department: '',
        teachingSubjects: '',
        type: '',
        lessonsPerWeek: '',
        teachingWeeks: '',
        reducedLessonsPerWeek: '',
        reducedWeeks: '',
        reductionReason: '',
    });
    const [editingTeacher, setEditingTeacher] = useState({
        id: '',
        name: '',
        email: '',
        phone: '',
        position: '',
        department: '',
        teachingSubjects: '',
        type: '',
        lessonsPerWeek: '',
        teachingWeeks: '',
        reducedLessonsPerWeek: '',
        reducedWeeks: '',
        totalReducedLessons: '',
        reductionReason: '',
    });
    const [excelFile, setExcelFile] = useState(null);
    const [excelData, setExcelData] = useState(null);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [teacherToDelete, setTeacherToDelete] = useState(null);
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [anchorEl, setAnchorEl] = useState(null);
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
    };

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setNewTeacher(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            const teacherData = {
                ...newTeacher,
                position: 'Giáo viên',
            };
    
            if (newTeacher.type === 'Thỉnh giảng') {
                delete teacherData.lessonsPerWeek;
                delete teacherData.teachingWeeks;
                delete teacherData.reducedLessonsPerWeek;
                delete teacherData.reducedWeeks;
                delete teacherData.reductionReason;
            }
    
            await createTeacher(teacherData);
            setShowSingleTeacherModal(false);
            toast.success('Tạo giáo viên mới thành công!');
            const updatedTeacherData = await getAllTeachers();
            setTeachers(updatedTeacherData);
        } catch (error) {
            console.error('Error creating teacher:', error);
            
            if (error.response && error.response.data && error.response.data.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error('Có lỗi xảy ra khi tạo giáo viên mới.');
            }
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setExcelFile(file);

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            setExcelData(jsonData);
        };
        reader.readAsArrayBuffer(file);
    };

    const handleUpload = async () => {
        if (!excelData) {
            toast.error('Vui lòng chọn file Excel');
            return;
        }
    
        try {
            const response = await createManyTeachers(excelData);
            
            let successCount = 0;
            let errorMessages = [];
    
            if (response.invalidTeachers && response.invalidTeachers.length > 0) {
                errorMessages = response.invalidTeachers.map(item => 
                    `${item.name}: ${item.errors.join(', ')}`
                );
            }
    
            if (response.createdTeachers) {
                successCount = response.createdTeachers.length;
            }
    
            if (response.errors) {
                errorMessages = errorMessages.concat(response.errors.map(err => 
                    `${err.email || 'Unknown'}: ${err.message}`
                ));
            }
    
            if (successCount > 0) {
                toast.success(`Đã tạo thành công ${successCount} giáo viên`);
            }
    
            if (errorMessages.length > 0) {
                const errorMessage = `Có ${errorMessages.length} giáo viên không hợp lệ:\n${errorMessages.join('\n')}`;
                toast.error(errorMessage);
            }
    
            const updatedTeacherData = await getAllTeachers();
            setTeachers(updatedTeacherData);
            setShowMultiTeacherModal(false);
            setExcelData(null);
            setExcelFile(null);
        } catch (error) {
            console.error('Error creating teachers:', error);
            toast.error(error.message || 'Đã xảy ra lỗi khi tạo giáo viên');
        }
    };

    const handleDownloadTemplate = () => {
        const data = [
            ['Tên', 'Email', 'Số điện thoại', 'Tổ chuyên môn', 'Hình thức giáo viên', 'Số tiết dạy một tuần', 'Số tuần dạy', 'Số tiết giảm 1 tuần', 'Số tuần giảm', 'Nội dung giảm', 'Môn học giảng dạy'],
            ['Nguyễn Văn A', 'nguyenvana@example.com', '0923456789', 'Tổ Tiếng Anh', 'Cơ hữu', '20', '15', '2', '18', 'GVCN', 'Tiếng Anh'],
            ['Trần Thị B', 'tranthibb@example.com', '0987654321', 'Tổ Vật lý', 'Thỉnh giảng', '', '', '', '', '', 'Vật lý'],
        ];
    
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
    
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        FileSaver.saveAs(dataBlob, 'teacher_template.xlsx');
    };

    const handleAddSingleTeacher = () => {
        setShowSingleTeacherModal(true);
    };

    const handleAddMultiTeacher = () => {
        setShowMultiTeacherModal(true);
    };

    const handleEditTeacher = (teacher) => {
        setEditingTeacher({
            id: teacher.id,
            name: teacher.name,
            email: teacher.email,
            phone: teacher.phone,
            position: teacher.position,
            department: teacher.departmentId,
            teachingSubjects: teacher.teachingSubjects ? teacher.teachingSubjects._id : '',
            type: teacher.type,
            lessonsPerWeek: teacher.lessonsPerWeek || 0,
            teachingWeeks: teacher.teachingWeeks || 0,
            reducedLessonsPerWeek: teacher.reducedLessonsPerWeek || 0,
            reducedWeeks: teacher.reducedWeeks || 0,
            totalReducedLessons: teacher.totalReducedLessons || 0,
            reductionReason: teacher.reductionReason || '',
        });
        setShowEditTeacherModal(true);
    };

    const handleEditInputChange = (event) => {
        const { name, value } = event.target;
        setEditingTeacher(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const handleEditSubmit = async (event) => {
        event.preventDefault();
        try {
            await updateTeacher(editingTeacher.id, editingTeacher);
            setShowEditTeacherModal(false);
            toast.success('Cập nhật giáo viên thành công!');
            const updatedTeacherData = await getAllTeachers();
            setTeachers(updatedTeacherData);
        } catch (error) {
            console.error('Error updating teacher:', error);
            toast.error(error.message || 'Có lỗi xảy ra khi cập nhật giáo viên.');
        }
    };

    const handleDeleteConfirm = (teacher) => {
        setTeacherToDelete(teacher);
        setShowDeleteConfirmModal(true);
    };

    const handleDelete = async () => {
        if (teacherToDelete) {
            try {
                await deleteTeacher(teacherToDelete.id);
                toast.success('Xóa giáo viên thành công!');
                const updatedTeacherData = await getAllTeachers();
                setTeachers(updatedTeacherData);
            } catch (error) {
                console.error('Error deleting teacher:', error);
                if (error.response && error.response.status === 400 && error.response.data.message === "Không thể xóa giáo viên đã có khai báo giảng dạy") {
                    toast.error(error.response.data.message);
                } else {
                    toast.error('Lỗi khi xóa giáo viên');
                }
            }
        }
        setShowDeleteConfirmModal(false);
        setTeacherToDelete(null);
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

    const columns = [
        { field: 'index', headerName: 'STT', width: 50, align: 'center' },
        { field: 'name', headerName: 'Tên giáo viên', width: 200 },
        { field: 'email', headerName: 'Email', width: 200 },
        { field: 'phone', headerName: 'Số điện thoại', width: 130 },
        { field: 'department', headerName: 'Tổ bộ môn', width: 180 },
        {
            field: 'teachingSubjects',
            headerName: 'Môn học giảng dạy',
            width: 150,
        },  
        { field: 'type', headerName: 'Hình thức Giáo viên', width: 150, align: 'center' },
        { field: 'lessonsPerWeek', headerName: 'Số tiết/tuần', width: 100, type: 'number', align: 'center' },
        { field: 'teachingWeeks', headerName: 'Số tuần dạy', width: 100, type: 'number', align: 'center' },
        { field: 'basicTeachingLessons', headerName: 'Số tiết dạy cơ bản', width: 100, type: 'number', align: 'center' },
        { field: 'reducedLessonsPerWeek', headerName: 'Số tiết giảm/tuần', width: 100, type: 'number', align: 'center' },
        { field: 'reducedWeeks', headerName: 'Số tuần giảm', width: 100, type: 'number', align: 'center' },
        { field: 'totalReducedLessons', headerName: 'Tổng số tiết giảm', width: 100, type: 'number', align: 'center' },
        { field: 'reductionReason', headerName: 'Lý do giảm', width: 100 },
        {
            field: 'actions',
            headerName: 'Thao tác',
            width: 120,
            renderCell: ({ row }) => {
                return (
                    <>
                        <EditIcon
                            onClick={() => handleEditTeacher(row)}
                            sx={{ cursor: 'pointer', marginRight: 1 }}
                        />
                        <DeleteIcon
                            onClick={() => handleDeleteConfirm(row)}
                            sx={{ cursor: 'pointer' }}
                        />
                    </>
                );
            },
        },
    ];

    const filteredRows = teachers
        .filter(teacher => teacher.department && teacher.department.name !== "Tổ Giáo vụ")
        .filter((teacher) => 
            (teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            teacher.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
            (selectedDepartment ? teacher.department && teacher.department._id === selectedDepartment : true)
        );

    const rows = filteredRows.map((teacher, index) => ({
        id: teacher._id,
        index: index + 1,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        department: teacher.department ? teacher.department.name : 'N/A',
        departmentId: teacher.department ? teacher.department._id : '',
        type: teacher.type,
        lessonsPerWeek: teacher.lessonsPerWeek || 0,
        teachingWeeks: teacher.teachingWeeks || 0,
        basicTeachingLessons: teacher.basicTeachingLessons || 0,
        reducedLessonsPerWeek: teacher.reducedLessonsPerWeek || 0,
        reducedWeeks: teacher.reducedWeeks || 0,
        totalReducedLessons: teacher.totalReducedLessons || 0,
        reductionReason: teacher.reductionReason || '',
        teachingSubjects: teacher.teachingSubjects ? teacher.teachingSubjects.name : 'N/A', // Flattened here
        position: teacher.position,
    }));
        

    if (loading) {
        return (
            <div className="loading-container">
                <Circles type="TailSpin" color="#00BFFF" height={80} width={80} />
            </div>
        );
    }

    return(
        <>
            <Helmet>
                <title>Trang quản lý giáo viên</title>
            </Helmet>
            <Header/>
            <ToastContainer />
            <div className={styles.pageWrapper}>
                <section className={styles.teacherSection}>
                    <Box m="20px">
                        <Link to="/ministry-declare" style={{ display: 'block',textDecoration: 'none', marginBottom: '10px', fontSize: '20px' }}>
                            <ArrowBackIcon />
                        </Link>
                        <Typography variant="h4" mb={2} className={styles.sectionTitle}>
                            Danh sách giáo viên
                        </Typography>
                        <Box display="flex" justifyContent="space-between" mb={2} className={styles.searchCreate}>
                            <Box display="flex" gap="16px">
                                <TextField
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    placeholder="Tìm kiếm giáo viên"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon />
                                            </InputAdornment>
                                        ),
                                    }}
                                    className={styles.searchField}
                                />
                                <Button 
                                    variant="outlined" 
                                    onClick={handleDepartmentFilterClick}
                                    startIcon={<FilterListIcon />}
                                    className={styles.filterButton}
                                >
                                    Lọc theo khoa
                                </Button>
                                <Menu
                                    anchorEl={anchorEl}
                                    open={Boolean(anchorEl)}
                                    onClose={handleDepartmentFilterClose}
                                >
                                    <MenuItem onClick={() => handleDepartmentSelect('')}>Tất cả</MenuItem>
                                    {departments
                                        .filter(dept => dept.name !== "Tổ Giáo vụ")
                                        .map((dept) => (
                                            <MenuItem key={dept._id} onClick={() => handleDepartmentSelect(dept._id)}>
                                                {dept.name}
                                            </MenuItem>
                                        ))
                                    }
                                </Menu>
                            </Box>
                            <Box display="flex" gap="16px">
                                <Button 
                                    variant="contained" 
                                    onClick={handleAddSingleTeacher}
                                    className={styles.createButton}
                                >
                                    Thêm 1 giáo viên
                                </Button>
                                <Button 
                                    variant="contained" 
                                    onClick={handleAddMultiTeacher}
                                    className={styles.createButton}
                                >
                                    Thêm nhiều giáo viên
                                </Button>
                            </Box>
                        </Box>
                        <Box height="70vh" className={styles.dataGridContainer}>
                            <DataGrid
                                rows={rows}
                                columns={columns}
                                pageSize={10}
                                rowsPerPageOptions={[10]}
                                className={styles.dataGrid}
                                disableSelectionOnClick
                                getRowId={(row) => row.id}
                                getRowClassName={(params) =>
                                    params.indexRelativeToCurrentPage % 2 === 0 ? styles.rowEven : styles.rowOdd
                                }
                                scrollbarSize={20}
                            />
                        </Box>
                    </Box>
                </section>
            </div>
            <Footer/>

            <SingleTeacherModal
                isOpen={showSingleTeacherModal}
                onClose={() => setShowSingleTeacherModal(false)}
                newTeacher={newTeacher}
                handleInputChange={handleInputChange}
                handleSubmit={handleSubmit}
                departments={departments}
                nonSpecializedSubjects={nonSpecializedSubjects}
            />

            <MultiTeacherModal
                isOpen={showMultiTeacherModal}
                onClose={() => setShowMultiTeacherModal(false)}
                excelData={excelData}
                setExcelData={setExcelData}
                setExcelFile={setExcelFile}
                handleFileChange={handleFileChange}
                handleUpload={handleUpload}
                handleDownloadTemplate={handleDownloadTemplate}
            />

            <EditTeacherModal
                isOpen={showEditTeacherModal}
                onClose={() => setShowEditTeacherModal(false)}
                editingTeacher={editingTeacher}
                handleEditInputChange={handleEditInputChange}
                handleEditSubmit={handleEditSubmit}
                departments={departments}
                nonSpecializedSubjects={nonSpecializedSubjects}
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