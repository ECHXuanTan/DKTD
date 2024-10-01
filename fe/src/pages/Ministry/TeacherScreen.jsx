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
    import { Box, Typography, TextField, Button, InputAdornment, Menu, MenuItem } from '@mui/material';
    import { DataGrid } from '@mui/x-data-grid';
    import SearchIcon from '@mui/icons-material/Search';
    import EditIcon from '@mui/icons-material/Edit';
    import DeleteIcon from '@mui/icons-material/Delete';
    import CloudUploadIcon from '@mui/icons-material/CloudUpload';
    import FilterListIcon from '@mui/icons-material/FilterList';
    import ArrowBackIcon from '@mui/icons-material/ArrowBack';

    Modal.setAppElement('#root');

    const TeacherScreen = () => {
        const [user, setUser] = useState(null);
        const [teachers, setTeachers] = useState([]);
        const [departments, setDepartment] = useState([]);
        const [errorMessage, setErrorMessage] = useState('');
        const [showModal, setShowModal] = useState(false);
        const [loading, setLoading] = useState(true);
        const [searchQuery, setSearchQuery] = useState('');
        const [modalIsOpen, setModalIsOpen] = useState(false);
        const [showAddOptions, setShowAddOptions] = useState(false);
        const [showSingleTeacherModal, setShowSingleTeacherModal] = useState(false);
        const [showMultiTeacherModal, setShowMultiTeacherModal] = useState(false);
        const [newTeacher, setNewTeacher] = useState({
            name: '',
            email: '',
            phone: '',
            department: '',
            type: ''
        });
        const [excelFile, setExcelFile] = useState(null);
        const [excelData, setExcelData] = useState(null);
        const navigate = useNavigate();

        const [showEditTeacherModal, setShowEditTeacherModal] = useState(false);
        const [editingTeacher, setEditingTeacher] = useState({
            id: '',
            name: '',
            email: '',
            phone: '',
            department: '',
            departmentId: '',
            type: '',
            lessonsPerWeek: '',
            teachingWeeks: ''
        });

        const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
        const [teacherToDelete, setTeacherToDelete] = useState(null);

        const [selectedDepartment, setSelectedDepartment] = useState('');
        const [anchorEl, setAnchorEl] = useState(null);

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
                        const teacherData = await getAllTeachers();
                        setTeachers(teacherData);
                        const departmentData = await getDepartmentNames();
                        setDepartment(departmentData);
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
                await createTeacher({...newTeacher, position: 'Giáo viên'});
                setShowSingleTeacherModal(false);
                toast.success('Tạo giáo viên mới thành công!');
                const updatedTeacherData = await getAllTeachers();
                setTeachers(updatedTeacherData);
            } catch (error) {
                console.error('Error creating teacher:', error);
                toast.error(error.message || 'Có lỗi xảy ra khi tạo giáo viên mới.');
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
        
            console.log("Dữ liệu Excel gốc:", excelData);
        
            try {
            console.log("Đang gửi dữ liệu để tạo giáo viên:", excelData);
            const response = await createManyTeachers(excelData);
            
            console.log("Kết quả từ server:", response);
        
            let successCount = 0;
            let errorMessages = [];
        
            // Xử lý giáo viên không hợp lệ từ quá trình xác thực
            if (response.invalidTeachers && response.invalidTeachers.length > 0) {
                console.log("Giáo viên không hợp lệ:", response.invalidTeachers);
                errorMessages = response.invalidTeachers.map(item => 
                `${item.name}: ${item.errors.join(', ')}`
                );
            }
        
            // Xử lý kết quả từ server
            if (response.createdTeachers) {
                successCount = response.createdTeachers.length;
            }
        
            if (response.errors) {
                errorMessages = errorMessages.concat(response.errors.map(err => 
                `${err.email || 'Unknown'}: ${err.message}`
                ));
            }
        
            // Hiển thị thông báo
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
                ['Tên', 'Email', 'Số điện thoại', 'Tổ chuyên môn', 'Loại giáo viên', 'Số tiết dạy một tuần', 'Số tuần dạy'],
                ['Nguyễn Văn A', 'nguyenvana@example.com', '0123456789', 'Tổ Tiếng Anh', 'Cơ hữu', '20', '15'],
                ['Trần Thị B', 'tranthib@example.com', '0987654321', 'Tổ Vật lý', 'Hợp đồng', '18', '12'],
            ];
        
            const ws = XLSX.utils.aoa_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Template");
        
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
            FileSaver.saveAs(dataBlob, 'teacher_template.xlsx');
        };

        const handleAddTeacher = () => {
            setShowAddOptions(true);
        };

        const handleAddSingleTeacher = () => {
            setShowAddOptions(false);
            setShowSingleTeacherModal(true);
        };

        const handleAddMultiTeacher = () => {
            setShowAddOptions(false);
            setShowMultiTeacherModal(true);
        };

        const handleEditTeacher = (teacher) => {
            setEditingTeacher({
                id: teacher.id,
                name: teacher.name,
                email: teacher.email,
                phone: teacher.phone,
                department: teacher.departmentId,
                departmentId: teacher.departmentId,
                type: teacher.type,
                lessonsPerWeek: teacher.lessonsPerWeek,
                teachingWeeks: teacher.teachingWeeks
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
            { field: 'index', headerName: 'STT', flex: 0.5 },
            { field: 'name', headerName: 'Tên giáo viên', flex: 1 },
            { field: 'email', headerName: 'Email', flex: 1 },
            { field: 'phone', headerName: 'Số điện thoại', flex: 1 },
            { field: 'department', headerName: 'Khoa', flex: 1 },
            { field: 'type', headerName: 'Loại giáo viên', flex: 0.7 },
            { 
                field: 'lessonsPerWeek', 
                headerName: 'Số tiết/tuần', 
                flex: 0.7, 
                type: 'number',
                align: 'center'
            },
            { 
                field: 'teachingWeeks', 
                headerName: 'Số tuần dạy', 
                flex: 0.7, 
                type: 'number',
                align: 'center'
            },
            { 
                field: 'basicTeachingLessons', 
                headerName: 'Số tiết dạy cơ bản', 
                flex: 0.9, 
                type: 'number',
                align: 'center'
            },
            // { 
            //     field: 'departmentId', 
            //     headerName: 'Department ID', 
            //     width: 0,
            //     hide: true
            // },
            {
                field: 'actions',
                headerName: 'Thao tác',
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
            .filter(teacher => teacher.department.name !== "Tổ Giáo vụ – Đào tạo")
            .filter((teacher) => 
                (teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                teacher.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
                (selectedDepartment ? teacher.department._id === selectedDepartment : true)
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
            lessonsPerWeek: teacher.lessonsPerWeek,
            teachingWeeks: teacher.teachingWeeks,
            basicTeachingLessons: teacher.basicTeachingLessons || teacher.lessonsPerWeek * teacher.teachingWeeks
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
                                    .filter(dept => dept.name !== "Tổ Giáo vụ – Đào tạo")
                                    .map((dept) => (
                                        <MenuItem key={dept._id} onClick={() => handleDepartmentSelect(dept._id)}>
                                            {dept.name}
                                        </MenuItem>
                                    ))
                                }
                            </Menu>
                            </Box>
                            <div>
                                <Button 
                                    variant="contained" 
                                    onClick={handleAddTeacher}
                                    className={styles.createButton}
                                >
                                    Thêm giáo viên mới
                                </Button>
                                {showAddOptions && (
                                    <div className={styles.addOptions}>
                                        <Button onClick={handleAddSingleTeacher}>Thêm 1 giáo viên</Button>
                                        <Button onClick={handleAddMultiTeacher}>Thêm nhiều giáo viên</Button>
                                    </div>
                                )}
                            </div>
                        </Box>
                        <Box height="75vh" className={styles.dataGridContainer}>
                            <DataGrid
                                rows={rows}
                                columns={columns}
                                pageSize={10}
                                rowsPerPageOptions={[10]}
                                className={styles.dataGrid}
                                disableSelectionOnClick
                            />
                        </Box>
                    </Box>
                </section>
            </div>
            <Footer/>
            <Modal
                isOpen={showSingleTeacherModal}
                onRequestClose={() => setShowSingleTeacherModal(false)}
                contentLabel="Tạo Giáo Viên Mới"
                className={styles.modal}
                overlayClassName={styles.overlay}
            >
                <h2 className={styles.modalTitle}>Tạo Giáo Viên Mới</h2>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label htmlFor="name">Tên giáo viên:</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={newTeacher.name}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="email">Email:</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={newTeacher.email}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="phone">Số điện thoại:</label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={newTeacher.phone}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="department">Khoa:</label>
                        <select
                            id="department"
                            name="department"
                            value={newTeacher.department}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">Chọn khoa</option>
                            {departments
                                .filter(dept => dept.name !== "Tổ Giáo vụ – Đào tạo")
                                .map((dept) => (
                                    <option key={dept._id} value={dept._id}>
                                        {dept.name}
                                    </option>
                                ))}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="type">Loại giáo viên:</label>
                        <select
                            id="type"
                            name="type"
                            value={newTeacher.type}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">Chọn loại giáo viên</option>
                            <option value="Cơ hữu">Cơ hữu</option>
                            <option value="Hợp đồng">Hợp đồng</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="lessonsPerWeek">Số tiết dạy một tuần:</label>
                        <input
                            type="number"
                            id="lessonsPerWeek"
                            name="lessonsPerWeek"
                            value={newTeacher.lessonsPerWeek}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="teachingWeeks">Số tuần dạy:</label>
                        <input
                            type="number"
                            id="teachingWeeks"
                            name="teachingWeeks"
                            value={newTeacher.teachingWeeks}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                    <div className={styles.formActions}>
                        <button type="submit" className={styles.submitButton}>Tạo Giáo Viên</button>
                        <button type="button" onClick={() => setShowSingleTeacherModal(false)} className={styles.cancelButton}>Hủy</button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={showMultiTeacherModal}
                onRequestClose={() => {
                    setShowMultiTeacherModal(false);
                    setExcelData(null);
                    setExcelFile(null);
                }}
                contentLabel="Tải lên file Excel"
                className={styles.modalExcel}
                overlayClassName={styles.overlay}
            >
                <h2 className={styles.modalTitle}>Tải lên file Excel</h2>
                <form onSubmit={(e) => { e.preventDefault(); }} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label htmlFor="excel-upload">Chọn file Excel:</label>
                        <input
                            type="file"
                            id="excel-upload"
                            accept=".xlsx, .xls"
                            onChange={handleFileChange}
                        />
                    </div>
                    {excelData && (
                        <div className={styles.previewContainer}>
                            <div className={styles.previewHeader}>
                                <h3>Xem trước dữ liệu:</h3>
                                <button 
                                    onClick={() => {
                                        setExcelData(null);
                                        setExcelFile(null);
                                    }}
                                    className={styles.closePreviewButton}
                                >
                                    Đóng xem trước
                                </button>
                            </div>
                            <table className={styles.previewTable}>
                                <thead>
                                    <tr>
                                        {Object.keys(excelData[0]).map((key) => (
                                            <th key={key}>{key}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {excelData.map((row, index) => (
                                        <tr key={index}>
                                            {Object.values(row).map((value, idx) => (
                                                <td key={idx}>{value}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <div className={styles.formActions}>
                        <button type="button" onClick={handleDownloadTemplate} className={styles.downloadButton}>
                            Tải xuống mẫu Excel
                        </button>
                        {excelData && (
                            <button type="button" onClick={handleUpload} className={styles.submitButton}>
                                <CloudUploadIcon /> Tải lên
                            </button>
                        )}
                        <button 
                            type="button" 
                            onClick={() => {
                                setShowMultiTeacherModal(false);
                                setExcelData(null);
                                setExcelFile(null);
                            }} 
                            className={styles.cancelButton}
                        >
                            Hủy
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={showEditTeacherModal}
                onRequestClose={() => setShowEditTeacherModal(false)}
                contentLabel="Cập Nhật Giáo Viên"
                className={styles.modal}
                overlayClassName={styles.overlay}
            >
                <h2 className={styles.modalTitle}>Cập Nhật Giáo Viên</h2>
                <form onSubmit={handleEditSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label htmlFor="name">Tên giáo viên:</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={editingTeacher.name}
                            onChange={handleEditInputChange}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="email">Email:</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={editingTeacher.email}
                            onChange={handleEditInputChange}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="phone">Số điện thoại:</label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={editingTeacher.phone}
                            onChange={handleEditInputChange}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="department">Khoa:</label>
                        <select
                            id="department"
                            name="department"
                            value={editingTeacher.department}
                            onChange={handleEditInputChange}
                            required
                        >
                            <option value="">Chọn khoa</option>
                            {departments
                                .filter(dept => dept.name !== "Tổ Giáo vụ – Đào tạo")
                                .map((dept) => (
                                    <option key={dept._id} value={dept._id}>
                                        {dept.name}
                                    </option>
                                ))}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="type">Loại giáo viên:</label>
                        <select
                            id="type"
                            name="type"
                            value={editingTeacher.type}
                            onChange={handleEditInputChange}
                            required
                        >
                            <option value="">Chọn loại giáo viên</option>
                            <option value="Cơ hữu">Cơ hữu</option>
                            <option value="Hợp đồng">Hợp đồng</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="lessonsPerWeek">Số tiết dạy một tuần:</label>
                        <input
                            type="number"
                            id="lessonsPerWeek"
                            name="lessonsPerWeek"
                            value={editingTeacher.lessonsPerWeek}
                            onChange={handleEditInputChange}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="teachingWeeks">Số tuần dạy:</label>
                        <input
                            type="number"
                            id="teachingWeeks"
                            name="teachingWeeks"
                            value={editingTeacher.teachingWeeks}
                            onChange={handleEditInputChange}
                            required
                        />
                    </div>
                    <div className={styles.formActions}>
                        <button type="submit" className={styles.submitButton}>Cập Nhật Giáo Viên</button>
                        <button type="button" onClick={() => setShowEditTeacherModal(false)} className={styles.cancelButton}>Hủy</button>
                    </div>
                </form>
            </Modal>

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