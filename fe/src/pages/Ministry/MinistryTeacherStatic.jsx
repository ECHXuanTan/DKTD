import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, Link } from 'react-router-dom';
import { Circles } from 'react-loader-spinner';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import { getUser } from '../../services/authServices.js';
import { getAllTeachers } from '../../services/statisticsServices.js';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Box, Typography, TextField, Select, MenuItem, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import styles from '../../css/Ministry/MinistryTeacherStatic.module.css';
import ExportTeachersExcel from './Component/Statistics/ExportTeachersExcel.jsx';

const calculateCompletionPercentage = (declaredTeachingLessons, finalBasicTeachingLessons) => {
    if (finalBasicTeachingLessons === 0) return 0;
    const percentage = (declaredTeachingLessons / finalBasicTeachingLessons) * 100;
    return Math.min(percentage, 100).toFixed(2);
};

const calculateExcessLessons = (declaredTeachingLessons, finalBasicTeachingLessons) => {
    return Math.max(0, declaredTeachingLessons - finalBasicTeachingLessons);
};

const calculateTotalReducedLessons = (teacher) => {
    const reductionLessons = teacher.totalReducedLessons || 0;
    const homeroomLessons = teacher.homeroomInfo?.totalReducedLessons || 0;
    return reductionLessons + homeroomLessons;
};

