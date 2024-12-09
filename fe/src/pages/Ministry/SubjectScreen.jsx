import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, Link } from 'react-router-dom';
import Modal from 'react-modal';
import { Circles } from 'react-loader-spinner';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from '../../css/Ministry/SubjectScreen.module.css'; 
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import { getSubject, createSubject, updateSubject, deleteSubject } from '../../services/subjectServices.js';
import { getAllDepartment } from '../../services/departmentService.js';
import { 
   Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
   TableHead, TableRow, IconButton, FormControl, InputLabel, Select, 
   MenuItem, TextField, Button, TablePagination 
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon } from '@mui/icons-material';
import InputAdornment from '@mui/material/InputAdornment';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

Modal.setAppElement('#root');

const HIDDEN_SUBJECTS = ['PHT', 'HT', 'HTQT', 'GVĐT'];

const SubjectScreen = () => {
   const [subjects, setSubjects] = useState([]);
   const [filteredSubjects, setFilteredSubjects] = useState([]);
   const [departments, setDepartments] = useState([]);
   const [errorMessage, setErrorMessage] = useState('');
   const [showModal, setShowModal] = useState(false);
   const [showConfirmModal, setShowConfirmModal] = useState(false);
   const [loading, setLoading] = useState(true);
   const [isEditMode, setIsEditMode] = useState(false);
   const [showSubjectModal, setShowSubjectModal] = useState(false);
   const [selectedSubject, setSelectedSubject] = useState(null);
   const [selectedDepartment, setSelectedDepartment] = useState('all');
   const [searchTerm, setSearchTerm] = useState('');
   const [page, setPage] = useState(0);
   const [rowsPerPage, setRowsPerPage] = useState(10);
   const [subjectForm, setSubjectForm] = useState({
       name: '',
       department: '',
       isSpecialized: false
   });

   const navigate = useNavigate();

   useEffect(() => {
       const fetchData = async () => {
           try {
               const [subjectsData, departmentsData] = await Promise.all([
                   getSubject(),
                   getAllDepartment()
               ]);
               const filteredSubjectsData = subjectsData.filter(
                   subject => !HIDDEN_SUBJECTS.includes(subject.name)
               );
               setSubjects(filteredSubjectsData);
               setFilteredSubjects(filteredSubjectsData);
               const filteredDepartments = departmentsData.filter(
                   dept => dept.name !== "Tổ GVĐT"
               );
               setDepartments(filteredDepartments);
               setLoading(false);
           } catch (error) {
               console.error('Error fetching data:', error);
               setErrorMessage(error.message);
               setShowModal(true);
               setLoading(false);
           }
       };

       fetchData();
   }, []);

   useEffect(() => {
       let result = subjects;
       
       if (selectedDepartment !== 'all') {
           result = result.filter(subject => subject.department._id === selectedDepartment);
       }
       
       if (searchTerm) {
           result = result.filter(subject => 
               subject.name.toLowerCase().includes(searchTerm.toLowerCase())
           );
       }
       
       setFilteredSubjects(result);
       setPage(0);
   }, [selectedDepartment, searchTerm, subjects]);

   const handleChangeDepartment = (event) => {
       setSelectedDepartment(event.target.value);
   };

   const handleSearchChange = (event) => {
       setSearchTerm(event.target.value);
   };

   const handleChangePage = (event, newPage) => {
       setPage(newPage);
   };

   const handleChangeRowsPerPage = (event) => {
       setRowsPerPage(parseInt(event.target.value, 10));
       setPage(0);
   };

   const handleOpenSubjectModal = (subject = null) => {
       if (subject) {
           setIsEditMode(true);
           setSelectedSubject(subject);
           setSubjectForm({
               name: subject.name,
               department: subject.department._id,
               isSpecialized: subject.isSpecialized
           });
       } else {
           setIsEditMode(false);
           setSelectedSubject(null);
           setSubjectForm({
               name: '',
               department: '',
               isSpecialized: false
           });
       }
       setShowSubjectModal(true);
   };

   const handleCloseSubjectModal = () => {
       setShowSubjectModal(false);
       setSubjectForm({
           name: '',
           department: '',
           isSpecialized: false
       });
       setSelectedSubject(null);
   };

   const handleOpenConfirmModal = (subject) => {
       setSelectedSubject(subject);
       setShowConfirmModal(true);
   };

   const handleSubmitSubject = async (e) => {
       e.preventDefault();
       try {
           if (isEditMode && selectedSubject) {
               await updateSubject(selectedSubject._id, subjectForm);
               toast.success('Cập nhật môn học thành công!');
           } else {
               await createSubject(subjectForm);
               toast.success('Thêm môn học thành công!');
           }
           const updatedSubjects = await getSubject();
           const filteredSubjectsData = updatedSubjects.filter(
               subject => !HIDDEN_SUBJECTS.includes(subject.name)
           );
           setSubjects(filteredSubjectsData);
           handleCloseSubjectModal();
       } catch (error) {
           toast.error(error.message || 'Có lỗi xảy ra');
       }
   };

   const handleDeleteSubject = async () => {
       try {
           await deleteSubject(selectedSubject._id);
           toast.success('Xóa môn học thành công!');
           const updatedSubjects = await getSubject();
           const filteredSubjectsData = updatedSubjects.filter(
               subject => !HIDDEN_SUBJECTS.includes(subject.name)
           );
           setSubjects(filteredSubjectsData);
           setShowConfirmModal(false);
       } catch (error) {
           toast.error(error.message || 'Có lỗi xảy ra khi xóa môn học');
       }
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
               <title>Danh sách môn học</title>
           </Helmet>
           <Header />
           <ToastContainer />
           <div className={styles.containerWrapper}>
               <div className={styles.container}>
                    <Link to="/ministry-declare" className={styles.backLink}>
                        <ArrowBackIcon />
                    </Link>
                   <div className={styles.titleContainer}>
                       <Typography variant="h4" className={styles.pageTitle}>
                           Danh sách môn học
                       </Typography>
                       <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                           <TextField
                               size="small"
                               placeholder="Tìm kiếm môn học..."
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
                           <FormControl sx={{ minWidth: 200 }} size="small">
                               <InputLabel>Lọc theo tổ</InputLabel>
                               <Select
                                   value={selectedDepartment}
                                   onChange={handleChangeDepartment}
                                   label="Lọc theo tổ"
                               >
                                   <MenuItem value="all">Tất cả</MenuItem>
                                   {departments.map((dept) => (
                                       <MenuItem key={dept._id} value={dept._id}>
                                           {dept.name}
                                       </MenuItem>
                                   ))}
                               </Select>
                           </FormControl>
                           <Button
                               variant="contained"
                               color="primary"
                               startIcon={<AddIcon />}
                               onClick={() => handleOpenSubjectModal()}
                           >
                               Thêm môn học
                           </Button>
                       </Box>
                   </div>

                   <TableContainer className={styles.tableContainer}>
                       <Table stickyHeader className={styles.table}>
                           <TableHead>
                               <TableRow>
                                   <TableCell className={styles.tableHeader}>STT</TableCell>
                                   <TableCell className={styles.tableHeader}>Tên môn học</TableCell>
                                   <TableCell className={styles.tableHeader}>Tổ bộ môn</TableCell>
                                   <TableCell className={`${styles.tableHeader} ${styles.centerAlign}`}>Hình thức</TableCell>
                                   <TableCell className={styles.tableHeader}>Thao tác</TableCell>
                               </TableRow>
                           </TableHead>
                           <TableBody>
                               {filteredSubjects
                                   .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                   .map((subject, index) => (
                                   <TableRow key={subject._id} className={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                                       <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                                       <TableCell>{subject.name}</TableCell>
                                       <TableCell>{subject.department.name}</TableCell>
                                       <TableCell className={styles.centerAlign}>
                                           {subject.isSpecialized ? "Chuyên" : "Không chuyên"}
                                       </TableCell>
                                       <TableCell>
                                           <IconButton onClick={() => handleOpenSubjectModal(subject)} color="primary">
                                               <EditIcon />
                                           </IconButton>
                                           <IconButton onClick={() => handleOpenConfirmModal(subject)} color="error">
                                               <DeleteIcon />
                                           </IconButton>
                                       </TableCell>
                                   </TableRow>
                               ))}
                           </TableBody>
                       </Table>
                   </TableContainer>
                   
                   <TablePagination
                       rowsPerPageOptions={[5, 10, 25]}
                       component="div"
                       count={filteredSubjects.length}
                       rowsPerPage={rowsPerPage}
                       page={page}
                       onPageChange={handleChangePage}
                       onRowsPerPageChange={handleChangeRowsPerPage}
                       labelRowsPerPage="Số dòng trên trang:"
                       labelDisplayedRows={({ from, to, count }) => `${from}-${to} của ${count}`}
                   />
               </div>

               <Modal
                   isOpen={showSubjectModal}
                   onRequestClose={handleCloseSubjectModal}
                   className={styles.modal}
                   overlayClassName={styles.modalOverlay}
               >
                   <h2>{isEditMode ? 'Chỉnh sửa môn học' : 'Thêm môn học mới'}</h2>
                   <form onSubmit={handleSubmitSubject}>
                       <TextField
                           label="Tên môn học"
                           fullWidth
                           margin="normal"
                           value={subjectForm.name}
                           onChange={(e) => setSubjectForm({...subjectForm, name: e.target.value})}
                           required
                       />
                       <FormControl fullWidth margin="normal">
                           <InputLabel>Tổ bộ môn</InputLabel>
                           <Select
                               value={subjectForm.department}
                               onChange={(e) => setSubjectForm({...subjectForm, department: e.target.value})}
                               required
                           >
                               {departments.map((dept) => (
                                   <MenuItem key={dept._id} value={dept._id}>
                                       {dept.name}
                                   </MenuItem>
                               ))}
                           </Select>
                       </FormControl>
                       <FormControl fullWidth margin="normal">
                           <InputLabel>Hình thức</InputLabel>
                           <Select
                               value={subjectForm.isSpecialized}
                               onChange={(e) => setSubjectForm({...subjectForm, isSpecialized: e.target.value})}
                           >
                               <MenuItem value={false}>Không chuyên</MenuItem>
                               <MenuItem value={true}>Chuyên</MenuItem>
                           </Select>
                       </FormControl>
                       <Box mt={2} display="flex" justifyContent="flex-end" gap={1}>
                           <Button type="button" onClick={handleCloseSubjectModal}>
                               Hủy
                           </Button>
                           <Button type="submit" variant="contained" color="primary">
                               {isEditMode ? 'Cập nhật' : 'Thêm mới'}
                           </Button>
                       </Box>
                   </form>
               </Modal>

               <Modal
                   isOpen={showConfirmModal}
                   onRequestClose={() => setShowConfirmModal(false)}
                   className={styles.modal}
                   overlayClassName={styles.modalOverlay}
               >
                   <h2>Xác nhận xóa</h2>
                   <p>Bạn có chắc chắn muốn xóa môn học "{selectedSubject?.name}"?</p>
                   <Box mt={2} display="flex" justifyContent="flex-end" gap={1}>
                       <Button onClick={() => setShowConfirmModal(false)}>
                           Hủy
                       </Button>
                       <Button onClick={handleDeleteSubject} variant="contained" color="error">
                           Xóa
                       </Button>
                   </Box>
               </Modal>

               <Modal
                   isOpen={showModal}
                   onRequestClose={() => setShowModal(false)}
                   contentLabel="Error Message"
                   className={styles.modal}
                   overlayClassName={styles.modalOverlay}
               >
                   <h2>Thông báo</h2>
                   <p>{errorMessage}</p>
                   <button onClick={() => setShowModal(false)}>Đóng</button>
               </Modal>
           </div>
           <Footer />
       </>
   );
};

export default SubjectScreen;