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
import ExportTeachersExcel from './Component/Statistics/ExportTeachersExcel.jsx';

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
                    setTeachers(filteredTeachers);
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

    const calculateCompletionPercentage = (totalAssignment, finalBasicTeachingLessons) => {
        if (finalBasicTeachingLessons === 0) return 0;
        const percentage = (totalAssignment / finalBasicTeachingLessons) * 100;
        return Math.min(percentage, 100).toFixed(2);
    };

    const calculateExcessLessons = (totalAssignment, finalBasicTeachingLessons) => {
        return Math.max(0, totalAssignment - finalBasicTeachingLessons);
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

    const columns = [
        { field: 'index', label: 'STT', width: '3%', sticky: true },
        { field: 'name', label: 'Tên giáo viên', width: '10%', sticky: true },
        { field: 'departmentName', label: 'Tổ bộ môn', width: '10%' },
        { field: 'teachingSubjects', label: 'Môn giảng dạy', width: '10%' },
        { field: 'homeroomClass', label: 'Lớp chủ nhiệm', width: '8%' },
        { field: 'type', label: 'Hình thức giáo viên', width: '8%' },
        { field: 'lessonsPerWeek', label: 'Tiết/Tuần', width: '5%' },
        { field: 'teachingWeeks', label: 'Số tuần dạy', width: '5%' },
        { field: 'basicTeachingLessons', label: 'Số tiết cơ bản', width: '8%' },
        { field: 'reducedLessonsPerWeek', label: 'Số tiết giảm/tuần', width: '8%' },
        { field: 'reducedWeeks', label: 'Số tuần giảm', width: '6%' },
        { field: 'totalReducedLessons', label: 'Số tiết giảm', width: '8%' },
        { field: 'reductionReason', label: 'Nội dung giảm', width: '10%' },
        { field: 'totalReductionLessons', label: 'Tổng số tiết giảm', width: '8%' },
        { field: 'finalBasicTeachingLessons', label: 'Số tiết chuẩn cuối', width: '8%' },
        { field: 'totalLessonsQ5NS', label: 'Không chuyên Cơ sở Quận 5', width: '8%' },
        { field: 'totalLessonsQ5S', label: 'Chuyên cơ sở Quận 5', width: '8%' },
        { field: 'totalLessonsTDNS', label: 'Không chuyên Cơ sở Thủ Đức', width: '8%' },
        { field: 'totalLessonsTDS', label: 'Chuyên cơ sở Thủ Đức', width: '8%' },
        { field: 'totalAssignment', label: 'Tổng số tiết', width: '8%' },
        { field: 'completionPercentage', label: 'Tỉ lệ hoàn thành', width: '8%' },
        { field: 'excessLessons', label: 'Số tiết dư', width: '6%' },
        { field: 'grade', label: 'Khối', width: '5%' },
        { field: 'className', label: 'Tên lớp', width: '8%' },
        { field: 'subject', label: 'Môn học', width: '8%' },
        { field: 'completedLessons', label: 'Số tiết', width: '5%' },
    ];

    const rows = paginatedTeachers.map((teacher, index) => {
        const baseIndex = page * rowsPerPage + index + 1;
        const totalReductionLessons = (teacher.teacherReduction?.totalReducedLessons || 0) + (teacher.homeroom?.totalReducedLessons || 0);
        const finalBasicTeachingLessons = teacher.type === "Thỉnh giảng" ? '' : teacher.basicTeachingLessons - totalReductionLessons;
    
        const teachingDetailsRows = teacher.teachingDetails && teacher.teachingDetails.length > 0
            ? teacher.teachingDetails
            : [{ grade: '', className: '', subject: '', completedLessons: '' }];
    
        const reductionRows = [];
        if (teacher.teacherReduction) {
            reductionRows.push({
                reducedLessonsPerWeek: teacher.teacherReduction.reducedLessonsPerWeek,
                reducedWeeks: teacher.teacherReduction.reducedWeeks,
                totalReducedLessons: teacher.teacherReduction.totalReducedLessons,
                reductionReason: teacher.teacherReduction.reductionReason
            });
        }
        if (teacher.homeroom) {
            reductionRows.push({
                reducedLessonsPerWeek: teacher.homeroom.reducedLessonsPerWeek,
                reducedWeeks: teacher.homeroom.reducedWeeks,
                totalReducedLessons: teacher.homeroom.totalReducedLessons,
                reductionReason: teacher.homeroom.reductionReason
            });
        }
    
        const filterAndJoin = (key) => {
            const uniqueValues = new Set();
            return reductionRows
                .map(row => row[key])
                .filter(value => {
                    if (value && value !== '0' && value !== 'Nội dung giảm không có') {
                        if (key === 'reducedWeeks') {
                            if (uniqueValues.has(value)) {
                                return false;
                            }
                            uniqueValues.add(value);
                        }
                        return true;
                    }
                    return false;
                })
                .join('; ');
        };
    
        return {
            id: teacher.id,
            index: baseIndex,
            name: teacher.name,
            departmentName: teacher.departmentName,
            teachingSubjects: teacher.teachingSubjects,
            homeroomClass: teacher.homeroom ? teacher.homeroom.className : '-',
            type: teacher.type,
            lessonsPerWeek: teacher.lessonsPerWeek,
            teachingWeeks: teacher.teachingWeeks,
            basicTeachingLessons: teacher.basicTeachingLessons,
            reducedLessonsPerWeek: filterAndJoin('reducedLessonsPerWeek'),
            reducedWeeks: filterAndJoin('reducedWeeks'),
            totalReducedLessons: filterAndJoin('totalReducedLessons'),
            reductionReason: filterAndJoin('reductionReason'),
            totalReductionLessons: totalReductionLessons,
            finalBasicTeachingLessons: finalBasicTeachingLessons,
            totalLessonsQ5NS: teacher.totalLessonsQ5NS || 0,
            totalLessonsQ5S: teacher.totalLessonsQ5S || 0,
            totalLessonsTDNS: teacher.totalLessonsTDNS || 0,
            totalLessonsTDS: teacher.totalLessonsTDS || 0,
            totalAssignment: teacher.totalAssignment > 0 ? teacher.totalAssignment : "Chưa khai báo",
            completionPercentage: teacher.type === "Cơ hữu" ? `${calculateCompletionPercentage(teacher.totalAssignment, finalBasicTeachingLessons)}%` : '-',
            excessLessons: teacher.type === "Cơ hữu" ? calculateExcessLessons(teacher.totalAssignment, finalBasicTeachingLessons) : '-',
            teachingDetails: teachingDetailsRows,
            reductionRows: reductionRows
        };
    });

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
                        <ExportTeachersExcel teachers={teachers} />
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
                                                style={{ 
                                                    width: column.width, 
                                                    minWidth: column.width,
                                                    whiteSpace: 'normal',
                                                    wordWrap: 'break-word'
                                                }}
                                                className={column.sticky ? styles.stickyColumn : ''}
                                            >
                                                {column.label}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rows.map((row, index) => {
                                        const rowSpan = Math.max(row.teachingDetails.length, 1);
                                        return (
                                            <React.Fragment key={row.id}>
                                                <TableRow className={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                                                    <TableCell rowSpan={rowSpan} className={styles.stickyColumn}>{row.index}</TableCell>
                                                    <TableCell rowSpan={rowSpan} className={styles.stickyColumn}>{row.name}</TableCell>
                                                    <TableCell rowSpan={rowSpan}>{row.departmentName}</TableCell>
                                                    <TableCell rowSpan={rowSpan}>{row.teachingSubjects}</TableCell>
                                                    <TableCell rowSpan={rowSpan}>{row.homeroomClass}</TableCell>
                                                    <TableCell rowSpan={rowSpan}>{row.type}</TableCell>
                                                    <TableCell rowSpan={rowSpan}>{row.lessonsPerWeek}</TableCell>
                                                    <TableCell rowSpan={rowSpan}>{row.teachingWeeks}</TableCell>
                                                    <TableCell rowSpan={rowSpan}>{row.basicTeachingLessons}</TableCell>
                                                    <TableCell rowSpan={rowSpan}>{row.reducedLessonsPerWeek}</TableCell>
                                                    <TableCell rowSpan={rowSpan}>{row.reducedWeeks}</TableCell>
                                                    <TableCell rowSpan={rowSpan}>{row.totalReducedLessons}</TableCell>
                                                    <TableCell rowSpan={rowSpan}>{row.reductionReason}</TableCell>
                                                    <TableCell rowSpan={rowSpan}>{row.totalReductionLessons}</TableCell>
                                                    <TableCell rowSpan={rowSpan}>{row.finalBasicTeachingLessons}</TableCell>
                                                    <TableCell rowSpan={rowSpan}>{row.totalLessonsQ5NS}</TableCell>
                                                    <TableCell rowSpan={rowSpan}>{row.totalLessonsQ5S}</TableCell>
                                                    <TableCell rowSpan={rowSpan}>{row.totalLessonsTDNS}</TableCell>
                                                    <TableCell rowSpan={rowSpan}>{row.totalLessonsTDS}</TableCell>
                                                    <TableCell rowSpan={rowSpan}>{row.totalAssignment}</TableCell>
                                                    <TableCell rowSpan={rowSpan}>{row.completionPercentage}</TableCell>
                                                    <TableCell rowSpan={rowSpan}>{row.excessLessons}</TableCell>
                                                    {row.teachingDetails.length > 0 ? (
                                                        <>
                                                            <TableCell>{row.teachingDetails[0].grade}</TableCell>
                                                            <TableCell>{row.teachingDetails[0].className}</TableCell>
                                                            <TableCell>{row.teachingDetails[0].subject}</TableCell>
                                                            <TableCell>{row.teachingDetails[0].completedLessons}</TableCell>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <TableCell rowSpan={rowSpan}>-</TableCell>
                                                            <TableCell rowSpan={rowSpan}>-</TableCell>
                                                            <TableCell rowSpan={rowSpan}>-</TableCell>
                                                            <TableCell rowSpan={rowSpan}>-</TableCell>
                                                        </>
                                                    )}
                                                </TableRow>
                                                {row.teachingDetails.slice(1).map((detail, detailIndex) => (
                                                    <TableRow key={`${row.id}-detail-${detailIndex}`} className={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                                                        <TableCell>{detail.grade}</TableCell>
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
                        </div>
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

