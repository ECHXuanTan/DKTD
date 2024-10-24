import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, Link } from 'react-router-dom';
import { Circles } from 'react-loader-spinner';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import { getUser } from '../../services/authServices.js';
import { getDepartmentTeachers, getAboveTeachers, getBelowTeachers } from '../../services/statisticsServices';
import { getTeacherByEmail } from '../../services/teacherService.js';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Box, Typography, TextField, Button, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Grid } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import ExportPDFButton from './Component/ExportPDFButton.jsx';
import styles from '../../css/Leader/LeaderDeclare.module.css';

const LeaderDashboard = () => {
    const [user, setUser] = useState(null);
    const [teacher, setTeacher] = useState(null);
    const [teachers, setTeachers] = useState([]);
    const [currentDepartment, setCurrentDepartment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [aboveThresholdCount, setAboveThresholdCount] = useState(0);
    const [belowThresholdCount, setBelowThresholdCount] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserAndTeachers = async () => {
            try {
                const userData = await getUser();
                setUser(userData);
                
                if (userData) {
                    if (!userData || userData.user.role !== 0) {
                        // Redirect based on user role
                        switch(userData.user.role) {
                          case 1:
                            navigate('/ministry-declare');
                            break;
                          case 0:
                            navigate('/user-dashboard');
                            break;
                          default:
                            navigate('/login');
                        }
                    }
                    const teachersData = await getDepartmentTeachers();
                    if (Array.isArray(teachersData) && teachersData.length > 0) {
                        const sortedTeachers = teachersData.sort((a, b) => a.name.localeCompare(b.name));
                        setTeachers(sortedTeachers);
                        setCurrentDepartment(sortedTeachers[0].departmentName);
                        const teacherData = await getTeacherByEmail();
                        setTeacher(teacherData);
                        const aboveTeachers = await getAboveTeachers(teacherData.department._id);
                        const belowTeachers = await getBelowTeachers(teacherData.department._id);
                        setAboveThresholdCount(aboveTeachers.length);
                        setBelowThresholdCount(belowTeachers.length);
                    } else {
                        console.error('Invalid teachers data:', teachersData);
                        toast.error('Định dạng dữ liệu giáo viên không hợp lệ. Vui lòng thử lại sau.');
                    }
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.');
            } finally {
                setLoading(false);
            }
        };
    
        fetchUserAndTeachers();
    }, [navigate]);

    const handleEditTeacher = (teacherId) => {
        navigate(`/declare-teacher/${teacherId}`);
    };

    const handleSearchChange = (event) => {
        setSearchQuery(event.target.value);
    };

    const calculateCompletionPercentage = (totalAssignment, basicTeachingLessons) => {
        if (basicTeachingLessons === 0) return 0;
        const percentage = (totalAssignment / basicTeachingLessons) * 100;
        return Math.min(percentage, 100).toFixed(2);
    };

    const calculateExcessLessons = (totalAssignment, basicTeachingLessons) => {
        return Math.max(0, totalAssignment - basicTeachingLessons);
    };

    const filteredTeachers = teachers.filter((teacher) =>
        teacher.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
            <title>Quản lý giáo viên</title>
        </Helmet>
        <Header/>
        <div className={styles.dashboardLeader}>
            <Box className={styles.welcomeBox}>
                <Typography variant="h3" className={styles.welcomeTitle}>
                    Chào mừng giáo viên {teacher?.name} đến với trang khai báo
                </Typography>
                <Grid container spacing={2} className={styles.statsGrid}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper className={`${styles.statBox} ${styles.blueBox}`}>
                            <Typography variant="h6">Tổng số giáo viên của Tổ bộ môn</Typography>
                            <Typography variant="h4">{teachers.length}</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper className={`${styles.statBox} ${styles.greenBox}`}>
                            <Typography variant="h6">Tổng số tiết đã khai báo của Tổ bộ môn</Typography>
                            <Typography variant="h4">{teachers.reduce((sum, teacher) => sum + teacher.totalAssignment, 0)}</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper className={`${styles.statBox} ${styles.orangeBox}`}>
                            <Typography variant="h6">Giáo viên vượt quá 25% số tiết cơ bản</Typography>
                            <Typography variant="h4">{aboveThresholdCount}</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper className={`${styles.statBox} ${styles.redBox}`}>
                            <Typography variant="h6">Giáo viên chưa đạt số tiết cơ bản</Typography>
                            <Typography variant="h4">{belowThresholdCount}</Typography>
                        </Paper>
                    </Grid>
                </Grid>
            </Box>
            <Box mt={4}>
                <Typography variant="h4" mb={2}>
                    Danh sách giáo viên {currentDepartment}
                </Typography>
                <Box display="flex" justifyContent="space-between" mb={3}>
                    <TextField
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="Tìm kiếm theo tên"
                        style={{ width: '30%' }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                    />
                    <Box>
                        <ExportPDFButton user={user?.user} currentDepartment={currentDepartment} />
                        <Link to="/leader/class-statistics" style={{ textDecoration: 'none', marginLeft: '10px' }}>
                            <Button variant="contained">Thống kê theo lớp</Button>
                        </Link>
                        <Link to="/leader/warning" style={{ textDecoration: 'none', marginLeft: '10px' }}>
                            <Button variant="contained" className={styles.warningButton}>
                                Cảnh báo
                            </Button>
                        </Link>
                    </Box>
                </Box>
                <TableContainer component={Paper}>
                    <Table className={styles.table}>
                        <TableHead >
                            <TableRow>
                                <TableCell className={styles.tableHeader}>STT</TableCell>
                                <TableCell className={styles.tableHeader}>Tên giáo viên</TableCell>
                                <TableCell className={styles.tableHeader}>Tiết/Tuần</TableCell>
                                <TableCell className={styles.tableHeader}>Số tuần dạy</TableCell>
                                <TableCell className={styles.tableHeader}>Số tiết cơ bản</TableCell>
                                <TableCell className={styles.tableHeader}>Tổng số tiết</TableCell>
                                <TableCell className={styles.tableHeader}>Tỉ lệ hoàn thành</TableCell>
                                <TableCell className={styles.tableHeader}>Số tiết dư</TableCell>
                                <TableCell className={styles.tableHeader}>Lớp</TableCell>
                                <TableCell className={styles.tableHeader}>Môn học</TableCell>
                                <TableCell className={styles.tableHeader}>Số tiết khai báo</TableCell>
                                <TableCell className={styles.tableHeader}>Điều chỉnh</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredTeachers.map((teacher, index) => {
                                const rowSpan = Math.max(teacher.teachingDetails?.length || 1, 1);
                                return (
                                    <React.Fragment key={teacher.id}>
                                        <TableRow className={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                                            <TableCell rowSpan={rowSpan}>{index + 1}</TableCell>
                                            <TableCell rowSpan={rowSpan}>{teacher.name}</TableCell>
                                            <TableCell rowSpan={rowSpan}>{teacher.lessonsPerWeek}</TableCell>
                                            <TableCell rowSpan={rowSpan}>{teacher.teachingWeeks}</TableCell>
                                            <TableCell rowSpan={rowSpan}>{teacher.basicTeachingLessons}</TableCell>
                                            <TableCell rowSpan={rowSpan}>{teacher.totalAssignment > 0 ? teacher.totalAssignment : "Chưa khai báo"}</TableCell>
                                            <TableCell rowSpan={rowSpan}>{`${calculateCompletionPercentage(teacher.totalAssignment, teacher.basicTeachingLessons)}%`}</TableCell>
                                            <TableCell rowSpan={rowSpan}>{calculateExcessLessons(teacher.totalAssignment, teacher.basicTeachingLessons)}</TableCell>
                                            {teacher.teachingDetails && teacher.teachingDetails.length > 0 ? (
                                                <>
                                                    <TableCell>{teacher.teachingDetails[0].className}</TableCell>
                                                    <TableCell>{teacher.teachingDetails[0].subject}</TableCell>
                                                    <TableCell>{teacher.teachingDetails[0].completedLessons}</TableCell>
                                                </>
                                            ) : (
                                                <>
                                                    <TableCell rowSpan={rowSpan}>-</TableCell>
                                                    <TableCell rowSpan={rowSpan}>-</TableCell>
                                                    <TableCell rowSpan={rowSpan}>-</TableCell>
                                                </>
                                            )}
                                            <TableCell rowSpan={rowSpan}>
                                                <EditIcon
                                                    onClick={() => handleEditTeacher(teacher.id)}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                        {teacher.teachingDetails && teacher.teachingDetails.slice(1).map((detail, detailIndex) => (
                                            <TableRow key={`${teacher.id}-${detailIndex}`} className={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                                                <TableCell>{detail.className}</TableCell>
                                                <TableCell>{detail.subject}</TableCell>
                                                <TableCell>{detail.completedLessons}</TableCell>
                                            </TableRow>
                                        ))}
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </div>
        <Footer/>
        <ToastContainer />
        </>
    );
};

export default LeaderDashboard;