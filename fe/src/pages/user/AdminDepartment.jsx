import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Circles } from 'react-loader-spinner';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { getDepartmentTeachersById } from '../../services/statisticsServices';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Box, Typography, TextField, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FilterButton from '../Leader/Component/FilterButton';
import styles from '../../css/Admin/AdminDepartment.module.css';

const AdminDepartment = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const { departmentId } = useParams();

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setLoading(true);
        const teachersData = await getDepartmentTeachersById(departmentId);
        if (Array.isArray(teachersData) && teachersData.length > 0) {
          setTeachers(teachersData);
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

    if (departmentId) {
      fetchTeachers();
    }
  }, [departmentId]);

  const handleSearchChange = useCallback((event) => {
    setSearchQuery(event.target.value);
  }, []);

  const filterTeachers = useCallback((teachers, type) => {
    if (type === 'all') return teachers;
    return teachers.filter(teacher => {
      const completionRate = (teacher.declaredTeachingLessons / teacher.finalBasicTeachingLessons) * 100;
      if (type === 'below') {
        return teacher.declaredTeachingLessons < teacher.finalBasicTeachingLessons;
      }
      if (type === 'above') {
        return completionRate > 125;
      }
      return true;
    });
  }, []);

  const calculateCompletionPercentage = (declaredTeachingLessons, finalBasicTeachingLessons) => {
    if (finalBasicTeachingLessons === 0) return 0;
    const percentage = (declaredTeachingLessons / finalBasicTeachingLessons) * 100;
    return Math.min(percentage, 100).toFixed(2);
  };

  const calculateExcessLessons = (declaredTeachingLessons, finalBasicTeachingLessons) => {
    return Math.max(0, declaredTeachingLessons - finalBasicTeachingLessons);
  };

  const filteredTeachers = useMemo(() => 
    filterTeachers(
      teachers.filter((teacher) =>
        teacher.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
      filterType
    ),
    [teachers, searchQuery, filterType, filterTeachers]
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
              <Box display="flex" gap="20px" mb={4}>
                <TextField
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Tìm kiếm theo tên giáo viên"
                  style={{ width: '30%' }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <FilterButton onFilter={setFilterType} />
              </Box>
              <TableContainer component={Paper} className={styles.tableContainer}>
                <Table className={styles.table}>
                  <TableHead>
                    <TableRow>
                      <TableCell className={`${styles.tableHeader} ${styles.stickyColumn} ${styles.stickyHeader} ${styles.firstColumn} ${styles.headerFirstColumn}`}>STT</TableCell>
                      <TableCell className={`${styles.tableHeader} ${styles.stickyColumn} ${styles.stickyHeader} ${styles.secondColumn} ${styles.headerSecondColumn}`}>Tên giáo viên</TableCell>
                      <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Bộ môn</TableCell>
                      <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Hình thức GV</TableCell>
                      <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết chuẩn</TableCell>
                      <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết giảm trừ</TableCell>
                      <TableCell className={`${styles.tableHeader} ${styles.mediumWidth}`}>Nội dung giảm</TableCell>
                      <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết chuẩn sau khi giảm trừ</TableCell>
                      <TableCell className={`${styles.tableHeader} ${styles.fixedWidth2}`}>Tổng số tiết được phân công</TableCell>
                      <TableCell className={`${styles.tableHeader} ${styles.fixedWidth2}`}>Số tiết hoàn thành nhiệm vụ (Tiết chuẩn x3)</TableCell>
                      <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Tỉ lệ hoàn thành</TableCell>
                      <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết dư</TableCell>
                      <TableCell className={`${styles.tableHeader} ${styles.mediumWidth}`}>Mã lớp</TableCell>
                      <TableCell className={`${styles.tableHeader} ${styles.mediumWidth}`}>Môn học</TableCell>
                      <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết khai báo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTeachers.map((teacher, index) => {
                      const isThinhGiang = teacher.type === "Thỉnh giảng";
                      if (teacher.teachingDetails && teacher.teachingDetails.length > 0) {
                        return teacher.teachingDetails.map((detail, detailIndex) => (
                          <TableRow key={`${teacher._id}-${detailIndex}`} className={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                            {detailIndex === 0 && (
                              <>
                                <TableCell rowSpan={teacher.teachingDetails.length} className={`${styles.stickyColumn} ${styles.firstColumn}`}>{index + 1}</TableCell>
                                <TableCell rowSpan={teacher.teachingDetails.length} className={`${styles.stickyColumn} ${styles.secondColumn}`}>{teacher.name}</TableCell>
                                <TableCell rowSpan={teacher.teachingDetails.length} style={{textAlign: 'center'}}>{teacher.teachingSubjects}</TableCell>
                                <TableCell rowSpan={teacher.teachingDetails.length} style={{textAlign: 'center'}}>{teacher.type}</TableCell>
                                <TableCell rowSpan={teacher.teachingDetails.length} style={{textAlign: 'center'}}>{isThinhGiang ? '-' : teacher.basicTeachingLessons}</TableCell>
                                <TableCell rowSpan={teacher.teachingDetails.length} style={{textAlign: 'center'}}>{isThinhGiang ? '-' : teacher.totalReducedLessons}</TableCell>
                                <TableCell rowSpan={teacher.teachingDetails.length} className={styles.reductionCell}>
                                  {!isThinhGiang && teacher.reductions && teacher.reductions.map((reduction, rIndex) => (
                                    <div key={rIndex} className={styles.reductionRow}>
                                      {reduction.reductionReason}: {reduction.reducedLessons}
                                    </div>
                                  ))}
                                  {!isThinhGiang && teacher.homeroomInfo?.reductionReason && (
                                    <div className={styles.reductionRow}>
                                      {teacher.homeroomInfo.reductionReason}: {teacher.homeroomInfo.totalReducedLessons}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell rowSpan={teacher.teachingDetails.length} style={{textAlign: 'center'}}>{isThinhGiang ? '-' : teacher.finalBasicTeachingLessons}</TableCell>
                                <TableCell rowSpan={teacher.teachingDetails.length} style={{textAlign: 'center'}}>{teacher.totalAssignment || "Chưa khai báo"}</TableCell>
                                <TableCell rowSpan={teacher.teachingDetails.length} style={{textAlign: 'center'}}>{isThinhGiang ? '-' : (teacher.declaredTeachingLessons || "Chưa khai báo")}</TableCell>
                                <TableCell rowSpan={teacher.teachingDetails.length} style={{textAlign: 'center'}}>{isThinhGiang ? '-' : `${calculateCompletionPercentage(teacher.declaredTeachingLessons, teacher.finalBasicTeachingLessons)}%`}</TableCell>
                                <TableCell rowSpan={teacher.teachingDetails.length} style={{textAlign: 'center'}}>{isThinhGiang ? '-' : calculateExcessLessons(teacher.declaredTeachingLessons, teacher.finalBasicTeachingLessons)}</TableCell>
                              </>
                            )}
                            <TableCell>{detail.className}</TableCell>
                            <TableCell>{detail.subject}</TableCell>
                            <TableCell style={{textAlign: 'center'}}>{detail.completedLessons}</TableCell>
                          </TableRow>
                        ));
                      } else {
                        return (
                          <TableRow key={teacher._id} className={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                            <TableCell className={`${styles.stickyColumn} ${styles.firstColumn}`}>{index + 1}</TableCell>
                            <TableCell className={`${styles.stickyColumn} ${styles.secondColumn}`}>{teacher.name}</TableCell>
                            <TableCell style={{textAlign: 'center'}}>{teacher.teachingSubjects}</TableCell>
                            <TableCell style={{textAlign: 'center'}}>{teacher.type}</TableCell>
                            <TableCell style={{textAlign: 'center'}}>{isThinhGiang ? '-' : teacher.basicTeachingLessons}</TableCell>
                            <TableCell style={{textAlign: 'center'}}>{isThinhGiang ? '-' : teacher.totalReducedLessons}</TableCell>
                            <TableCell className={styles.reductionCell}>
                              {!isThinhGiang && teacher.reductions && teacher.reductions.map((reduction, rIndex) => (
                                <div key={rIndex} className={styles.reductionRow}>
                                  {reduction.reductionReason}: {reduction.reducedLessons}
                                </div>
                              ))}
                              {!isThinhGiang && teacher.homeroomInfo?.reductionReason && (
                                <div className={styles.reductionRow}>
                                  {teacher.homeroomInfo.reductionReason}: {teacher.homeroomInfo.totalReducedLessons}
                                </div>
                              )}
                            </TableCell>
                            <TableCell style={{textAlign: 'center'}}>{isThinhGiang ? '-' : teacher.finalBasicTeachingLessons}</TableCell>
                            <TableCell style={{textAlign: 'center'}}>Chưa khai báo</TableCell>
                            <TableCell style={{textAlign: 'center'}}>{isThinhGiang ? '-' : "Chưa khai báo"}</TableCell>
                            <TableCell style={{textAlign: 'center'}}>{isThinhGiang ? '-' : "0%"}</TableCell>
                            <TableCell style={{textAlign: 'center'}}>{isThinhGiang ? '-' : "0"}</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>-</TableCell>
                          </TableRow>
                        );
                      }
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          ) : (
            <Typography variant="body1" className={styles.noTeachersMessage}>
              Chưa có giáo viên trong tổ bộ môn
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