import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, Link } from 'react-router-dom';
import { Circles } from 'react-loader-spinner';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { getUser } from '../../services/authServices';
import { getAboveTeachers, getBelowTeachers } from '../../services/statisticsServices';
import { getTeacherByEmail } from '../../services/teacherService';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, InputAdornment } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import ExportAboveTeachersButton from './Component/AboveTeachersReport';
import ExportBelowTeachersButton from './Component/BelowTeachersReport';
import styles from '../../css/Leader/LeaderWarning.module.css';

const LeaderWarning = () => {
    const [user, setUser] = useState(null);
    const [teacher, setTeacher] = useState(null);
    const [aboveTeachers, setAboveTeachers] = useState([]);
    const [belowTeachers, setBelowTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [aboveSearchQuery, setAboveSearchQuery] = useState('');
    const [belowSearchQuery, setBelowSearchQuery] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userData = await getUser();
                setUser(userData);
                
                if (userData) {
                    if (userData.user.isAdmin) {
                        navigate('/admin-dashboard');
                        return;
                    }
                    const teacherData = await getTeacherByEmail();
                    setTeacher(teacherData);
                    
                    const aboveTeachersData = await getAboveTeachers(teacherData.department._id);
                    const belowTeachersData = await getBelowTeachers(teacherData.department._id);
                    
                    setAboveTeachers(aboveTeachersData);
                    setBelowTeachers(belowTeachersData);
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

    const renderTeacherTable = (teachers, title, searchQuery, setSearchQuery, isAboveThreshold) => {
        const filteredTeachers = teachers.filter(teacher => 
            teacher.name.toLowerCase().includes(searchQuery.toLowerCase())
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
                    {isAboveThreshold ? (
                        <ExportAboveTeachersButton 
                            user={user} 
                            departmentId={teacher?.department?._id}
                            departmentName={teacher?.department?.name}
                        />
                    ) : (
                        <ExportBelowTeachersButton 
                            user={user} 
                            departmentId={teacher?.department?._id}
                            departmentName={teacher?.department?.name}
                        />
                    )}
                </Box>
                <TableContainer component={Paper}>
                    <Table className={styles.table}>
                        <TableHead>
                            <TableRow>
                                <TableCell>STT</TableCell>
                                <TableCell>Tên giáo viên</TableCell>
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
                <title>Cảnh báo giáo viên</title>
            </Helmet>
            <Header />
            <div className={styles.warningContainer}>
                <Box m="20px">
                    <Link to="/leader-declare" style={{ textDecoration: 'none', paddingBottom: '5px', fontSize: '20px' }}>
                        <ArrowBackIcon />
                    </Link>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h4" style={{ marginTop: '10px' }}>
                            Cảnh báo giáo viên - {teacher?.department?.name}
                        </Typography>
                    </Box>
                    {renderTeacherTable(
                        aboveTeachers,
                        "Giáo viên vượt quá 25% số tiết cơ bản",
                        aboveSearchQuery,
                        setAboveSearchQuery,
                        true
                    )}
                    {renderTeacherTable(
                        belowTeachers,
                        "Giáo viên chưa đạt số tiết cơ bản",
                        belowSearchQuery,
                        setBelowSearchQuery,
                        false
                    )}
                </Box>
            </div>
            <Footer />
            <ToastContainer />
        </>
    );
};

export default LeaderWarning;