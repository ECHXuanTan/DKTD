import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, Link } from 'react-router-dom';
import { Circles } from 'react-loader-spinner';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { getUser } from '../../services/authServices';
import { getAllTeachersAboveThreshold, getAllTeachersBelowBasic } from '../../services/statisticsServices';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, InputAdornment, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import styles from '../../css/Admin/AdminWarning.module.css';

const AdminWarning = () => {
    const [user, setUser] = useState(null);
    const [aboveTeachers, setAboveTeachers] = useState([]);
    const [belowTeachers, setBelowTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [aboveSearchQuery, setAboveSearchQuery] = useState('');
    const [belowSearchQuery, setBelowSearchQuery] = useState('');
    const [aboveDepartments, setAboveDepartments] = useState([]);
    const [belowDepartments, setBelowDepartments] = useState([]);
    const [selectedAboveDepartment, setSelectedAboveDepartment] = useState('all');
    const [selectedBelowDepartment, setSelectedBelowDepartment] = useState('all');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userData = await getUser();
                setUser(userData);
                
                if (userData && !userData.user.isAdmin) {
                    navigate('/dashboard');
                    return;
                }
                
                const aboveTeachersData = await getAllTeachersAboveThreshold();
                const belowTeachersData = await getAllTeachersBelowBasic();
                
                setAboveTeachers(aboveTeachersData);
                setBelowTeachers(belowTeachersData);

                // Extract unique departments for each table
                const uniqueAboveDepartments = [...new Set(aboveTeachersData.map(teacher => teacher.departmentName))];
                const uniqueBelowDepartments = [...new Set(belowTeachersData.map(teacher => teacher.departmentName))];
                setAboveDepartments(uniqueAboveDepartments);
                setBelowDepartments(uniqueBelowDepartments);
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.');
            } finally {
                setLoading(false);
            }
        };
    
        fetchData();
    }, [navigate]);

    const renderTeacherTable = (teachers, title, searchQuery, setSearchQuery, departments, selectedDepartment, setSelectedDepartment, isAboveThreshold) => {
        const filteredTeachers = teachers.filter(teacher => 
            (teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            teacher.departmentName.toLowerCase().includes(searchQuery.toLowerCase())) &&
            (selectedDepartment === 'all' || teacher.departmentName === selectedDepartment)
        );

        return (
            <Box mb={4}>
                <Typography variant="h5" mb={2}>
                    {title}
                </Typography>
                <Box display="flex" justifyContent="space-between" mb={2}>
                    <TextField
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm theo tên giáo viên hoặc tên tổ bộ môn"
                        style={{ width: '300px' }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                    />
                    <FormControl style={{ width: '200px' }}>
                        <InputLabel>Tổ bộ môn</InputLabel>
                        <Select
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                        >
                            <MenuItem value="all">Tất cả</MenuItem>
                            {departments.map((dept, index) => (
                                <MenuItem key={index} value={dept}>{dept}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
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
                                <TableCell>{isAboveThreshold ? "Số tiết dư" : "Số tiết thiếu"}</TableCell>
                                <TableCell>Lớp</TableCell>
                                <TableCell>Môn học</TableCell>
                                <TableCell>Số tiết khai báo</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredTeachers.map((teacher, index) => {
                                const rowSpan = Math.max(teacher.teachingDetails?.length || 1, 1);
                                const lessonDifference = isAboveThreshold 
                                    ? teacher.totalAssignment - teacher.basicTeachingLessons
                                    : teacher.basicTeachingLessons - teacher.totalAssignment;
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
                                            <TableCell rowSpan={rowSpan}>{`${((teacher.totalAssignment / teacher.basicTeachingLessons) * 100).toFixed(2)}%`}</TableCell>
                                            <TableCell rowSpan={rowSpan}>{lessonDifference}</TableCell>
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
                <title>Cảnh báo giáo viên - Admin</title>
            </Helmet>
            <Header />
            <div className={styles.warningContainer}>
                <Box m="20px">
                    <Link to="/admin-dashboard" style={{ textDecoration: 'none', paddingBottom: '5px', fontSize: '20px' }}>
                        <ArrowBackIcon />
                    </Link>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h4" style={{ marginTop: '10px' }}>
                            Cảnh báo giáo viên - Toàn trường
                        </Typography>
                    </Box>
                    {renderTeacherTable(
                        aboveTeachers,
                        "Giáo viên vượt quá 25% số tiết cơ bản",
                        aboveSearchQuery,
                        setAboveSearchQuery,
                        aboveDepartments,
                        selectedAboveDepartment,
                        setSelectedAboveDepartment,
                        true
                    )}
                    {renderTeacherTable(
                        belowTeachers,
                        "Giáo viên chưa đạt số tiết cơ bản",
                        belowSearchQuery,
                        setBelowSearchQuery,
                        belowDepartments,
                        selectedBelowDepartment,
                        setSelectedBelowDepartment,
                        false
                    )}
                </Box>
            </div>
            <Footer />
            <ToastContainer />
        </>
    );
};

export default AdminWarning;