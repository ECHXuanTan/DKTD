import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, Link } from 'react-router-dom';
import { getUser } from '../../services/authServices.js';
import { getDepartmentStatistics } from '../../services/statisticsServices';
import { Circles } from 'react-loader-spinner';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import { Box, Typography, TextField, Button, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Grid, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import styles from '../../css/AdminDashboard.module.css';

const AdminDashboard = () => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [departmentStats, setDepartmentStats] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
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
          setAdmin(userData.user);
          const stats = await getDepartmentStatistics();
          setDepartmentStats(stats);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminAndStats();
  }, [navigate]);

  const renderAdminInfo = () => {
    if (admin.email === 'dnvu.ctv@ptnk.edu.vn') {
      return (
        <>
          <Typography variant="body1"><strong>Họ và tên:</strong> Đặng Nguyên Vũ</Typography>
          <Typography variant="body1"><strong>Email:</strong> dnvu.ctv@ptnk.edu.vn</Typography>
          <Typography variant="body1"><strong>Chức vụ:</strong> Cộng tác viên Tổ Phát triển chương trình đào tạo và Đảm bảo chất lượng</Typography>
        </>
      );
    } else if (admin.email === 'hmthong@ptnk.edu.vn') {
      return (
        <>
          <Typography variant="body1"><strong>Họ và tên:</strong> Hoàng Minh Thông</Typography>
          <Typography variant="body1"><strong>Email:</strong> hmthong@ptnk.edu.vn</Typography>
          <Typography variant="body1"><strong>Chức vụ:</strong> Tổ trưởng Tổ Phát triển chương trình đào tạo và Đảm bảo chất lượng</Typography>
        </>
      );
    } else {
      return (
        <>
          <Typography variant="body1"><strong>Họ và tên:</strong> {admin.name}</Typography>
          <Typography variant="body1"><strong>Email:</strong> {admin.email}</Typography>
        </>
      );
    }
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const filteredDepartments = departmentStats.filter((dept) =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
    dept.name !== "Tổ GVĐT"
  );
  
  const totalTeachers = departmentStats
    .filter(dept => dept.name !== "Tổ GVĐT")
    .reduce((sum, dept) => sum + dept.teacherCount, 0);
  
  const totalDeclaredLessons = departmentStats
    .filter(dept => dept.name !== "Tổ GVĐT")
    .reduce((sum, dept) => sum + dept.declaredTeachingLessons, 0);
  
  const totalAboveThreshold = departmentStats
    .filter(dept => dept.name !== "Tổ GVĐT")
    .reduce((sum, dept) => sum + dept.teachersAboveThreshold, 0);
  
  const totalBelowBasic = departmentStats
    .filter(dept => dept.name !== "Tổ GVĐT")
    .reduce((sum, dept) => sum + dept.teachersBelowBasic, 0);

  const handleViewDepartmentDetail = (departmentId) => {
    navigate(`/admin-dashboard/department/${departmentId}`);
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
        <title>Admin Dashboard</title>
        <meta name="description" content="Trang quản trị kết quả đăng ký môn học" />
      </Helmet>
      <Header />
      <div className={styles.dashboardAdmin}>
        <Box className={styles.welcomeBox}>
          <Typography variant="h3" className={styles.welcomeTitle}>
            Trang quản lý kết quả khai báo tiết dạy giáo viên <br />
            Học kì 1 - Năm học 2024 - 2025
          </Typography>
          {admin && (
            <Box className={styles.adminInfo}>
              <Typography variant="h5" gutterBottom><strong>Thông tin quản trị viên:</strong></Typography>
              {renderAdminInfo()}
            </Box>
          )}
          <Grid container spacing={2} className={styles.statsGrid}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper className={`${styles.statBox} ${styles.blueBox}`}>
                <Typography variant="h6">Tổng số giáo viên của toàn trường</Typography>
                <Typography variant="h4">{totalTeachers}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper className={`${styles.statBox} ${styles.greenBox}`}>
                <Typography variant="h6">Tổng số tiết đã khai báo của toàn trường</Typography>
                <Typography variant="h4">{totalDeclaredLessons}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper className={`${styles.statBox} ${styles.orangeBox}`}>
                <Typography variant="h6">Giáo viên vượt quá 25% số tiết cơ bản</Typography>
                <Typography variant="h4">{totalAboveThreshold}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper className={`${styles.statBox} ${styles.redBox}`}>
                <Typography variant="h6">Giáo viên chưa đạt số tiết cơ bản</Typography>
                <Typography variant="h4">{totalBelowBasic}</Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
        <Box mt={4}>
          <Typography variant="h4" mb={2}>
            Thống kê theo tổ bộ môn
          </Typography>
          <Box display="flex" justifyContent="space-between" mb={3}>
            <TextField
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Tìm kiếm theo tên tổ bộ môn"
              style={{ width: '30%' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <Box>
              <Link to="/admin-result" style={{ textDecoration: 'none' }}>
                <Button variant="contained" className={styles.actionButton2}>Lịch sử hoạt động</Button>
              </Link>
              <Link to="/admin/class-statistics" style={{ textDecoration: 'none', marginLeft: '10px' }}>
                <Button variant="contained" className={styles.actionButton}>Thống kê theo lớp</Button>
              </Link>
            </Box>
          </Box>
          <TableContainer component={Paper}>
            <Table className={styles.table}>
              <TableHead>
                <TableRow>
                  <TableCell className={styles.tableHeader}>STT</TableCell>
                  <TableCell className={styles.tableHeader}>Tên tổ bộ môn</TableCell>
                  <TableCell className={styles.tableHeader}>Số giáo viên</TableCell>
                  <TableCell className={styles.tableHeader}>Số tiết được phân công</TableCell>
                  <TableCell className={styles.tableHeader}>Số tiết đã khai báo</TableCell>
                  <TableCell className={styles.tableHeader}>Số GV có khai báo</TableCell>
                  <TableCell className={styles.tableHeader}>Số GV vượt 25% số tiết cơ bản</TableCell>
                  <TableCell className={styles.tableHeader}>Số GV chưa đạt số tiết cơ bản</TableCell>
                  <TableCell className={styles.tableHeader}>Chi tiết</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDepartments.map((dept, index) => (
                  <TableRow key={dept._id} className={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{dept.name}</TableCell>
                    <TableCell>{dept.teacherCount}</TableCell>
                    <TableCell>{dept.totalAssignmentTime}</TableCell>
                    <TableCell>{dept.declaredTeachingLessons}</TableCell>
                    <TableCell>{dept.teachersWithDeclarations}</TableCell>
                    <TableCell>{dept.teachersAboveThreshold}</TableCell>
                    <TableCell>{dept.teachersBelowBasic}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleViewDepartmentDetail(dept._id)} color="primary">
                        <VisibilityIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </div>
      <Footer />
    </>
  );
};

export default AdminDashboard;