import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, Link } from 'react-router-dom';
import { Circles } from 'react-loader-spinner';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import { getUser } from '../../services/authServices.js';
import { getAllClasses } from '../../services/statisticsServices';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Box, Typography, TextField, Select, MenuItem, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import styles from '../../css/Ministry/MinistryClassStatistics.module.css';
import ExportAllClassesButton from './Component/AllClassesReport.jsx';
import SingleClassReport from './Component/SingleClassReport.jsx';

const MinistryClassStatistics = () => { 
    const [user, setUser] = useState(null);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [gradeFilter, setGradeFilter] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserAndClasses = async () => {
          try {
            const userData = await getUser();
            setUser(userData);
            
            if (userData) {
              if (userData.user.isAdmin) {
                navigate('/admin-dashboard');
                return;
              }
              const classesData = await getAllClasses();
              if (Array.isArray(classesData) && classesData.length > 0) {
                const sortedClasses = classesData.sort((a, b) => a.className.localeCompare(b.className));
                setClasses(sortedClasses);
              } else {
                console.error('Invalid classes data:', classesData);
                toast.error('Định dạng dữ liệu lớp học không hợp lệ. Vui lòng thử lại sau.');
              }
            }
          } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.');
          } finally {
            setLoading(false);
          }
        };
    
        fetchUserAndClasses();
    }, [navigate]);

    const handleSearchChange = (event) => {
        setSearchQuery(event.target.value);
    };

    const handleGradeFilterChange = (event) => {
        setGradeFilter(event.target.value);
    };

    const filteredClasses = classes.filter((classItem) =>
        classItem.className.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (gradeFilter === '' || classItem.grade === parseInt(gradeFilter))
    );

    const uniqueGrades = [...new Set(classes.map(classItem => classItem.grade))];

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
            <title>Thống kê lớp học</title>
        </Helmet>
        <Header/>
        <div className={styles.dashboardMinistry}>
            <Box m="20px">
                <Link to="/ministry-declare" style={{ textDecoration: 'none', paddingBottom: '5px', fontSize: '20px'}}>
                     <ArrowBackIcon/>
                </Link>
                <Typography variant="h4" mb={2} style={{ marginTop: '10px'}}>
                    Thống kê lớp học
                </Typography>
                <Box mb={2}>
                    <Typography>Tổng số lớp: {classes.length}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={3}>
                    <TextField
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="Tìm kiếm theo tên lớp"
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
                            value={gradeFilter}
                            onChange={handleGradeFilterChange}
                            displayEmpty
                            style={{ width: '200px', marginRight: '10px' }}
                        >
                            <MenuItem value="">Tất cả khối</MenuItem>
                            {uniqueGrades.map((grade) => (
                                <MenuItem key={grade} value={grade}>Khối {grade}</MenuItem>
                            ))}
                        </Select>
                        <ExportAllClassesButton user={user?.user} />
                    </Box>
                </Box>
                <TableContainer component={Paper}>
                    <Table className={styles.table}>
                        <TableHead>
                            <TableRow>
                                <TableCell>STT</TableCell>
                                <TableCell>Tên lớp</TableCell>
                                <TableCell>Khối</TableCell>
                                <TableCell>Môn học</TableCell>
                                <TableCell>Số tiết</TableCell>
                                <TableCell>Giáo viên</TableCell>
                                <TableCell>Số tiết khai báo</TableCell>
                                <TableCell>Hành động</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredClasses.map((classItem, index) => {
                                const rowSpan = classItem.subjects.reduce((sum, subject) => sum + (subject.assignments.length || 1), 0);
                                return classItem.subjects.map((subject, subjectIndex) => {
                                    const subjectRowSpan = subject.assignments.length || 1;
                                    return subject.assignments.length > 0 ? (
                                        subject.assignments.map((assignment, assignmentIndex) => (
                                            <TableRow key={`${classItem._id}-${subject.name}-${assignmentIndex}`}>
                                                {subjectIndex === 0 && assignmentIndex === 0 && (
                                                    <>
                                                        <TableCell rowSpan={rowSpan}>{index + 1}</TableCell>
                                                        <TableCell rowSpan={rowSpan}>{classItem.className}</TableCell>
                                                        <TableCell rowSpan={rowSpan}>{classItem.grade}</TableCell>
                                                    </>
                                                )}
                                                {assignmentIndex === 0 && (
                                                    <>
                                                        <TableCell rowSpan={subjectRowSpan}>{subject.name}</TableCell>
                                                        <TableCell rowSpan={subjectRowSpan}>{subject.lessonCount}</TableCell>
                                                    </>
                                                )}
                                                <TableCell>{assignment.teacherName}</TableCell>
                                                <TableCell>{assignment.completedLessons}</TableCell>
                                                {subjectIndex === 0 && assignmentIndex === 0 && (
                                                    <TableCell rowSpan={rowSpan}>
                                                        <SingleClassReport user={user?.user} classId={classItem._id} />
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow key={`${classItem._id}-${subject.name}`}>
                                            {subjectIndex === 0 && (
                                                <>
                                                    <TableCell rowSpan={rowSpan}>{index + 1}</TableCell>
                                                    <TableCell rowSpan={rowSpan}>{classItem.className}</TableCell>
                                                    <TableCell rowSpan={rowSpan}>{classItem.grade}</TableCell>
                                                </>
                                            )}
                                            <TableCell>{subject.name}</TableCell>
                                            <TableCell>{subject.lessonCount}</TableCell>
                                            <TableCell>Chưa phân công</TableCell>
                                            <TableCell>0</TableCell>
                                            {subjectIndex === 0 && (
                                                <TableCell rowSpan={rowSpan}>
                                                    <SingleClassReport user={user?.user} classId={classItem._id} />
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                });
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

export default MinistryClassStatistics;