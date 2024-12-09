import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, Link } from 'react-router-dom';
import { Circles } from 'react-loader-spinner';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import { getUser } from '../../services/authServices.js';
import { getSubjectsAssignments } from '../../services/statisticsServices';
import { getSubject } from '../../services/subjectServices.js';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Box, Typography, TextField, Select, MenuItem, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import styles from '../../css/Ministry/MinistrySubjectStatistics.module.css';

const MinistrySubjectStatistics = () => {
    const [user, setUser] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [subjectList, setSubjectList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [gradeFilter, setGradeFilter] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserAndSubjects = async () => {
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
                    const [subjectsData, subjectListData] = await Promise.all([
                        getSubjectsAssignments(),
                        getSubject()
                    ]);

                    if (Array.isArray(subjectsData) && subjectsData.length > 0) {
                        const sortedSubjects = subjectsData.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
                        setSubjects(sortedSubjects);
                    } else {
                        console.error('Invalid subjects data:', subjectsData);
                        toast.error('Định dạng dữ liệu môn học không hợp lệ. Vui lòng thử lại sau.');
                    }

                    const filteredSubjectList = subjectListData.filter(subject => 
                        !['VP', 'HT', 'PHT', 'GVĐT', 'HTQT'].includes(subject.name)
                    );
                    setSubjectList(filteredSubjectList);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.');
            } finally {
                setLoading(false);
            }
        };

        fetchUserAndSubjects();
    }, [navigate]);

    const handleSearchChange = (event) => {
        setSearchQuery(event.target.value);
        setPage(0);
    };

    const handleGradeFilterChange = (event) => {
        setGradeFilter(event.target.value);
        setPage(0);
    };

    const handleSubjectFilterChange = (event) => {
        setSubjectFilter(event.target.value);
        setPage(0);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const filteredSubjects = subjects.filter((subject) => {
        const subjectMatchesSearch = subject.subjectName.toLowerCase().includes(searchQuery.toLowerCase());
        const subjectMatchesFilter = subjectFilter === '' || subject.subjectName === subjectFilter;
        const classesInGrade = subject.classes.filter(classItem => 
            gradeFilter === '' || classItem.grade === parseInt(gradeFilter)
        );
        return subjectMatchesSearch && subjectMatchesFilter && classesInGrade.length > 0;
    }).map(subject => ({
        ...subject,
        classes: subject.classes.filter(classItem => 
            gradeFilter === '' || classItem.grade === parseInt(gradeFilter)
        )
    }));

    const paginatedSubjects = filteredSubjects.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    const calculateTotalDeclaredLessons = (classes) => {
        return classes.reduce((sum, classItem) => sum + classItem.declaredLessons, 0);
    };

    const calculateTotalAssignedLessons = (classes) => {
        return classes.reduce((sum, classItem) => 
            sum + classItem.assignments.reduce((assignmentSum, assignment) => 
                assignmentSum + assignment.assignedLessons, 0), 0);
    };

    const calculateCompletionRate = (assigned, declared) => {
        return declared > 0 ? ((assigned / declared) * 100).toFixed(2) : '0.00';
    };

    const uniqueGrades = [...new Set(subjects.flatMap(subject => 
        subject.classes.map(classItem => classItem.grade)
    ))].sort((a, b) => a - b);

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
                <title>Thống kê môn học</title>
            </Helmet>
            <Header />
            <div className={styles.dashboardMinistry}>
                <Box m="20px">
                    <Link to="/ministry-declare" style={{ textDecoration: 'none', paddingBottom: '5px', fontSize: '20px' }}>
                        <ArrowBackIcon />
                    </Link>
                    <Typography variant="h4" mb={2} style={{ marginTop: '10px' }}>
                        Thống kê môn học
                    </Typography>
                    <Box mb={2}>
                        <Typography>Tổng số môn học: {subjects.length}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={3}>
                        <TextField
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder="Tìm kiếm theo tên môn học"
                            style={{ width: '30%' }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Box display="flex" alignItems="center" gap={2}>
                            <Select
                                value={gradeFilter}
                                onChange={handleGradeFilterChange}
                                displayEmpty
                                style={{ width: '150px' }}
                            >
                                <MenuItem value="">Tất cả khối</MenuItem>
                                {uniqueGrades.map((grade) => (
                                    <MenuItem key={grade} value={grade}>Khối {grade}</MenuItem>
                                ))}
                            </Select>
                            <Select
                                value={subjectFilter}
                                onChange={handleSubjectFilterChange}
                                displayEmpty
                                style={{ width: '200px' }}
                            >
                                <MenuItem value="">Tất cả môn học</MenuItem>
                                {subjectList.map((subject) => (
                                    <MenuItem key={subject._id} value={subject.name}>
                                        {subject.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Box>
                    </Box>
                    <div className={styles.tableWrapper}>
                        <TableContainer component={Paper} className={styles.tableContainer}>
                            <Table stickyHeader className={styles.table}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>STT</TableCell>
                                        <TableCell>Môn học</TableCell>
                                        <TableCell style={{ width: '100px' }}>Tổng số tiết được khai báo</TableCell>
                                        <TableCell style={{ width: '100px' }}>Tổng số tiết đã phân công</TableCell>
                                        <TableCell style={{ width: '100px' }}>Tỉ lệ hoàn thành (%)</TableCell>
                                        <TableCell>Lớp</TableCell>
                                        <TableCell style={{ width: '100px' }}>Số tiết được khai báo</TableCell>
                                        <TableCell>Giáo viên</TableCell>
                                        <TableCell style={{ width: '100px' }}>Số tiết đã khai báo</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paginatedSubjects.map((subject, index) => {
                                        const totalDeclaredLessons = calculateTotalDeclaredLessons(subject.classes);
                                        const totalAssignedLessons = calculateTotalAssignedLessons(subject.classes);
                                        const completionRate = calculateCompletionRate(totalAssignedLessons, totalDeclaredLessons);
                                        
                                        return subject.classes.map((classItem, classIndex) => (
                                            <React.Fragment key={`${subject.subjectId}-${classItem.classId}`}>
                                                <TableRow>
                                                    {classIndex === 0 && (
                                                        <>
                                                            <TableCell rowSpan={subject.classes.reduce((sum, c) => sum + Math.max(c.assignments.length, 1), 0)}>
                                                                {page * rowsPerPage + index + 1}
                                                            </TableCell>
                                                            <TableCell rowSpan={subject.classes.reduce((sum, c) => sum + Math.max(c.assignments.length, 1), 0)}>
                                                                {subject.subjectName}
                                                            </TableCell>
                                                            <TableCell rowSpan={subject.classes.reduce((sum, c) => sum + Math.max(c.assignments.length, 1), 0)}>
                                                                {totalDeclaredLessons}
                                                            </TableCell>
                                                            <TableCell rowSpan={subject.classes.reduce((sum, c) => sum + Math.max(c.assignments.length, 1), 0)}>
                                                                {totalAssignedLessons}
                                                            </TableCell>
                                                            <TableCell rowSpan={subject.classes.reduce((sum, c) => sum + Math.max(c.assignments.length, 1), 0)}>
                                                                {completionRate}%
                                                            </TableCell>
                                                        </>
                                                    )}
                                                    <TableCell rowSpan={classItem.assignments.length || 1}>{classItem.className}</TableCell>
                                                    <TableCell rowSpan={classItem.assignments.length || 1}>{classItem.declaredLessons}</TableCell>
                                                    {classItem.assignments.length > 0 ? (
                                                        <>
                                                            <TableCell>{classItem.assignments[0].teacherName}</TableCell>
                                                            <TableCell>{classItem.assignments[0].assignedLessons}</TableCell>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <TableCell>-</TableCell>
                                                            <TableCell>0</TableCell>
                                                        </>
                                                    )}
                                                </TableRow>
                                                {classItem.assignments.slice(1).map((assignment, assignmentIndex) => (
                                                    <TableRow key={`${subject.subjectId}-${classItem.classId}-${assignmentIndex}`}>
                                                        <TableCell>{assignment.teacherName}</TableCell>
                                                        <TableCell>{assignment.assignedLessons}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </React.Fragment>
                                        ));
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            rowsPerPageOptions={[25, 50, 100]}
                            component="div"
                            count={filteredSubjects.length}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={handleChangePage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            style={{overflow: 'unset'}}
                        />
                    </div>
                </Box>
            </div>
            <Footer />
            <ToastContainer />
        </>
    );
};

export default MinistrySubjectStatistics;