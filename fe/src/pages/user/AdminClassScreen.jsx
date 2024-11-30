import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Circles } from 'react-loader-spinner';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import { getAllClassesSubjects } from '../../services/statisticsServices';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
    Box, 
    Typography, 
    TextField, 
    Select, 
    MenuItem, 
    InputAdornment, 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow, 
    Paper, 
    TablePagination 
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import styles from '../../css/Admin/AdminClassScreen.module.css';

const AdminClassScreen = () => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [gradeFilter, setGradeFilter] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('');
    const [completionFilter, setCompletionFilter] = useState('all');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const classesData = await getAllClassesSubjects();
                if (Array.isArray(classesData) && classesData.length > 0) {
                    const sortedClasses = classesData.sort((a, b) => a.name.localeCompare(b.name));
                    setClasses(sortedClasses);
                } else {
                    console.error('Invalid classes data:', classesData);
                    toast.error('Định dạng dữ liệu lớp học không hợp lệ. Vui lòng thử lại sau.');
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.');
            } finally {
                setLoading(false);
            }
        };
        fetchClasses();
    }, []);

    const uniqueSubjects = [...new Set(classes.flatMap(classItem => 
        classItem.subjects.map(subject => subject.subject.name)
    ))].sort();

    const uniqueGrades = [...new Set(classes.map(classItem => classItem.grade))];

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

    const handleCompletionFilterChange = (event) => {
        setCompletionFilter(event.target.value);
        setPage(0);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const isClassComplete = (classItem) => {
        return classItem.subjects.every(subject => {
            const totalDeclaredLessons = subject.assignments?.reduce((sum, a) => sum + a.completedLessons, 0) || 0;
            return subject.lessonCount - totalDeclaredLessons === 0;
        });
    };

    const filteredClasses = classes.filter((classItem) => {
        const nameMatch = classItem.name.toLowerCase().includes(searchQuery.toLowerCase());
        const gradeMatch = gradeFilter === '' || classItem.grade === parseInt(gradeFilter);
        const subjectMatch = subjectFilter === '' || classItem.subjects.some(
            subject => subject.subject.name === subjectFilter
        );
        const completionMatch = completionFilter === 'all' || 
            (completionFilter === 'completed' ? isClassComplete(classItem) : !isClassComplete(classItem));
        
        return nameMatch && gradeMatch && subjectMatch && completionMatch;
    });

    const paginatedClasses = filteredClasses.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

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
                <title>Thống kê lớp học</title>
            </Helmet>
            <Header />
            <div className={styles.dashboardAdmin}>
                <Box m="20px">
                    <Link to="/admin-dashboard" style={{ textDecoration: 'none', paddingBottom: '5px', fontSize: '20px' }}>
                        <ArrowBackIcon />
                    </Link>
                    <Typography variant="h4" mb={2} style={{ marginTop: '10px' }}>
                        Thống kê lớp học
                    </Typography>
                    <Box mb={2}>
                        <Typography>Tổng số lớp: {classes.length}</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                        <TextField
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder="Tìm kiếm theo tên lớp"
                            style={{ width: '35%' }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Box display="flex" gap="20px">
                            <Select
                                value={gradeFilter}
                                onChange={handleGradeFilterChange}
                                displayEmpty
                                style={{ width: '160px' }}
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
                                style={{ width: '160px' }}
                            >
                                <MenuItem value="">Tất cả môn học</MenuItem>
                                {uniqueSubjects.map((subject) => (
                                    <MenuItem key={subject} value={subject}>{subject}</MenuItem>
                                ))}
                            </Select>
                            <Select
                                value={completionFilter}
                                onChange={handleCompletionFilterChange}
                                displayEmpty
                                style={{ width: '160px' }}
                            >
                                <MenuItem value="all">Tất cả các lớp</MenuItem>
                                <MenuItem value="completed">Đã hoàn thành</MenuItem>
                                <MenuItem value="incomplete">Chưa hoàn thành</MenuItem>
                            </Select>
                        </Box>
                    </Box>
                    <div className={styles.tableWrapper}>
                        <TableContainer component={Paper} className={styles.tableContainer}>
                            <Table stickyHeader className={styles.table}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell style={{width: '30px', textAlign: 'center'}}>STT</TableCell>
                                        <TableCell>Mã lớp</TableCell>
                                        <TableCell>Môn học</TableCell>
                                        <TableCell style={{textAlign: 'center'}}>Số tiết</TableCell>
                                        <TableCell style={{width: '80px', textAlign: 'center'}}>Tổng số tiết khai báo</TableCell>
                                        <TableCell style={{width: '80px', textAlign: 'center'}}>Số tiết còn lại</TableCell>
                                        <TableCell>Giáo viên</TableCell>
                                        <TableCell style={{width: '70px', textAlign: 'center'}}>Số tiết khai báo</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paginatedClasses.flatMap((classItem, index) => {
                                        const rowSpan = classItem.subjects?.reduce((sum, subject) =>
                                            sum + ((subject.assignments?.length || 0) || 1), 0) || 1;
                                        return (classItem.subjects || []).flatMap((subject, subjectIndex) => {
                                            const subjectRowSpan = subject.assignments?.length || 1;
                                            const totalDeclaredLessons = subject.assignments?.reduce((sum, a) => sum + a.completedLessons, 0) || 0;
                                            const remainingLessons = subject.lessonCount - totalDeclaredLessons;

                                            return (subject.assignments?.length > 0 ? (
                                                (subject.assignments || []).map((assignment, assignmentIndex) => (
                                                    <TableRow key={`${classItem._id}-${subject.subject.name}-${assignmentIndex}`}>
                                                        {subjectIndex === 0 && assignmentIndex === 0 && (
                                                            <>
                                                                <TableCell style={{textAlign: 'center'}} rowSpan={rowSpan}>
                                                                    {page * rowsPerPage + index + 1}
                                                                </TableCell>
                                                                <TableCell rowSpan={rowSpan}>{classItem.name}</TableCell>
                                                            </>
                                                        )}
                                                        {assignmentIndex === 0 && (
                                                            <>
                                                                <TableCell rowSpan={subjectRowSpan}>{subject.subject.name}</TableCell>
                                                                <TableCell rowSpan={subjectRowSpan} style={{textAlign: 'center'}}>
                                                                    {subject.lessonCount}
                                                                </TableCell>
                                                                <TableCell rowSpan={subjectRowSpan} style={{textAlign: 'center'}}>
                                                                    {totalDeclaredLessons}
                                                                </TableCell>
                                                                <TableCell rowSpan={subjectRowSpan} style={{textAlign: 'center'}}>
                                                                    {remainingLessons}
                                                                </TableCell>
                                                            </>
                                                        )}
                                                        <TableCell>{assignment.teacherName}</TableCell>
                                                        <TableCell style={{textAlign: 'center'}}>{assignment.completedLessons}</TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow key={`${classItem._id}-${subject.subject.name}`}>
                                                    {subjectIndex === 0 && (
                                                        <>
                                                            <TableCell style={{textAlign: 'center'}} rowSpan={rowSpan}>
                                                                {page * rowsPerPage + index + 1}
                                                            </TableCell>
                                                            <TableCell rowSpan={rowSpan}>{classItem.name}</TableCell>
                                                        </>
                                                    )}
                                                    <TableCell>{subject.subject.name}</TableCell>
                                                    <TableCell style={{textAlign: 'center'}}>{subject.lessonCount}</TableCell>
                                                    <TableCell style={{textAlign: 'center'}}>0</TableCell>
                                                    <TableCell style={{textAlign: 'center'}}>{subject.lessonCount}</TableCell>
                                                    <TableCell>Chưa phân công</TableCell>
                                                    <TableCell style={{textAlign: 'center'}}>0</TableCell>
                                                </TableRow>
                                            ));
                                        });
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            rowsPerPageOptions={[25, 50, 100]}
                            component="div"
                            count={filteredClasses.length}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={handleChangePage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            style={{ overflow: 'unset' }}
                        />
                    </div>
                </Box>
            </div>
            <Footer />
            <ToastContainer />
        </>
    );
};

export default AdminClassScreen;