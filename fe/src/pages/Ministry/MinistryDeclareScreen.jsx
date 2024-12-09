import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
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
import { Box, Typography, MenuItem, Select, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

Modal.setAppElement('#root');

const MinistryDeclare = () => { 
    const [user, setUser] = useState(null);
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
              const departmentData = await getAllDepartment();
              setDepartments(departmentData.filter(dept => dept.name !== "Tổ GVĐT"));
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
        } else if (event.target.value === 'subject') {
            navigate('/ministry-subject');
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
                        Chào mừng giáo viên {user?.user.name} đến với trang khai báo tiết dạy!
                    </Typography>
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
                        <MenuItem value="subject">Môn học</MenuItem>
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
                    </Select>
                    </Box>
                </Box>
                <TableContainer component={Paper} className={styles.tableContainer}>
                    <Table className={styles.table}>
                        <TableHead>
                            <TableRow>
                                <TableCell className={styles.tableHeader}>STT</TableCell>
                                <TableCell className={styles.tableHeader}>Tên tổ bộ môn</TableCell>
                                <TableCell className={`${styles.tableHeader} ${styles.centerAlign}`}>Tổng số tiết dạy</TableCell>
                                <TableCell className={styles.tableHeader}>Số tiết đã khai báo</TableCell>
                                <TableCell className={`${styles.tableHeader} ${styles.centerAlign}`}>Tỉ lệ hoàn thành</TableCell>
                                <TableCell className={styles.tableHeader}>Tình trạng</TableCell>
                                <TableCell className={styles.tableHeader}>Lần cập nhật gần nhất</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {departments.map((dept, index) => (
                                <TableRow key={dept._id} className={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{dept.name}</TableCell>
                                    <TableCell className={styles.centerAlign}>{dept.totalAssignmentTime || "Chưa khai báo"}</TableCell>
                                    <TableCell>{dept.declaredTeachingLessons || "Chưa khai báo"}</TableCell>
                                    <TableCell className={styles.centerAlign}>{getCompletionPercentage(dept.declaredTeachingLessons, dept.totalAssignmentTime)}</TableCell>
                                    <TableCell>{getCompletionStatus(dept.declaredTeachingLessons, dept.totalAssignmentTime)}</TableCell>
                                    <TableCell>{dept.totalAssignmentTime ? new Date(dept.updatedAt).toLocaleString() : "-"}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
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