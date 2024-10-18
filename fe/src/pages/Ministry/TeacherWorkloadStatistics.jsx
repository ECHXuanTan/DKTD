import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, Link } from 'react-router-dom';
import { Circles } from 'react-loader-spinner';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import { getUser } from '../../services/authServices.js';
import { getBelowTeachers, getAboveTeachers } from '../../services/statisticsServices';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Select, MenuItem, TextField, InputAdornment, TablePagination } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import ExportBelowTeachersButton from './Component/BelowTeachersReport.jsx';
import ExportAboveTeachersButton from './Component/AboveTeachersReport.jsx';
import styles from '../../css/Ministry/TeacherWorkloadStatistics.module.css';

const TeacherWorkloadStatistics = () => {
    const [user, setUser] = useState(null);
    const [belowTeachers, setBelowTeachers] = useState([]);
    const [aboveTeachers, setAboveTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [belowDepartmentFilter, setBelowDepartmentFilter] = useState('');
    const [aboveDepartmentFilter, setAboveDepartmentFilter] = useState('');
    const [belowSearchQuery, setBelowSearchQuery] = useState('');
    const [aboveSearchQuery, setAboveSearchQuery] = useState('');
    const [belowPage, setBelowPage] = useState(0);
    const [abovePage, setAbovePage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userData = await getUser();
                setUser(userData);

                if (userData) {
                    if (!userData || userData.user.role !== 1) {
                        switch (userData.user.role) {
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
                    const belowTeachersData = await getBelowTeachers();
                    const aboveTeachersData = await getAboveTeachers();
                    setBelowTeachers(belowTeachersData);
                    setAboveTeachers(aboveTeachersData);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    const getUniqueDepartments = (teachers) => {
        return [...new Set(teachers.map(teacher => teacher.departmentName))];
    };

    const handleChangePage = (setPage) => (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setBelowPage(0);
        setAbovePage(0);
    };

    const renderTeacherTable = (teachers, title, departmentFilter, setDepartmentFilter, searchQuery, setSearchQuery, ExportButton, page, setPage) => {
        const filteredTeachers = teachers.filter(teacher => 
            (departmentFilter === '' || teacher.departmentName === departmentFilter) &&
            teacher.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const paginatedTeachers = filteredTeachers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

        const uniqueDepartments = getUniqueDepartments(teachers);

        return (
            <Box mb={4}>
                <Typography variant="h5" mb={2}>
                    {title}
                </Typography>
                <Box display="flex" justifyContent="space-between" mb={2}>
                    <TextField
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm theo tên giáo viên"
                        style={{ width: '300px' }}
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
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                            displayEmpty
                            style={{ width: '200px', marginRight: '10px' }}
                        >
                            <MenuItem value="">Tất cả tổ bộ môn</MenuItem>
                            {uniqueDepartments.map((dept) => (
                                <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                            ))}
                        </Select>
                        <ExportButton user={user?.user} />
                    </Box>
                </Box>
                <div className={styles.tableWrapper}>
                    <TableContainer component={Paper} className={styles.tableContainer}>
                        <Table stickyHeader className={styles.table}>
                            <TableHead>
                                <TableRow>
                                    <TableCell className={styles.stickyColumn}>STT</TableCell>
                                    <TableCell className={styles.stickyColumn}>Tên giáo viên</TableCell>
                                    <TableCell>Tổ bộ môn</TableCell>
                                    <TableCell>Môn học giảng dạy</TableCell>
                                    <TableCell>Tiết/Tuần</TableCell>
                                    <TableCell>Số tuần dạy</TableCell>
                                    <TableCell>Số tiết cơ bản</TableCell>
                                    <TableCell>Tổng số tiết</TableCell>
                                    <TableCell>Tỉ lệ hoàn thành</TableCell>
                                    <TableCell>Số tiết dư</TableCell>
                                    <TableCell>Tiết giảm của giáo viên</TableCell>
                                    <TableCell>Tiết giảm của chủ nhiệm</TableCell>
                                    <TableCell>Tổng số tiết giảm</TableCell>
                                    <TableCell>Nội dung giảm của giáo viên</TableCell>
                                    <TableCell>Nội dung giảm của chủ nhiệm</TableCell>
                                    <TableCell>Lớp</TableCell>
                                    <TableCell>Môn học</TableCell>
                                    <TableCell>Số tiết khai báo</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedTeachers.map((teacher, index) => {
                                    const rowSpan = Math.max(teacher.teachingDetails?.length || 1, 1);
                                    const teacherReduction = teacher.teacherReduction || {};
                                    const homeroomReduction = teacher.homeroomReduction || {};

                                    // Tính tổng số tiết giảm của giáo viên và chủ nhiệm
                                    const totalReducedLessons = (teacherReduction.totalReducedLessons || 0) + (homeroomReduction.totalReducedLessons || 0);

                                    return (
                                        <React.Fragment key={teacher.id}>
                                            <TableRow>
                                                <TableCell rowSpan={rowSpan} className={styles.stickyColumn}>{page * rowsPerPage + index + 1}</TableCell>
                                                <TableCell rowSpan={rowSpan} className={styles.stickyColumn}>{teacher.name}</TableCell>
                                                <TableCell rowSpan={rowSpan}>{teacher.departmentName}</TableCell>
                                                <TableCell rowSpan={rowSpan}>{teacher.teachingSubject}</TableCell>
                                                <TableCell rowSpan={rowSpan}>{teacher.lessonsPerWeek}</TableCell>
                                                <TableCell rowSpan={rowSpan}>{teacher.teachingWeeks}</TableCell>
                                                <TableCell rowSpan={rowSpan}>{teacher.basicTeachingLessons}</TableCell>
                                                <TableCell rowSpan={rowSpan}>{teacher.totalAssignment > 0 ? teacher.totalAssignment : "Chưa khai báo"}</TableCell>
                                                <TableCell rowSpan={rowSpan}>{`${((teacher.totalAssignment / teacher.basicTeachingLessons) * 100).toFixed(2)}%`}</TableCell>
                                                <TableCell rowSpan={rowSpan}>{Math.max(0, teacher.totalAssignment - teacher.basicTeachingLessons)}</TableCell>
                                                <TableCell rowSpan={rowSpan}>{teacherReduction.totalReducedLessons || '-'}</TableCell>
                                                <TableCell rowSpan={rowSpan}>{homeroomReduction.totalReducedLessons || '-'}</TableCell>
                                                <TableCell rowSpan={rowSpan}>{totalReducedLessons}</TableCell>
                                                <TableCell rowSpan={rowSpan}>{teacherReduction.reductionReason || '-'}</TableCell>
                                                <TableCell rowSpan={rowSpan}>{homeroomReduction.reductionReason || '-'}</TableCell>
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
                    <TablePagination
                        rowsPerPageOptions={[25, 50, 100]}
                        component="div"
                        count={filteredTeachers.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage(setPage)}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        style={{ overflow: 'unset' }}
                    />
                </div>
            </Box>
        );
    };

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
                <title>Thống kê khối lượng giảng dạy</title>
            </Helmet>
            <Header />
            <div className={styles.dashboardMinistry}>
                <Box m="20px">
                    <Link to="/ministry-declare" style={{ textDecoration: 'none', paddingBottom: '5px', fontSize: '20px' }}>
                        <ArrowBackIcon />
                    </Link>
                    <Typography variant="h4" mb={2} style={{ marginTop: '10px' }}>
                        Thống kê khối lượng giảng dạy
                    </Typography>
                    {renderTeacherTable(
                        belowTeachers,
                        "Giáo viên chưa đủ số tiết cơ bản",
                        belowDepartmentFilter,
                        setBelowDepartmentFilter,
                        belowSearchQuery,
                        setBelowSearchQuery,
                        ExportBelowTeachersButton,
                        belowPage,
                        setBelowPage
                    )}
                    {renderTeacherTable(
                        aboveTeachers,
                        "Giáo viên vượt quá số tiết cơ bản 25%",
                        aboveDepartmentFilter,
                        setAboveDepartmentFilter,
                        aboveSearchQuery,
                        setAboveSearchQuery,
                        ExportAboveTeachersButton,
                        abovePage,
                        setAbovePage
                    )}
                </Box>
            </div>
            <Footer />
            <ToastContainer />
        </>
    );
};

export default TeacherWorkloadStatistics;
