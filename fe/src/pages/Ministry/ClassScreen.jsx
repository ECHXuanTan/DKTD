import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, Link } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { Circles } from 'react-loader-spinner';
import 'react-toastify/dist/ReactToastify.css';
import styles from '../../css/Ministry/Class.module.css';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import { getUser } from '../../services/authServices.js';
import { getClasses, updateSubjectLessonCount, deleteClass } from '../../services/classServices.js';
import { getSubject } from '../../services/subjectServices.js';
import { Box, Typography, TextField, Button, InputAdornment, Table, TableBody, TableCell, 
         TableContainer, TableHead, TableRow, Paper, Select, MenuItem, TableFooter, 
         TablePagination } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import useDebounce from '../../hooks/useDebounce'; 

// Lazy loaded components
const SingleClassModal = lazy(() => import('./Component/SingleClassModal.jsx'));
const MultiClassModal = lazy(() => import('./Component/MultiClassModal.jsx'));
const EditSubjectModal = lazy(() => import('./Component/EditSubjectModal.jsx'));
const DeleteClassModal = lazy(() => import('./Component/DeleteClassModal.jsx'));

const ClassScreen = () => {
  // State Management
  const [user, setUser] = useState(null);
  const [classData, setClassData] = useState({
    classes: [],
    page: 1,
    total: 0,
    totalPages: 0
  });
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [modalStates, setModalStates] = useState({
    singleClass: false,
    multiClass: false,
    editSubject: false,
    deleteClass: false
  });
  const [currentClass, setCurrentClass] = useState(null);
  const [currentSubject, setCurrentSubject] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const navigate = useNavigate();
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Data Fetching Functions
  const fetchClasses = async (page = classData.page, shouldSetLoading = true) => {
    try {
      if (shouldSetLoading) setLoading(true);
      const data = await getClasses(
        page,
        100, // Fixed limit of 100
        debouncedSearch,
        gradeFilter,
        subjectFilter
      );
      setClassData(data);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Đã xảy ra lỗi khi tải dữ liệu lớp học');
    } finally {
      if (shouldSetLoading) setLoading(false);
    }
  };

  // Initial Data Load
  useEffect(() => {
    const initializeData = async () => {
      try {
        const userData = await getUser();
        setUser(userData);
        
        if (userData) {
          if (userData.user.role !== 1) {
            const roleRedirects = {
              2: '/admin-dashboard',
              0: '/user-dashboard'
            };
            navigate(roleRedirects[userData.user.role] || '/login');
            return;
          }
          
          const [classesData, subjectsData] = await Promise.all([
            getClasses(1, 100),
            getSubject()
          ]);
          
          setClassData(classesData);
          setSubjects(subjectsData);
        }
      } catch (error) {
        console.error('Error in initialization:', error);
        toast.error('Đã xảy ra lỗi khi khởi tạo dữ liệu');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [navigate]);

  // Handle Search and Filters
  useEffect(() => {
    fetchClasses(1, false);
  }, [debouncedSearch, gradeFilter, subjectFilter]);

  // Periodic Refresh
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchClasses(classData.page, false);
  }, [refreshTrigger]);

  // Event Handlers
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleFilterChange = (type, value) => {
    if (type === 'grade') setGradeFilter(value);
    if (type === 'subject') setSubjectFilter(value);
    setClassData(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (event, newPage) => {
    fetchClasses(newPage + 1);
  };

  const handleRowsPerPageChange = (event) => {
    const newLimit = parseInt(event.target.value, 10);
    setClassData(prev => ({
      ...prev,
      limit: newLimit,
      page: 1
    }));
    fetchClasses(1);
  };

  // Modal Handlers
  const handleModalToggle = (modalName, value, classItem = null, subject = null) => {
    setModalStates(prev => ({ ...prev, [modalName]: value }));
    if (classItem) setCurrentClass(classItem);
    if (subject) setCurrentSubject(subject);
  };

  // CRUD Operations
  const handleClassAdded = () => {
    fetchClasses(1);
    toast.success('Danh sách lớp đã được cập nhật');
  };

  const handleUpdateSubject = async (updatedData) => {
    try {
      await updateSubjectLessonCount(
        currentClass._id,
        currentSubject.subject._id,
        updatedData.periodsPerWeek,
        updatedData.numberOfWeeks
      );
      await fetchClasses(classData.page);
      handleModalToggle('editSubject', false);
      toast.success('Cập nhật môn học thành công');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cập nhật môn học thất bại');
    }
  };

  const handleDeleteClassConfirm = async () => {
    try {
      await deleteClass(currentClass._id);
      await fetchClasses(classData.page);
      handleModalToggle('deleteClass', false);
      toast.success('Xóa lớp học thành công');
    } catch (err) {
      const errorMessages = {
        'Không thể xóa lớp học đã có môn được phân công giảng dạy': true,
        'Không thể xóa lớp học đang có giáo viên chủ nhiệm': true
      };
      toast.error(errorMessages[err.response?.data?.message] ? 
        err.response.data.message : 'Xóa lớp học thất bại');
    }
  };

  // Data Processing for Table
  const rows = classData.classes.flatMap((classItem, classIndex) => {
    return classItem.subjects.map((subject, subjectIndex) => ({
      id: `${classItem._id}-${subject.subject._id}`,
      index: subjectIndex === 0 ? ((classData.page - 1) * classData.limit + classIndex + 1) : null,
      name: subjectIndex === 0 ? classItem.name : null,
      subjects: subject.subject.name,
      size: subjectIndex === 0 ? classItem.size : null,
      campus: subjectIndex === 0 ? classItem.campus : null,
      periodsPerWeek: subject.subject.name === "CCSHL" ? 4 : (subject.periodsPerWeek || '-'),
      numberOfWeeks: subject.subject.name === "CCSHL" ? 18 : (subject.numberOfWeeks || '-'),
      lessonCount: subject.lessonCount,
      homeroomTeacher: subjectIndex === 0 ? (classItem.homeroomTeacher || '-') : null,
      updatedAt: subjectIndex === 0 ? new Date(classItem.updatedAt).toLocaleString() : null,
      classActions: subjectIndex === 0 ? (
        <div className={styles.actionButtons}>
          {subject.subject.name !== "CCSHL" && (
            <Button onClick={() => handleModalToggle('editSubject', true, classItem, subject)}>
              <EditIcon /> Sửa môn
            </Button>
          )}
          <Button onClick={() => handleModalToggle('deleteClass', true, classItem)}>
            <DeleteForeverIcon style={{color: 'red'}} /> Xóa lớp
          </Button>
        </div>
      ) : null,
      isFirstRow: subjectIndex === 0,
      rowSpan: classItem.subjects.length,
    }));
  });

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
        <title>Trang khai báo lớp học</title>
      </Helmet>
      <Header />
      <ToastContainer style={{ zIndex: 9999999 }}/>
      <div className={styles.classDashboardMinistry}>
        <Box m="20px">
          <Link to="/ministry-declare" className={styles.backLink}>
            <ArrowBackIcon />
          </Link>
          
          <Typography variant="h4" mb={2} className={styles.sectionTitle}>
            Danh sách lớp học
          </Typography>
          
          <Box mb={2}>
            <Typography>Tổng số lớp: {classData.total}</Typography>
          </Box>

          {/* Filters Section */}
          <Box display="flex" justifyContent="space-between" mb={3}>
            <Box display="grid" gridTemplateColumns="1fr 1fr 1fr">
              <TextField
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Tìm kiếm theo tên lớp"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                className={styles.inputField}
              />
              
              <Select
                value={gradeFilter}
                onChange={(e) => handleFilterChange('grade', e.target.value)}
                displayEmpty
                className={styles.selectField}
              >
                <MenuItem value="">Tất cả khối</MenuItem>
                {[10, 11, 12].map((grade) => (
                  <MenuItem key={grade} value={grade}>Khối {grade}</MenuItem>
                ))}
              </Select>
              
              <Select
                value={subjectFilter}
                onChange={(e) => handleFilterChange('subject', e.target.value)}
                displayEmpty
                className={styles.selectField}
              >
                <MenuItem value="">Tất cả môn học</MenuItem>
                {subjects
                  .filter(subject => !["PHT", "HT", "HTQT", "VP", "GVĐT"].includes(subject.name))
                  .map((subject) => (
                    <MenuItem key={subject._id} value={subject._id}>
                      {subject.name}
                    </MenuItem>
                  ))}
              </Select>
            </Box>

            {/* Action Buttons */}
            <Box display="grid" gridTemplateColumns="repeat(2, auto)" gap="20px">
              <Button 
                variant="contained" 
                onClick={() => handleModalToggle('singleClass', true)}
                className={styles.button}
                style={{background: 'rgb(83 168 183)'}}
              >
                Tạo 1 lớp
              </Button>
              <Button 
                variant="contained" 
                onClick={() => handleModalToggle('multiClass', true)}
                className={styles.button}
                style={{background: 'rgb(36, 82, 122)'}}
              >
                Tạo nhiều lớp
              </Button>
            </Box>
          </Box>

          {/* Table Section */}
          <div className={styles.tableWrapper}>
            <TableContainer component={Paper} className={styles.tableContainer}>
              <Table stickyHeader className={styles.table}>
                <TableHead>
                  <TableRow>
                    <TableCell className={styles.stickyColumn}>STT</TableCell>
                    <TableCell className={styles.stickyColumn}>Mã lớp</TableCell>
                    <TableCell>Môn học</TableCell>
                    <TableCell align="center">Sĩ số</TableCell>
                    <TableCell>Cơ sở</TableCell>
                    <TableCell>Số tiết 1 tuần</TableCell>
                    <TableCell>Số tuần</TableCell>
                    <TableCell>Số tiết</TableCell>
                    <TableCell>Giáo viên chủ nhiệm</TableCell>
                    <TableCell>Lần điều chỉnh gần nhất</TableCell>
                    <TableCell>Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.isFirstRow && (
                        <>
                          <TableCell className={styles.stickyColumn} rowSpan={row.rowSpan}>{row.index}</TableCell>
                          <TableCell className={styles.stickyColumn} rowSpan={row.rowSpan}>{row.name}</TableCell>
                        </>
                      )}
                      <TableCell>{row.subjects}</TableCell>
                      {row.isFirstRow && (
                        <>
                          <TableCell align="center" rowSpan={row.rowSpan}>{row.size}</TableCell>
                          <TableCell rowSpan={row.rowSpan}>{row.campus}</TableCell>
                        </>
                      )}
                      <TableCell>{row.periodsPerWeek}</TableCell>
                      <TableCell>{row.numberOfWeeks}</TableCell>
                      <TableCell>{row.lessonCount}</TableCell>
                      {row.isFirstRow && (
                        <>
                          <TableCell rowSpan={row.rowSpan}>{row.homeroomTeacher}</TableCell>
                          <TableCell rowSpan={row.rowSpan}>{row.updatedAt}</TableCell>
                          <TableCell rowSpan={row.rowSpan}>{row.classActions}</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Pagination */}
            <TablePagination
                component="div"
                count={classData.total}
                page={classData.page - 1}
                onPageChange={handlePageChange}
                rowsPerPage={100}
                rowsPerPageOptions={[]} // Empty array removes the rows per page selector
                labelDisplayedRows={({ from, to, count }) => 
                    `${from}-${to} của ${count}`}
                className={styles.pagination}
            />
          </div>
        </Box>
      </div>
      <Footer />

      {/* Modals */}
      <Suspense fallback={
        <div className={styles.loadingContainer}>
          <Circles type="TailSpin" color="#00BFFF" height={80} width={80} />
        </div>
      }>
        <SingleClassModal
          isOpen={modalStates.singleClass}
          onClose={() => handleModalToggle('singleClass', false)}
          onClassAdded={handleClassAdded}
          subjects={subjects}
        />

        <MultiClassModal
          isOpen={modalStates.multiClass}
          onClose={() => handleModalToggle('multiClass', false)}
          onClassesAdded={handleClassAdded}
        />

        <EditSubjectModal
          isOpen={modalStates.editSubject}
          onClose={() => handleModalToggle('editSubject', false)}
          onUpdateSubject={handleUpdateSubject}
          subject={currentSubject}
        />

        <DeleteClassModal
          isOpen={modalStates.deleteClass}
          onClose={() => handleModalToggle('deleteClass', false)}
          onDeleteClass={handleDeleteClassConfirm}
          classItem={currentClass}
        />
      </Suspense>
    </>
  );
};

export default ClassScreen;