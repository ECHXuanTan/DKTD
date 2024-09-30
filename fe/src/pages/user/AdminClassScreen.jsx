import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, Link } from 'react-router-dom';
import { Circles } from 'react-loader-spinner';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { getUser } from '../../services/authServices';
import { getSubject } from '../../services/subjectServices';
import { getAssignmentsBySubject } from '../../services/assignmentServices';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  TextField,
  InputAdornment,
  Box
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import styles from '../../css/Admin/AdminClassScreen.module.css';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const AdminClassScreen = () => {
  const [user, setUser] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [classAssignments, setClassAssignments] = useState([]);
  const [filteredAssignments, setFilteredAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserAndSubjects = async () => {
      try {
        const userData = await getUser();
        setUser(userData);

        if (userData && userData.user) {
          if (!userData.user.isAdmin) {
            navigate('/dashboard');
            return;
          }
          const subjectData = await getSubject();
          setSubjects(subjectData);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user and subjects:', error);
        toast.error('Lỗi khi lấy dữ liệu người dùng và môn học');
        setLoading(false);
      }
    };
    fetchUserAndSubjects();
  }, [navigate]);

  useEffect(() => {
    const fetchAssignments = async () => {
      if (selectedSubject) {
        try {
          setLoading(true);
          const assignmentData = await getAssignmentsBySubject(selectedSubject);
          setClassAssignments(assignmentData);
          setFilteredAssignments(assignmentData);
        } catch (error) {
          console.error('Error fetching assignments:', error);
          toast.error('Lỗi khi lấy dữ liệu khai báo');
        } finally {
          setLoading(false);
        }
      }
    };
    fetchAssignments();
  }, [selectedSubject]);

  useEffect(() => {
    const filtered = classAssignments.filter(classData => 
      (selectedGrade ? classData.grade === parseInt(selectedGrade) : true) &&
      (searchTerm ? classData.className.toLowerCase().includes(searchTerm.toLowerCase()) : true)
    );
    setFilteredAssignments(filtered);
  }, [selectedGrade, searchTerm, classAssignments]);

  const handleSubjectChange = (e) => {
    setSelectedSubject(e.target.value);
    setSelectedGrade('');
    setSearchTerm('');
  };

  const handleGradeChange = (e) => {
    setSelectedGrade(e.target.value);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const calculateTotalCompletedLessons = (assignments) => {
    return assignments.reduce((total, assignment) => total + assignment.completedLessons, 0);
  };

  const calculateCompletionRate = (totalCompleted, lessonCount) => {
    return lessonCount > 0 ? ((totalCompleted / lessonCount) * 100).toFixed(2) : '0.00';
  };

  const LoadingSpinner = () => (
    <div className={styles.loadingContainer}>
      <Circles color="#00BFFF" height={80} width={80} />
    </div>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <Helmet>
        <title>Thống kê khai báo theo lớp</title>
      </Helmet>
      <Header />
      <ToastContainer />

      <div className={styles.container}>
        <Link to="/admin-dashboard" style={{ textDecoration: 'none', paddingBottom: '5px', fontSize: '20px' }}>
          <ArrowBackIcon />
        </Link>
        <h1 className={styles.title}>Thống kê khai báo theo lớp</h1>
        <Grid container spacing={2} className={styles.filterContainer}>
          <Grid item xs={12} md={7}>
            <Box display="flex">
              <FormControl className={styles.selectControl}>
                <InputLabel id="subject-select-label">Chọn môn học</InputLabel>
                <Select
                  labelId="subject-select-label"
                  value={selectedSubject}
                  onChange={handleSubjectChange}
                  label="Chọn môn học"
                >
                  <MenuItem value="">
                    <em>Chọn môn học</em>
                  </MenuItem>
                  {subjects.map((subject) => (
                    <MenuItem key={subject._id} value={subject._id}>{subject.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl className={styles.selectControl}>
                <InputLabel id="grade-select-label">Chọn khối</InputLabel>
                <Select
                  labelId="grade-select-label"
                  value={selectedGrade}
                  onChange={handleGradeChange}
                  label="Chọn khối"
                >
                  <MenuItem value="">
                    <em>Tất cả khối</em>
                  </MenuItem>
                  <MenuItem value="10">Khối 10</MenuItem>
                  <MenuItem value="11">Khối 11</MenuItem>
                  <MenuItem value="12">Khối 12</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Grid>
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              label="Tìm kiếm theo tên lớp"
              variant="outlined"
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>

        {filteredAssignments.length > 0 ? (
          <TableContainer component={Paper}>
            <Table className={styles.table}>
              <TableHead>
                <TableRow>
                  <TableCell style={{ width: '15%' }}>Lớp</TableCell>
                  <TableCell style={{ width: '10%' }}>Số tiết được phân công</TableCell>
                  <TableCell style={{ width: '10%' }}>Tổng số tiết khai báo</TableCell>
                  <TableCell style={{ width: '10%' }}>Tỉ lệ hoàn thành (%)</TableCell>
                  <TableCell style={{ width: '35%' }}>Giáo viên</TableCell>
                  <TableCell style={{ width: '20%' }}>Số tiết đã khai báo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAssignments.map((classData) => {
                  const totalCompletedLessons = calculateTotalCompletedLessons(classData.assignments);
                  const lessonCount = classData.subjects[0]?.lessonCount || 0;
                  const completionRate = calculateCompletionRate(totalCompletedLessons, lessonCount);

                  return (
                    <React.Fragment key={classData.classId}>
                      {classData.assignments.map((assignment, index) => (
                        <TableRow key={assignment._id}>
                          {index === 0 && (
                            <>
                              <TableCell rowSpan={classData.assignments.length} style={{ width: '15%' }}>
                                {classData.className}
                              </TableCell>
                              <TableCell rowSpan={classData.assignments.length} style={{ width: '10%' }}>
                                {lessonCount}
                              </TableCell>
                              <TableCell rowSpan={classData.assignments.length} style={{ width: '10%' }}>
                                {totalCompletedLessons}
                              </TableCell>
                              <TableCell rowSpan={classData.assignments.length} style={{ width: '10%' }}>
                                {completionRate}%
                              </TableCell>
                            </>
                          )}
                          <TableCell style={{ width: '35%' }}>{assignment.teacherName}</TableCell>
                          <TableCell style={{ width: '20%' }}>{assignment.completedLessons}</TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          selectedSubject && <p className={styles.noData}>Không có dữ liệu khai báo cho môn học này</p>
        )}
      </div>

      <Footer />
    </>
  );
};

export default AdminClassScreen;