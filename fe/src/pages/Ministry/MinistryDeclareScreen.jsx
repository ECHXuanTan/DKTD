import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import Modal from 'react-modal';
import { Circles } from 'react-loader-spinner';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from '../../css/Ministry/MinistryDeclare.module.css';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import { getAllDepartment } from '../../services/departmentService.js';
import { getUser } from '../../services/authServices.js';
import { getTeacherByEmail } from '../../services/teacherService.js';
import { Box, Typography, MenuItem, Select, Paper } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';

Modal.setAppElement('#root');

const MinistryDeclare = () => { 
    const [user, setUser] = useState(null);
    const [teacher, setTeacher] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [declarationOption, setDeclarationOption] = useState('');
    const [statisticsOption, setStatisticsOption] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserAndDepartment = async () => {
          try {
            const userData = await getUser();
            setUser(userData);
            const teacherData = await getTeacherByEmail();
            setTeacher(teacherData);
            console.log(teacherData);
            if (userData) {
              if (userData.user.isAdmin) {
                navigate('/admin-dashboard');
                return;
              }
              const departmentData = await getAllDepartment();
              setDepartments(departmentData.filter(dept => dept.name !== "Tổ Giáo vụ – Đào tạo"));
            }
            setLoading(false);
          } catch (error) {
            console.error('Error fetching data:', error);
            setErrorMessage(error.message);
            setShowModal(true);
            setLoading(false); 
          }
        };
    
        fetchUserAndDepartment();
    }, [navigate]);

    const handleDeclarationOptionChange = (event) => {
        setDeclarationOption(event.target.value);
        if (event.target.value === 'class') {
            navigate('/ministry-class');
        } else if (event.target.value === 'teacher') {
            navigate('/ministry-teacher');
        }
    };

    const handleStatisticsOptionChange = (event) => {
        setStatisticsOption(event.target.value);
        if (event.target.value === 'class') {
            navigate('/ministry/class-statistics');
        } else if (event.target.value === 'teacher') {
            navigate('/ministry/teacher-statistics');
        } else if (event.target.value === 'subject') {
            navigate('/ministry/subject-statistics');
        } else if (event.target.value === 'warning') {
            navigate('/ministry/teacher-warning');
        } 
    };

    const getCompletionStatus = (declared, total) => {
        if (declared === total) return "Hoàn thành";
        if (declared > 0 && declared < total) return "Đang tiến hành";
        return "Chưa bắt đầu";
    };

    const getCompletionPercentage = (declared, total) => {
        if (total === 0) return "0%";
        return `${Math.round((declared / total) * 100)}%`;
    };

    const columns = [
        { field: 'name', headerName: 'Tên tổ bộ môn', flex: 1 },
        { field: 'totalAssignmentTime', headerName: 'Tổng số tiết dạy', flex: 1 },
        { field: 'declaredTeachingLessons', headerName: 'Số tiết đã khai báo', flex: 1 },
        { field: 'completionPercentage', headerName: 'Tỉ lệ hoàn thành', flex: 1 },
        { field: 'completionStatus', headerName: 'Tình trạng', flex: 1 },
        { field: 'updatedAt', headerName: 'Lần cập nhật gần nhất', flex: 1 },
        {
            field: 'actions',
            headerName: 'Hành động',
            flex: 0.5,
            renderCell: (params) => (
                <EditIcon
                    className={styles.editIcon}
                    onClick={() => {/* Handle edit action */}}
                />
            ),
        },
    ];

    const rows = departments.map((dept, index) => ({
        id: dept._id,
        name: dept.name,
        totalAssignmentTime: dept.totalAssignmentTime || "Chưa khai báo",
        updatedAt: dept.totalAssignmentTime ? new Date(dept.updatedAt).toLocaleString() : "-",
        declaredTeachingLessons: dept.totalAssignmentTime ? `${dept.declaredTeachingLessons}/${dept.totalAssignmentTime}` : "Chưa khai báo",
        completionStatus: getCompletionStatus(dept.declaredTeachingLessons, dept.totalAssignmentTime),
        completionPercentage: getCompletionPercentage(dept.declaredTeachingLessons, dept.totalAssignmentTime),
    }));

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <Circles type="TailSpin" color="#00BFFF" height={80} width={80} />
            </div>
        );
    }
    
    return(
        <>
        <Helmet>
            <title>Trang khai báo tổng số tiết dạy</title>
        </Helmet>
        <Header/>
        <ToastContainer />
        <div className={styles.dashboardMinistry}>
            <Box m="20px">
                <Paper elevation={3} className={styles.welcomeBox}>
                    <Typography variant="h4" className={styles.welcomeTitle}>
                        Chào mừng giáo viên {teacher?.name} đến với trang khai báo tiết dạy!
                    </Typography>
                    <Box className={styles.teacherInfo}>
                        <Typography><strong>Họ và tên:</strong> {teacher?.name}</Typography>
                        <Typography><strong>Email:</strong> {teacher?.email}</Typography>
                        <Typography><strong>Tổ:</strong> {teacher?.department?.name}</Typography>
                        <Typography><strong>Chức vụ:</strong> {teacher?.position}</Typography>
                    </Box>
                </Paper>
                
                <Box display="flex" justifyContent="space-between" mb={2} className={styles.optionsContainer}>
                    <Typography variant="h4" mb={2} className={styles.sectionTitle}>
                        Danh sách các tổ bộ môn
                    </Typography>
                    <Box>
                    <Select
                        value={declarationOption}
                        onChange={handleDeclarationOptionChange}
                        displayEmpty
                        className={styles.optionSelect}
                    >
                        <MenuItem value="" disabled>Khai báo</MenuItem>
                        <MenuItem value="class">Lớp học</MenuItem>
                        <MenuItem value="teacher">Giáo viên</MenuItem>
                    </Select>
                    <Select
                        value={statisticsOption}
                        onChange={handleStatisticsOptionChange}
                        displayEmpty
                        className={styles.optionSelect}
                    >
                        <MenuItem value="" disabled>Thống kê</MenuItem>
                        <MenuItem value="class">Lớp học</MenuItem>
                        <MenuItem value="teacher">Giáo viên</MenuItem>
                        <MenuItem value="subject">Môn học</MenuItem>
                        <MenuItem value="warning">Cảnh báo</MenuItem>
                    </Select>
                    </Box>
                    
                </Box>
                <Box className={styles.dataGridContainer}>
                    <DataGrid
                        rows={rows}
                        columns={columns}
                        pageSize={10}
                        rowsPerPageOptions={[10]}
                        className={styles.dataGrid}
                        disableSelectionOnClick
                        autoHeight
                    />
                </Box>
            </Box>
            <Modal
                isOpen={showModal}
                onRequestClose={() => setShowModal(false)}
                contentLabel="Error Message"
                className={styles.modal}
                overlayClassName={styles.modalOverlay}
            >
                <h2>Thông báo</h2>
                <p>{errorMessage}</p>
                <button onClick={() => setShowModal(false)}>Đóng</button>
            </Modal>
        </div>
        <Footer/>
        </>
    );
};

export default MinistryDeclare;