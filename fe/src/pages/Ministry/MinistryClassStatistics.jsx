import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, Link } from 'react-router-dom';
import { Circles } from 'react-loader-spinner';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import { getUser } from '../../services/authServices.js';
import { getAllTeachers } from '../../services/statisticsServices';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Box, Typography, TextField, Select, MenuItem, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import styles from '../../css/Ministry/MinistryTeacherStatic.module.css';
import ExportAllTeachersButton from './Component/AllTeachersReport.jsx';

const MinistryTeacherStatic = () => { 
    const [user, setUser] = useState(null);
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserAndTeachers = async () => {
          try {
            const userData = await getUser();
            setUser(userData);
            
            if (userData) {
              if (userData.user.isAdmin) {
                navigate('/admin-dashboard');
                return;
              }
              const teachersData = await getAllTeachers();
              if (Array.isArray(teachersData) && teachersData.length > 0) {
                const filteredTeachers = teachersData.filter(teacher => teacher.departmentName !== "Tổ Giáo vụ – Đào tạo");
                const sortedTeachers = filteredTeachers.sort((a, b) => a.name.localeCompare(b.name));
                setTeachers(sortedTeachers);
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

    const handleSearchChange = (event) => {
        setSearchQuery(event.target.value);
    };

    const handleDepartmentFilterChange = (event) => {
        setDepartmentFilter(event.target.value);
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
        (teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.departmentName.toLowerCase().includes(searchQuery.toLowerCase())) &&
        (departmentFilter === '' || teacher.departmentName === departmentFilter)
    );

    const uniqueDepartments = [...new Set(teachers.map(teacher => teacher.departmentName))];

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
            <title>Thống kê giáo viên</title>
        </Helmet>
        <Header/>
        <div className={styles.dashboardMinistry}>
            <Box m="20px">
                <Link to="/ministry-declare" style={{ textDecoration: 'none', paddingBottom: '5px', fontSize: '20px'}}>
                     <ArrowBackIcon/>
                </Link>
                <Typography variant="h4" mb={2} style={{ marginTop: '10px'}}>
                    Thống kê giáo viên
                </Typography>
                <Box mb={2}>
                    <Typography>Tổng số giáo viên: {teachers.length}</Typography>
                    <Typography>Tổng số tiết đã khai báo: {teachers.reduce((sum, teacher) => sum + teacher.totalAssignment, 0)}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={3}>
                    <TextField
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="Tìm kiếm theo tên hoặc tổ bộ môn"
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
                            value={departmentFilter}
                            onChange={handleDepartmentFilterChange}
                            displayEmpty
                            style={{ width: '200px', marginRight: '10px' }}
                        >
                            <MenuItem value="">Tất cả tổ bộ môn</MenuItem>
                            {uniqueDepartments.map((dept) => (
                                <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                            ))}
                        </Select>
                        <ExportAllTeachersButton user={user?.user} />
                    </Box>
                </Box>
                <TableContainer component={Paper}>
                    <Table className={styles.table}>
                        <TableHead>
                            <TableRow>
                                <TableCell>STT</TableCell>
                                <TableCell>Tên giáo viên</TableCell>
                                <TableCell>Tổ bộ môn</TableCell>
                                <TableCell>Tiết/Tuần</TableCell>
                                <TableCell>Số tuần dạy</TableCell>
                                <TableCell>Số tiết cơ bản</TableCell>
                                <TableCell>Tổng số tiết</TableCell>
                                <TableCell>Tỉ lệ hoàn thành</TableCell>
                                <TableCell>Số tiết dư</TableCell>
                                <TableCell>Lớp</TableCell>
                                <TableCell>Môn học</TableCell>
                                <TableCell>Số tiết khai báo</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredTeachers.map((teacher, index) => {
                                const rowSpan = Math.max(teacher.teachingDetails?.length || 1, 1);
                                return (
                                    <React.Fragment key={teacher.id}>
                                        <TableRow>
                                            <TableCell rowSpan={rowSpan}>{index + 1}</TableCell>
                                            <TableCell rowSpan={rowSpan}>{teacher.name}</TableCell>
                                            <TableCell rowSpan={rowSpan}>{teacher.departmentName}</TableCell>
                                            <TableCell rowSpan={rowSpan}>{teacher.lessonsPerWeek}</TableCell>
                                            <TableCell rowSpan={rowSpan}>{teacher.teachingWeeks}</TableCell>
                                            <TableCell rowSpan={rowSpan}>{teacher.basicTeachingLessons}</TableCell>
                                            <TableCell rowSpan={rowSpan}>{teacher.totalAssignment > 0 ? teacher.totalAssignment : "Chưa khai báo"}</TableCell>
                                            <TableCell rowSpan={rowSpan}>{`${calculateCompletionPercentage(teacher.totalAssignment, teacher.basicTeachingLessons)}%`}</TableCell>
                                            <TableCell rowSpan={rowSpan}>{calculateExcessLessons(teacher.totalAssignment, teacher.basicTeachingLessons)}</TableCell>
                                            {teacher.teachingDetails && teacher.teachingDetails.length > 0 ? (
                                                <>
                                                    <TableCell>{teacher.teachingDetails[0].className}</TableCell>
                                                    <TableCell>{teacher.teachingDetails[0].subjectName}</TableCell>
                                                    <TableCell>{teacher.teachingDetails[0].completedLessons}</TableCell>
                                                </>
                                            ) : (
                                                <>
                                                    <TableCell rowSpan={rowSpan}>-</TableCell>
                                                    <TableCell rowSpan={rowSpan}>-</TableCell>
                                                    <TableCell rowSpan={rowSpan}>-</TableCell>
                                                </>
                                            )}
                                        </TableRow>
                                        {teacher.teachingDetails && teacher.teachingDetails.slice(1).map((detail, detailIndex) => (
                                            <TableRow key={`${teacher.id}-${detailIndex}`}>
                                                <TableCell>{detail.className}</TableCell>
                                                <TableCell>{detail.subjectName}</TableCell>
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

export default MinistryTeacherStatic;