const updateTeachersWithCorrectReductions = (teachers) => {
    return teachers.map(teacher => ({
        ...teacher,
        totalReducedLessons: calculateTotalReducedLessons(teacher),
        finalBasicTeachingLessons: teacher.basicTeachingLessons - calculateTotalReducedLessons(teacher)
    }));
};

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
                    const updatedTeachers = updateTeachersWithCorrectReductions(filteredTeachers);
                    setTeachers(updatedTeachers);
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

    const renderAssignments = (teacher, index) => {
        const assignments = teacher.teachingDetails || [];
        const rowSpan = Math.max(assignments.length || 1, 1);
        const isThinhGiang = teacher.type === "Thỉnh giảng";
    
        if (assignments.length > 0) {
            return assignments.map((assignment, idx) => (
                <TableRow key={`${teacher._id}-${idx}`} className={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                    {idx === 0 && (
                        <>
                            <TableCell rowSpan={rowSpan} className={`${styles.stickyColumn} ${styles.firstColumn}`}>{page * rowsPerPage + index + 1}</TableCell>
                            <TableCell rowSpan={rowSpan} className={`${styles.stickyColumn} ${styles.secondColumn}`}>{teacher.name}</TableCell>
                            <TableCell rowSpan={rowSpan} style={{textAlign: 'center'}}>{teacher.teachingSubjects}</TableCell>
                            <TableCell rowSpan={rowSpan} style={{textAlign: 'center'}}>{teacher.type}</TableCell>
                            <TableCell rowSpan={rowSpan} style={{textAlign: 'center'}}>{isThinhGiang ? '-' : teacher.basicTeachingLessons}</TableCell>
                            <TableCell rowSpan={rowSpan} style={{textAlign: 'center'}}>{isThinhGiang ? '-' : teacher.totalReductions}</TableCell>
                            <TableCell rowSpan={rowSpan} className={styles.reductionCell}>
                                {!isThinhGiang && teacher.reductions && teacher.reductions.map((reduction, rIndex) => (
                                    <div key={rIndex} className={styles.reductionRow}>
                                        {reduction.reductionReason}: {reduction.reducedLessons}
                                    </div>
                                ))}
                                {!isThinhGiang && teacher.homeroomInfo?.reductionReason && (
                                    <div className={styles.reductionRow}>
                                        {teacher.homeroomInfo.reductionReason}: {teacher.homeroomInfo.totalReducedLessons}
                                    </div>
                                )}
                            </TableCell>
                            <TableCell rowSpan={rowSpan} style={{textAlign: 'center'}}>{isThinhGiang ? '-' : teacher.finalBasicTeachingLessons}</TableCell>
                            <TableCell rowSpan={rowSpan} style={{textAlign: 'center'}}>{teacher.totalAssignment || "Chưa khai báo"}</TableCell>
                            <TableCell rowSpan={rowSpan} style={{textAlign: 'center'}}>{isThinhGiang ? '-' : (teacher.declaredTeachingLessons || "Chưa khai báo")}</TableCell>
                            <TableCell rowSpan={rowSpan} style={{textAlign: 'center'}}>{isThinhGiang ? '-' : `${calculateCompletionPercentage(teacher.declaredTeachingLessons, teacher.finalBasicTeachingLessons)}%`}</TableCell>
                            <TableCell rowSpan={rowSpan} style={{textAlign: 'center'}}>{isThinhGiang ? '-' : calculateExcessLessons(teacher.declaredTeachingLessons, teacher.finalBasicTeachingLessons)}</TableCell>
                        </>
                    )}
                    <TableCell style={{textAlign: 'center'}}>{assignment.className}</TableCell>
                    <TableCell style={{textAlign: 'center'}}>{assignment.subject}</TableCell>
                    <TableCell style={{textAlign: 'center'}}>{assignment.completedLessons}</TableCell>
                </TableRow>
            ));
        } else {
            return (
                <TableRow className={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                    <TableCell className={`${styles.stickyColumn} ${styles.firstColumn}`}>{page * rowsPerPage + index + 1}</TableCell>
                    <TableCell className={`${styles.stickyColumn} ${styles.secondColumn}`}>{teacher.name}</TableCell>
                    <TableCell style={{textAlign: 'center'}}>{teacher.teachingSubjects}</TableCell>
                    <TableCell style={{textAlign: 'center'}}>{teacher.type}</TableCell>
                    <TableCell style={{textAlign: 'center'}}>{isThinhGiang ? '-' : teacher.basicTeachingLessons}</TableCell>
                    <TableCell style={{textAlign: 'center'}}>{isThinhGiang ? '-' : teacher.totalReductions}</TableCell>
                    <TableCell className={styles.reductionCell}>
                        {!isThinhGiang && teacher.reductions && teacher.reductions.map((reduction, rIndex) => (
                            <div key={rIndex} className={styles.reductionRow}>
                                {reduction.reductionReason}: {reduction.reducedLessons}
                            </div>
                        ))}
                        {!isThinhGiang && teacher.homeroomInfo?.reductionReason && (
                            <div className={styles.reductionRow}>
                                {teacher.homeroomInfo.reductionReason}: {teacher.homeroomInfo.totalReducedLessons}
                            </div>
                        )}
                    </TableCell>
                    <TableCell style={{textAlign: 'center'}}>{isThinhGiang ? '-' : teacher.finalBasicTeachingLessons}</TableCell>
                    <TableCell style={{textAlign: 'center'}}>Chưa khai báo</TableCell>
                    <TableCell style={{textAlign: 'center'}}>{isThinhGiang ? '-' : "Chưa khai báo"}</TableCell>
                    <TableCell style={{textAlign: 'center'}}>{isThinhGiang ? '-' : "0%"}</TableCell>
                    <TableCell style={{textAlign: 'center'}}>{isThinhGiang ? '-' : "0"}</TableCell>
                    <TableCell style={{textAlign: 'center'}}>-</TableCell>
                    <TableCell style={{textAlign: 'center'}}>-</TableCell>
                    <TableCell style={{textAlign: 'center'}}>-</TableCell>
                </TableRow>
            );
        }
    };
    
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
                        <ExportTeachersExcel teachers={teachers} />
                    </Box>
                </Box>
                <div className={styles.tableWrapper}>
                    <TableContainer component={Paper} className={styles.tableContainer}>
                        <Table stickyHeader className={styles.table}>
                            <TableHead>
                                <TableRow>
                                    <TableCell className={`${styles.tableHeader} ${styles.stickyColumn} ${styles.firstColumn} ${styles.headerFirstColumn}`}>STT</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.stickyColumn} ${styles.secondColumn} ${styles.headerSecondColumn}`}>Tên giáo viên</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Bộ môn</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Hình thức GV</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết chuẩn</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết giảm trừ</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.mediumWidth}`}>Nội dung giảm</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết chuẩn sau khi giảm trừ</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth2}`}>Tổng số tiết được phân công</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth2}`}>Số tiết hoàn thành nhiệm vụ</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Tỉ lệ hoàn thành</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết dư</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.mediumWidth}`}>Mã lớp</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.mediumWidth}`}>Môn học</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết khai báo</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedTeachers.map((teacher, index) => renderAssignments(teacher, index))}
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
                        <ExportTeachersExcel teachers={teachers} />
                    </Box>
                </Box>
                <div className={styles.tableWrapper}>
                    <TableContainer component={Paper} className={styles.tableContainer}>
                        <Table stickyHeader className={styles.table}>
                            <TableHead>
                                <TableRow>
                                    <TableCell className={`${styles.tableHeader} ${styles.stickyColumn} ${styles.firstColumn} ${styles.headerFirstColumn}`}>STT</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.stickyColumn} ${styles.secondColumn} ${styles.headerSecondColumn}`}>Tên giáo viên</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Bộ môn</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Hình thức GV</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết chuẩn</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết giảm trừ</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.mediumWidth}`}>Nội dung giảm</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết chuẩn sau khi giảm trừ</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth2}`}>Tổng số tiết được phân công</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth2}`}>Số tiết hoàn thành nhiệm vụ</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Tỉ lệ hoàn thành</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết dư</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.mediumWidth}`}>Mã lớp</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.mediumWidth}`}>Môn học</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết khai báo</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedTeachers.map((teacher, index) => renderAssignments(teacher, index))}
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
                        <ExportTeachersExcel teachers={teachers} />
                    </Box>
                </Box>
                <div className={styles.tableWrapper}>
                    <TableContainer component={Paper} className={styles.tableContainer}>
                        <Table stickyHeader className={styles.table}>
                            <TableHead>
                                <TableRow>
                                    <TableCell className={`${styles.tableHeader} ${styles.stickyColumn} ${styles.firstColumn} ${styles.headerFirstColumn}`}>STT</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.stickyColumn} ${styles.secondColumn} ${styles.headerSecondColumn}`}>Tên giáo viên</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Bộ môn</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Hình thức GV</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết chuẩn</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết giảm trừ</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.mediumWidth}`}>Nội dung giảm</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết chuẩn sau khi giảm trừ</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth2}`}>Tổng số tiết được phân công</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth2}`}>Số tiết hoàn thành nhiệm vụ</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Tỉ lệ hoàn thành</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết dư</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.mediumWidth}`}>Mã lớp</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.mediumWidth}`}>Môn học</TableCell>
                                    <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết khai báo</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedTeachers.map((teacher, index) => renderAssignments(teacher, index))}
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