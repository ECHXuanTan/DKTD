import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Circles } from 'react-loader-spinner';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { getDepartmentTeachersById } from '../../services/statisticsServices';
import { getUser } from '../../services/authServices.js';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Box, Typography, TextField, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import styles from '../../css/Admin/AdminDepartment.module.css';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const AdminDepartment = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { departmentId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAdminAndStats = async () => {
      try {
        const userData = await getUser();
        if (!userData || userData.user.role !== 2) {
          // Redirect based on user role
          switch(userData.user.role) {
            case 1:
              navigate('/ministry-dashboard');
              break;
            case 0:
              navigate('/user-dashboard');
              break;
            default:
              navigate('/login');
          }
        } else {
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminAndStats();
  }, [navigate]);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const teachersData = await getDepartmentTeachersById(departmentId);
        if (Array.isArray(teachersData) && teachersData.length > 0) {
          const sortedTeachers = teachersData.sort((a, b) => a.name.localeCompare(b.name));
          setTeachers(sortedTeachers);
        } else {
          console.error('Invalid teachers data:', teachersData);
          toast.error('Định dạng dữ liệu giáo viên không hợp lệ. Vui lòng thử lại sau.');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
  }, [departmentId]);

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const filteredTeachers = teachers.filter((teacher) =>
    teacher.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <title>Quản lý khoa</title>
      </Helmet>
      <Header />
      <div className={styles.adminDepartment}>
        <Box mt={4}>
        <Link to="/admin-dashboard" style={{ textDecoration: 'none', paddingBottom: '5px', fontSize: '20px' }}>
          <ArrowBackIcon />
        </Link>
          <Typography variant="h4" mb={2}>
            Danh sách giáo viên {teachers[0]?.departmentName || 'Tổ bộ môn'}
          </Typography>
          {teachers.length > 0 ? (
            <>
              <Box display="flex" justifyContent="space-between" mb={3}>
                <TextField
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Tìm kiếm theo tên"
                  style={{ width: '30%' }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <TableContainer component={Paper}>
                <Table className={styles.table}>
                  <TableHead>
                    <TableRow>
                      <TableCell className={styles.tableHeader}>STT</TableCell>
                      <TableCell className={styles.tableHeader}>Tên giáo viên</TableCell>
                      <TableCell className={styles.tableHeader}>Tiết/Tuần</TableCell>
                      <TableCell className={styles.tableHeader}>Số tuần dạy</TableCell>
                      <TableCell className={styles.tableHeader}>Số tiết cơ bản</TableCell>
                      <TableCell className={styles.tableHeader}>Tổng số tiết</TableCell>
                      <TableCell className={styles.tableHeader}>Tỉ lệ hoàn thành</TableCell>
                      <TableCell className={styles.tableHeader}>Số tiết dư</TableCell>
                      <TableCell className={styles.tableHeader}>Lớp</TableCell>
                      <TableCell className={styles.tableHeader}>Môn học</TableCell>
                      <TableCell className={styles.tableHeader}>Số tiết khai báo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTeachers.map((teacher, index) => {
                      const rowSpan = Math.max(teacher.teachingDetails?.length || 1, 1);
                      return (
                        <React.Fragment key={teacher.id}>
                          <TableRow className={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                            <TableCell rowSpan={rowSpan}>{index + 1}</TableCell>
                            <TableCell rowSpan={rowSpan}>{teacher.name}</TableCell>
                            <TableCell rowSpan={rowSpan}>{teacher.lessonsPerWeek}</TableCell>
                            <TableCell rowSpan={rowSpan}>{teacher.teachingWeeks}</TableCell>
                            <TableCell rowSpan={rowSpan}>{teacher.basicTeachingLessons}</TableCell>
                            <TableCell rowSpan={rowSpan}>{teacher.totalAssignment > 0 ? teacher.totalAssignment : "Chưa khai báo"}</TableCell>
                            <TableCell rowSpan={rowSpan}>{`${((teacher.totalAssignment / teacher.basicTeachingLessons) * 100).toFixed(2)}%`}</TableCell>
                            <TableCell rowSpan={rowSpan}>{Math.max(0, teacher.totalAssignment - teacher.basicTeachingLessons)}</TableCell>
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
                            <TableRow key={`${teacher.id}-${detailIndex}`} className={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
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
            </>
          ) : (
            <Typography variant="body1" className={styles.noTeachersMessage}>
              Chưa có giáo viên được tạo
            </Typography>
          )}
        </Box>
      </div>
      <Footer />
      <ToastContainer />
    </>
  );
};

export default AdminDepartment;