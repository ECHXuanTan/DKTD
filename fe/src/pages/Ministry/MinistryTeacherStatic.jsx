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
import { Box, Typography, TextField, Select, MenuItem, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination } from '@mui/material';
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
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserAndTeachers = async () => {
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
        setPage(0);
    };

    const handleDepartmentFilterChange = (event) => {
        setDepartmentFilter(event.target.value);
        setPage(0);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const formatTeachingDetails = (teachingDetails) => {
        const detailsByGrade = teachingDetails.reduce((acc, detail) => {
            if (!acc[detail.grade]) {
                acc[detail.grade] = [];
            }
            acc[detail.grade].push(`${detail.className}: ${detail.subjectName} - ${detail.completedLessons} tiết`);
            return acc;
        }, {});

        return Object.entries(detailsByGrade).map(([grade, details]) => (
            `Khối ${grade}:\n${details.join('\n')}`
        )).join('\n\n');
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

    const paginatedTeachers = filteredTeachers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

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
                <div className={styles.tableWrapper}>
                    <TableContainer component={Paper} className={styles.tableContainer}>
                        <Table stickyHeader className={styles.table}>
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
                                    <TableCell>Chi tiết khai báo</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedTeachers.map((teacher, index) => (
                                    <TableRow key={teacher.id}>
                                        <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                                        <TableCell>{teacher.name}</TableCell>
                                        <TableCell>{teacher.departmentName}</TableCell>
                                        <TableCell>{teacher.lessonsPerWeek}</TableCell>
                                        <TableCell>{teacher.teachingWeeks}</TableCell>
                                        <TableCell>{teacher.basicTeachingLessons}</TableCell>
                                        <TableCell>{teacher.totalAssignment > 0 ? teacher.totalAssignment : "Chưa khai báo"}</TableCell>
                                        <TableCell>{`${calculateCompletionPercentage(teacher.totalAssignment, teacher.basicTeachingLessons)}%`}</TableCell>
                                        <TableCell>{calculateExcessLessons(teacher.totalAssignment, teacher.basicTeachingLessons)}</TableCell>
                                        <TableCell style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                            {formatTeachingDetails(teacher.teachingDetails || [])}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        rowsPerPageOptions={[25, 50, 100]}
                        component="div"
                        count={filteredTeachers.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        style={{overflow: 'unset'}}
                    />
                </div>
            </Box>
        </div>
        <Footer/>
        <ToastContainer />
        </>
    );
};

export default MinistryTeacherStatic;