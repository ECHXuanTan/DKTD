import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, Link } from 'react-router-dom';
import { Circles } from 'react-loader-spinner';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import { getUser } from '../../services/authServices.js';
import { getAllClasses } from '../../services/statisticsServices';
import { getSubject } from '../../services/subjectServices.js';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Box, Typography, TextField, Select, MenuItem, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import styles from '../../css/Ministry/MinistryClassStatistics.module.css';
import ExportTeachersClassExcel from './Component/Statistics/ExportTeachersClassExcel.jsx';

const MinistryClassStatistics = () => { 
   const [user, setUser] = useState(null);
   const [classes, setClasses] = useState([]);
   const [subjects, setSubjects] = useState([]);
   const [loading, setLoading] = useState(true);
   const [searchQuery, setSearchQuery] = useState('');
   const [gradeFilter, setGradeFilter] = useState('');
   const [subjectFilter, setSubjectFilter] = useState('');
   const [page, setPage] = useState(0);
   const [rowsPerPage, setRowsPerPage] = useState(25);
   const navigate = useNavigate();

   useEffect(() => {
       const fetchUserAndData = async () => {
         try {
           console.log('1. Starting to fetch user data');
           const token = localStorage.getItem('userToken');
           console.log('2. User token:', token ? 'Exists' : 'Missing');
           
           const userData = await getUser();
           console.log('3. User data received:', userData);
           setUser(userData);
           
           if (userData) {
               console.log('4. Checking user role:', userData.user.role);
               if (!userData || userData.user.role !== 1) {
                   console.log('5. Invalid role, redirecting');
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

               console.log('6. Starting to fetch classes');
               const classesData = await getAllClasses();
               console.log('7. Classes data:', classesData);
               if (Array.isArray(classesData) && classesData.length > 0) {
                   const sortedClasses = classesData.sort((a, b) => a.name.localeCompare(b.name));
                   setClasses(sortedClasses);
               } else {
                   console.error('Invalid classes data:', classesData);
                   toast.error('Định dạng dữ liệu lớp học không hợp lệ. Vui lòng thử lại sau.');
               }

               console.log('8. Starting to fetch subjects');
               const subjectsData = await getSubject(); 
               console.log('9. Subjects data:', subjectsData);
               const filteredSubjects = subjectsData.filter(subject => 
                   !['VP', 'HT', 'PHT', 'GVĐT', 'HTQT'].includes(subject.name)
               );
               setSubjects(filteredSubjects);
           }
         } catch (error) {
           console.error('Error in fetchUserAndData:', error);
           console.error('Error details:', {
             message: error.message,
             status: error.response?.status,
             data: error.response?.data
           });
           toast.error('Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.');
         } finally {
           setLoading(false);
         }
       };
   
       fetchUserAndData();
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

   const filteredClasses = classes.filter((classItem) => {
       const nameMatch = classItem.name.toLowerCase().includes(searchQuery.toLowerCase());
       const gradeMatch = gradeFilter === '' || classItem.grade === parseInt(gradeFilter);
       const subjectMatch = subjectFilter === '' || classItem.subjects.some(
           subject => subject.subject.name === subjectFilter
       );
       return nameMatch && gradeMatch && subjectMatch;
   });    

   const paginatedClasses = filteredClasses.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

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
                           {subjects.map((subject) => (
                               <MenuItem key={subject._id} value={subject.name}>
                                   {subject.name}
                               </MenuItem>
                           ))}
                       </Select>
                       <ExportTeachersClassExcel />
                   </Box>
               </Box>
               <div className={styles.tableWrapper}>
                   <TableContainer component={Paper} className={styles.tableContainer}>
                       <Table stickyHeader className={styles.table}>
                           <TableHead>
                               <TableRow>
                                   <TableCell>STT</TableCell>
                                   <TableCell>Tên lớp</TableCell>
                                   <TableCell>Khối</TableCell>
                                   <TableCell>Môn học</TableCell>
                                   <TableCell>Số tiết</TableCell>
                                   <TableCell>Giáo viên</TableCell>
                                   <TableCell>Số tiết khai báo</TableCell>
                               </TableRow>
                           </TableHead>
                           <TableBody>
                               {paginatedClasses.flatMap((classItem, index) => {
                                   const rowSpan = classItem.subjects?.reduce((sum, subject) => 
                                       sum + ((subject.assignments?.length || 0) || 1), 0) || 1;
                                   return (classItem.subjects || []).flatMap((subject, subjectIndex) => {
                                       const subjectRowSpan = subject.assignments?.length || 1;
                                       return (subject.assignments?.length > 0 ? (
                                           (subject.assignments || []).map((assignment, assignmentIndex) => (
                                               <TableRow key={`${classItem._id}-${subject.name}-${assignmentIndex}`}>
                                                   {subjectIndex === 0 && assignmentIndex === 0 && (
                                                       <>
                                                           <TableCell rowSpan={rowSpan}>{page * rowsPerPage + index + 1}</TableCell>
                                                           <TableCell rowSpan={rowSpan}>{classItem.name}</TableCell>
                                                           <TableCell rowSpan={rowSpan}>{classItem.grade}</TableCell>
                                                       </>
                                                   )}
                                                   {assignmentIndex === 0 && (
                                                       <>
                                                           <TableCell rowSpan={subjectRowSpan}>{subject.subject.name}</TableCell>
                                                           <TableCell rowSpan={subjectRowSpan}>{subject.lessonCount}</TableCell>
                                                       </>
                                                   )}
                                                   <TableCell>
                                                       {subject.subject.name === 'CCSHL'
                                                           ? classItem.homeroomTeacher || 'Chưa phân công'
                                                           : assignment.teacherName}
                                                   </TableCell>
                                                   <TableCell>
                                                       {subject.subject.name === 'CCSHL' ? '-' : assignment.completedLessons}
                                                   </TableCell>
                                               </TableRow>
                                           ))
                                       ) : (
                                           <TableRow key={`${classItem._id}-${subject.name}`}>
                                               {subjectIndex === 0 && (
                                                   <>
                                                       <TableCell rowSpan={rowSpan}>{page * rowsPerPage + index + 1}</TableCell>
                                                       <TableCell rowSpan={rowSpan}>{classItem.name}</TableCell>
                                                       <TableCell rowSpan={rowSpan}>{classItem.grade}</TableCell>
                                                   </>
                                               )}
                                               <TableCell>{subject.subject.name}</TableCell>
                                               <TableCell>{subject.lessonCount}</TableCell>
                                               <TableCell>
                                                   {subject.subject.name === 'CCSHL'
                                                       ? classItem.homeroomTeacher || 'Chưa phân công'
                                                       : 'Chưa phân công'}
                                               </TableCell>
                                               <TableCell>
                                                   {subject.subject.name === 'CCSHL' ? '-' : '0'}
                                               </TableCell>
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

export default MinistryClassStatistics;