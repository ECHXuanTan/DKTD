import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Circles } from 'react-loader-spinner';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import { getUser } from '../../services/authServices.js';
import { getDepartmentTeachers, getTeachersAboveThresholdCount, getTeachersBelowBasicCount } from '../../services/statisticsServices';
import { getTeacherByEmail } from '../../services/teacherService.js';
import { getSubjectsByDepartment } from '../../services/subjectServices.js';
import { createAssignment, batchEditAssignments, batchDeleteAssignments, getClassSubjectInfo, getAllAssignmentTeachers } from '../../services/assignmentServices.js';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Box, Typography, TextField, Button, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Grid, Checkbox, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import ExportPDFButton from './Component/ExportPDFButton.jsx';
import ExportDepartmentTeachers from './Component/ExportDepartmentTeachers.jsx';
import FilterButton from './Component/FilterButton.jsx';
import CreateAssignmentModal from './Component/CreateAssignmentModal.jsx';
import styles from '../../css/Leader/LeaderDeclare.module.css';

const calculateCompletionPercentage = (declaredTeachingLessons, finalBasicTeachingLessons) => {
    if (finalBasicTeachingLessons === 0) return 0;
    const percentage = (declaredTeachingLessons / finalBasicTeachingLessons) * 100;
    return Math.min(percentage, 100).toFixed(2);
};

const calculateExcessLessons = (declaredTeachingLessons, finalBasicTeachingLessons) => {
    return Math.max(0, declaredTeachingLessons - finalBasicTeachingLessons);
};

const LeaderDashboard = () => {
    const [user, setUser] = useState(null);
    const [teacher, setTeacher] = useState(null);
    const [teachers, setTeachers] = useState([]);
    const [teacherAssignments, setTeacherAssignments] = useState({});
    const [currentDepartment, setCurrentDepartment] = useState(null);
    const [initialLoading, setInitialLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [loadingTeacherId, setLoadingTeacherId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [aboveThresholdCount, setAboveThresholdCount] = useState(0);
    const [belowThresholdCount, setBelowThresholdCount] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [subjects, setSubjects] = useState([]);
    const [selectedTeacherId, setSelectedTeacherId] = useState(null);
    const [selectedTeacherAssignments, setSelectedTeacherAssignments] = useState([]);
    const [editingTeacherId, setEditingTeacherId] = useState(null);
    const [deletingTeacherId, setDeletingTeacherId] = useState(null);
    const [selectedAssignments, setSelectedAssignments] = useState([]);
    const [editValues, setEditValues] = useState({});
    const [maxLessons, setMaxLessons] = useState({});
    const [filterType, setFilterType] = useState('all');

    const fetchInitialData = useCallback(async () => {
        try {
            setInitialLoading(true);
            const [userData, teacherData, teachersData] = await Promise.all([
                getUser(),
                getTeacherByEmail(),
                getDepartmentTeachers()
            ]);
    
            if (!userData || userData.user.role !== 0) return;
    
            setUser(userData);
            setTeacher(teacherData);
            setTeachers(teachersData);
    
            if (Array.isArray(teachersData) && teachersData.length > 0) {
                setCurrentDepartment(teachersData[0].departmentName);
                
                const assignmentsPromises = teachersData.map(teacher => 
                    getAllAssignmentTeachers(teacher._id)
                );
                const assignmentsResults = await Promise.all(assignmentsPromises);
                const assignmentsMap = {};
                teachersData.forEach((teacher, index) => {
                    assignmentsMap[teacher._id] = assignmentsResults[index];
                });
                setTeacherAssignments(assignmentsMap);
    
                const [subjectsData, aboveCount, belowCount] = await Promise.all([
                    getSubjectsByDepartment(teacherData.department._id),
                    getTeachersAboveThresholdCount(teacherData.department._id),
                    getTeachersBelowBasicCount(teacherData.department._id)
                ]);
    
                setSubjects(subjectsData);
                setAboveThresholdCount(aboveCount);
                setBelowThresholdCount(belowCount);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.');
        } finally {
            setInitialLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

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

    const handleStartEdit = useCallback(async (teacherId) => {
        try {
            setActionLoading(true);
            setLoadingTeacherId(teacherId);
            const assignments = teacherAssignments[teacherId] || [];
            
            const infoPromises = assignments.map(assignment => 
                getClassSubjectInfo(assignment.classId, assignment.subjectId, teacherId)
            );
            const classInfos = await Promise.all(infoPromises);
            
            const initialValues = {};
            const maxLessonsData = {};
            
            assignments.forEach((assignment, index) => {
                const info = classInfos[index];
                const maxAllowed = info.isSpecialClass 
                    ? info.remainingLessons + assignment.completedLessons
                    : info.remainingLessons + assignment.completedLessons;

                maxLessonsData[`${assignment.className}-${assignment.subjectName}`] = maxAllowed;
                initialValues[`${assignment.className}-${assignment.subjectName}-lessonsPerWeek`] = assignment.lessonsPerWeek;
                initialValues[`${assignment.className}-${assignment.subjectName}-numberOfWeeks`] = assignment.numberOfWeeks;
            });

            setMaxLessons(maxLessonsData);
            setEditValues(initialValues);
            setDeletingTeacherId(null);
            setSelectedAssignments([]);
            setEditingTeacherId(teacherId);
        } catch (error) {
            console.error('Error in handleStartEdit:', error);
            toast.error('Lỗi khi lấy thông tin số tiết còn trống');
        } finally {
            setActionLoading(false);
            setLoadingTeacherId(null);
        }
    }, [teacherAssignments]);

    const handleSaveEdit = useCallback(async (teacherId) => {
        try {
            setActionLoading(true);
            setLoadingTeacherId(teacherId);
            const assignments = teacherAssignments[teacherId] || [];
            const updatedAssignments = [];

            for (const assignment of assignments) {
                const lessonsPerWeek = parseInt(editValues[`${assignment.className}-${assignment.subjectName}-lessonsPerWeek`]);
                const numberOfWeeks = parseInt(editValues[`${assignment.className}-${assignment.subjectName}-numberOfWeeks`]);
                const totalLessons = lessonsPerWeek * numberOfWeeks;
                
                const maxAllowedLessons = maxLessons[`${assignment.className}-${assignment.subjectName}`];
                
                if (totalLessons > maxAllowedLessons) {
                    throw new Error(`Tổng số tiết của ${assignment.className} - ${assignment.subjectName} (${totalLessons}) không được vượt quá ${maxAllowedLessons}`);
                }

                updatedAssignments.push({
                    assignmentId: assignment.id,
                    lessonsPerWeek,
                    numberOfWeeks
                });
            }

            await batchEditAssignments(updatedAssignments);
            
            const [teachersData, newAssignments] = await Promise.all([
                getDepartmentTeachers(),
                getAllAssignmentTeachers(teacherId)
            ]);

            setTeachers(teachersData);
            setTeacherAssignments(prev => ({
                ...prev,
                [teacherId]: newAssignments
            }));

            setEditingTeacherId(null);
            setEditValues({});
            setMaxLessons({});
            toast.success('Cập nhật phân công thành công');
        } catch (error) {
            toast.error(error.message || 'Có lỗi xảy ra khi cập nhật phân công');
        } finally {
            setActionLoading(false);
            setLoadingTeacherId(null);
        }
    }, [teacherAssignments, editValues, maxLessons]);

    const handleDeleteSelected = useCallback(async () => {
        if (selectedAssignments.length === 0) {
            toast.warning('Vui lòng chọn ít nhất một phân công để xóa');
            return;
        }

        try {
            setActionLoading(true);
            setLoadingTeacherId(deletingTeacherId);

            const assignmentsToDelete = selectedAssignments.map(assignmentId => {
                const assignment = teacherAssignments[deletingTeacherId].find(
                    a => a.id === assignmentId
                );
                return {
                    id: assignmentId,
                    completedLessons: assignment.completedLessons
                };
            });

            await batchDeleteAssignments(assignmentsToDelete);
            
            const [teachersData, newAssignments] = await Promise.all([
                getDepartmentTeachers(),
                getAllAssignmentTeachers(deletingTeacherId)
            ]);

            setTeachers(teachersData);
            if (deletingTeacherId) {
                setTeacherAssignments(prev => ({
                    ...prev,
                    [deletingTeacherId]: newAssignments
                }));
            }

            setDeletingTeacherId(null);
            setSelectedAssignments([]);
            toast.success('Xóa phân công thành công');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa phân công');
        } finally {
            setActionLoading(false);
            setLoadingTeacherId(null);
        }
    }, [deletingTeacherId, selectedAssignments, teacherAssignments]);

    const handleCreateAssignment = useCallback(async (assignments) => {
        try {
            setActionLoading(true);
            // Thêm loading state cho teacher đang được xử lý
            setLoadingTeacherId(selectedTeacherId);
    
            // Thực hiện tạo assignment
            await createAssignment(assignments);
            
            // Fetch lại data sau khi tạo thành công
            const [teachersData, newAssignments] = await Promise.all([
                getDepartmentTeachers(),
                selectedTeacherId ? getAllAssignmentTeachers(selectedTeacherId) : Promise.resolve(null)
            ]);
    
            // Cập nhật state
            setTeachers(teachersData);
            if (selectedTeacherId && newAssignments) {
                setTeacherAssignments(prev => ({
                    ...prev,
                    [selectedTeacherId]: newAssignments
                }));
            }
            
            // Reset states và đóng modal
            setShowModal(false);
            setSelectedTeacherId(null);
            setSelectedTeacherAssignments([]);
            
            toast.success('Phân công tiết dạy thành công');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi phân công tiết dạy');
        } finally {
            setActionLoading(false);
            setLoadingTeacherId(null);
        }
    }, [selectedTeacherId]);

    const handleStartDelete = useCallback((teacherId) => {
        setDeletingTeacherId(teacherId);
        setSelectedAssignments([]);
        setEditingTeacherId(null);
        setEditValues({});
    }, []);

    const handleOpenAssignmentModal = useCallback((teacherId) => {
        const assignments = teacherAssignments[teacherId] || [];
        setSelectedTeacherId(teacherId);
        setSelectedTeacherAssignments(assignments);
        setShowModal(true);
    }, [teacherAssignments]);

    const handleCheckAssignment = useCallback((assignmentId) => {
        setSelectedAssignments(prev =>
            prev.includes(assignmentId) 
            ? prev.filter(id => id !== assignmentId)
            : [...prev, assignmentId]
        );
    }, []);

    const filteredTeachers = useMemo(() => 
        filterTeachers(
            teachers.filter((teacher) =>
            teacher.name.toLowerCase().includes(searchQuery.toLowerCase())
            ),
            filterType
        ),
        [teachers, searchQuery, filterType, filterTeachers]
    );

    const handleSearchChange = useCallback((event) => {
        setSearchQuery(event.target.value);
    }, []);



    if (initialLoading) {
        return (
            <div className={styles.loadingContainer}>
                <Circles type="TailSpin" color="#00BFFF" height={80} width={80} />
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>Quản lý giáo viên</title>
            </Helmet>
            <Header/>
            <div className={styles.dashboardLeader}>
                <Box className={styles.welcomeBox}>
                    <Typography variant="h3" className={styles.welcomeTitle}>
                        Chào mừng giáo viên {teacher?.name} đến với trang khai báo
                    </Typography>
                    <Grid container spacing={2} className={styles.statsGrid}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper className={`${styles.statBox} ${styles.blueBox}`}>
                                <Typography variant="h6">Tổng số giáo viên của Tổ bộ môn</Typography>
                                <Typography variant="h4">{teachers.length}</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper className={`${styles.statBox} ${styles.greenBox}`}>
                                <Typography variant="h6">Tổng số tiết đã khai báo của Tổ bộ môn</Typography>
                                <Typography variant="h4">{teachers.reduce((sum, teacher) => sum + teacher.totalAssignment, 0)}</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper className={`${styles.statBox} ${styles.orangeBox}`}>
                                <Typography variant="h6">Giáo viên vượt quá 25% số tiết chuẩn</Typography>
                                <Typography variant="h4">{aboveThresholdCount}</Typography>
                                </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper className={`${styles.statBox} ${styles.redBox}`}>
                                <Typography variant="h6">Giáo viên chưa đạt số tiết chuẩn</Typography>
                                <Typography variant="h4">{belowThresholdCount}</Typography>
                            </Paper>
                        </Grid>
                    </Grid>
                </Box>
                <Box mt={4}>
                    <Typography variant="h4" mb={2}>
                        Danh sách giáo viên {currentDepartment}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" mb={3}>
                        <Box display="flex" gap="20px" mb={4}>
                        <TextField
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder="Tìm kiếm theo tên giáo viên"
                            style={{ width: '100%' }}
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
                        <Box>
                            <ExportDepartmentTeachers 
                                departmentId={teacher?.department?._id} 
                                departmentName={currentDepartment}
                            />
                            {/* <ExportPDFButton user={user?.user} currentDepartment={currentDepartment} /> */}
                            <Link to="/leader/class-statistics" style={{ textDecoration: 'none', marginLeft: '10px' }}>
                                <Button style={{borderRadius: '26px', fontWeight: 'bold'}} variant="contained">
                                    Thống kê theo lớp
                                </Button>
                            </Link>
                            {/* <Link to="/leader/warning" style={{ textDecoration: 'none', marginLeft: '10px' }}>
                                <Button style={{borderRadius: '26px', fontWeight: 'bold'}} variant="contained" className={styles.warningButton}>
                                    Cảnh báo
                                </Button>
                            </Link> */}
                        </Box>
                    </Box>
                    <TableContainer component={Paper} className={styles.tableContainer}>
                    <Table className={styles.table}>
                        <TableHead>
                            <TableRow>
                                <TableCell className={`${styles.tableHeader} ${styles.stickyColumn} ${styles.stickyHeader} ${styles.firstColumn} ${styles.headerFirstColumn}`}>STT</TableCell>
                                <TableCell className={`${styles.tableHeader} ${styles.stickyColumn} ${styles.stickyHeader} ${styles.secondColumn} ${styles.headerSecondColumn}`}>Tên giáo viên</TableCell>
                                <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết chuẩn</TableCell>
                                <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết giảm trừ</TableCell>
                                <TableCell className={`${styles.tableHeader} ${styles.mediumWidth}`}>Nội dung giảm</TableCell>
                                <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết chuẩn sau khi giảm trừ</TableCell>
                                <TableCell className={`${styles.tableHeader} ${styles.fixedWidth2}`}>Tổng số tiết được phân công</TableCell>
                                <TableCell className={`${styles.tableHeader} ${styles.fixedWidth2}`}>Tổng số tiết hoàn thành</TableCell>
                                <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Tỉ lệ hoàn thành</TableCell>
                                <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết dư</TableCell>
                                <TableCell className={`${styles.tableHeader} ${styles.mediumWidth}`}>Mã lớp</TableCell>
                                <TableCell className={`${styles.tableHeader} ${styles.mediumWidth}`}>Môn học</TableCell>
                                {editingTeacherId && <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết tối đa</TableCell>}
                                <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Tiết/Tuần</TableCell>
                                <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tuần</TableCell>
                                <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết khai báo</TableCell>
                                {deletingTeacherId && <TableCell className={styles.tableHeader}>Chọn</TableCell>}
                                <TableCell className={`${styles.tableHeader} ${styles.actionColumn}`}>Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredTeachers.map((teacher, index) => {
                                const assignments = teacherAssignments[teacher._id] || [];
                                const rowSpan = Math.max(assignments.length || 1, 1);
                                const isEditing = editingTeacherId === teacher._id;
                                const isDeleting = deletingTeacherId === teacher._id;

                                return (
                                    <React.Fragment key={teacher._id}>
                                        {assignments.length > 0 ? (
                                            assignments.map((assignment, idx) => {
                                                const totalRows = Math.max(assignments.length, 1);
                                                
                                                return (
                                                    <TableRow key={assignment.id} className={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                                                        {idx === 0 && (
                                                            <>
                                                                <TableCell rowSpan={totalRows} className={`${styles.stickyColumn} ${styles.firstColumn}`}>{index + 1}</TableCell>
                                                                <TableCell rowSpan={totalRows} className={`${styles.stickyColumn} ${styles.secondColumn}`}>{teacher.name}</TableCell>
                                                                <TableCell rowSpan={totalRows} style={{textAlign: 'center'}}>{teacher.basicTeachingLessons}</TableCell>
                                                                <TableCell rowSpan={totalRows} style={{textAlign: 'center'}}>{teacher.totalReducedLessons}</TableCell>
                                                                <TableCell rowSpan={totalRows} className={styles.reductionCell}>
                                                                    {teacher.reductions && teacher.reductions.map((reduction, rIndex) => (
                                                                        <div key={rIndex} className={styles.reductionRow}>
                                                                            {reduction.reductionReason}
                                                                        </div>
                                                                    ))}
                                                                    {teacher.homeroomInfo?.reductionReason && (
                                                                        <div className={styles.reductionRow}>
                                                                            {teacher.homeroomInfo.reductionReason}
                                                                        </div>
                                                                    )}
                                                                    {!teacher.reductions?.length && !teacher.homeroomInfo?.reductionReason && (
                                                                        <div className={styles.reductionRow}>Không có</div>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell rowSpan={totalRows} style={{textAlign: 'center'}}>{teacher.finalBasicTeachingLessons}</TableCell>
                                                                <TableCell rowSpan={totalRows} style={{textAlign: 'center'}}>{teacher.totalAssignment || "Chưa khai báo"}</TableCell>
                                                                <TableCell rowSpan={totalRows} style={{textAlign: 'center'}}>{teacher.declaredTeachingLessons || "Chưa khai báo"}</TableCell>
                                                                <TableCell rowSpan={totalRows} style={{textAlign: 'center'}}>{`${calculateCompletionPercentage(teacher.declaredTeachingLessons, teacher.finalBasicTeachingLessons)}%`}</TableCell>
                                                                <TableCell rowSpan={totalRows} style={{textAlign: 'center'}}>{calculateExcessLessons(teacher.declaredTeachingLessons, teacher.finalBasicTeachingLessons)}</TableCell>
                                                            </>
                                                        )}
                                                        <TableCell>{assignment.className}</TableCell>
                                                        <TableCell>{assignment.subjectName}</TableCell>
                                                        {editingTeacherId && (
                                                            <TableCell style={{textAlign: 'center'}}>
                                                                {isEditing ? maxLessons[`${assignment.className}-${assignment.subjectName}`] : ''}
                                                            </TableCell>
                                                        )}
                                                        <TableCell style={{textAlign: 'center'}}>
                                                            {isEditing ? (
                                                                <TextField
                                                                    type="number"
                                                                    className={styles.editInput}
                                                                    value={editValues[`${assignment.className}-${assignment.subjectName}-lessonsPerWeek`]}
                                                                    onChange={(e) => {
                                                                        const value = e.target.value;
                                                                        const numberOfWeeks = parseInt(editValues[`${assignment.className}-${assignment.subjectName}-numberOfWeeks`]) || 0;
                                                                        const maxAllowedLessons = maxLessons[`${assignment.className}-${assignment.subjectName}`];
                                                                        
                                                                        if (value === '' || (parseInt(value) >= 0 && parseInt(value) * numberOfWeeks <= maxAllowedLessons)) {
                                                                            setEditValues(prev => ({
                                                                                ...prev,
                                                                                [`${assignment.className}-${assignment.subjectName}-lessonsPerWeek`]: value
                                                                            }));
                                                                        }
                                                                    }}
                                                                    size="small"
                                                                />
                                                            ) : assignment.lessonsPerWeek}
                                                        </TableCell>
                                                        <TableCell style={{textAlign: 'center'}}>
                                                            {isEditing ? (
                                                                <TextField
                                                                    type="number"
                                                                    className={styles.editInput}
                                                                    value={editValues[`${assignment.className}-${assignment.subjectName}-numberOfWeeks`]}
                                                                    onChange={(e) => {
                                                                        const value = e.target.value;
                                                                        const lessonsPerWeek = parseInt(editValues[`${assignment.className}-${assignment.subjectName}-lessonsPerWeek`]) || 0;
                                                                        const maxAllowedLessons = maxLessons[`${assignment.className}-${assignment.subjectName}`];
                                                                        
                                                                        if (value === '' || (parseInt(value) >= 0 && lessonsPerWeek * parseInt(value) <= maxAllowedLessons)) {
                                                                            setEditValues(prev => ({
                                                                                ...prev,
                                                                                [`${assignment.className}-${assignment.subjectName}-numberOfWeeks`]: value
                                                                            }));
                                                                        }
                                                                    }}
                                                                    size="small"
                                                                />
                                                            ) : assignment.numberOfWeeks}
                                                        </TableCell>
                                                        <TableCell style={{textAlign: 'center'}}>{assignment.completedLessons}</TableCell>
                                                        {deletingTeacherId && (
                                                            <TableCell style={{textAlign: 'center'}}>
                                                                {isDeleting && (
                                                                    <Checkbox
                                                                        checked={selectedAssignments.includes(assignment.id)}
                                                                        onChange={() => handleCheckAssignment(assignment.id)}
                                                                        disabled={actionLoading && loadingTeacherId === teacher._id}
                                                                    />
                                                                )}
                                                            </TableCell>
                                                        )}
                                                        {idx === 0 && (
                                                            <TableCell rowSpan={totalRows}>
                                                                <div className={styles.actionButtons}>
                                                                    {isEditing ? (
                                                                        <div className={styles.buttonsContainer}>
                                                                            <IconButton
                                                                                className={styles.actionIcon}
                                                                                onClick={() => handleSaveEdit(teacher._id)}
                                                                                disabled={actionLoading && loadingTeacherId === teacher._id}
                                                                            >
                                                                                {actionLoading && loadingTeacherId === teacher._id ? (
                                                                                    <div style={{ width: 24, height: 24 }}>
                                                                                        <Circles color="#1976d2" height={24} width={24} />
                                                                                    </div>
                                                                                ) : (
                                                                                    <SaveIcon style={{ color: "#4caf50" }}/>
                                                                                )}
                                                                            </IconButton>
                                                                            <IconButton
                                                                                className={styles.actionIcon}
                                                                                onClick={() => {
                                                                                    setEditingTeacherId(null);
                                                                                    setEditValues({});
                                                                                    setMaxLessons({});
                                                                                }}
                                                                                disabled={actionLoading && loadingTeacherId === teacher._id}
                                                                            >
                                                                                <CancelIcon style={{ color: "#f44336" }}/>
                                                                            </IconButton>
                                                                        </div>
                                                                    ) : isDeleting ? (
                                                                        <div className={styles.buttonsContainer}>
                                                                            <IconButton
                                                                                className={`${styles.actionIcon} ${styles.deleteIcon}`}
                                                                                onClick={handleDeleteSelected}
                                                                                disabled={actionLoading && loadingTeacherId === teacher._id}
                                                                            >
                                                                                {actionLoading && loadingTeacherId === teacher._id ? (
                                                                                    <div style={{ width: 24, height: 24 }}>
                                                                                        <Circles color="#d32f2f" height={24} width={24} />
                                                                                    </div>
                                                                                ) : (
                                                                                    <DeleteIcon style={{ color: "#f44336" }}/>
                                                                                )}
                                                                            </IconButton>
                                                                            <IconButton
                                                                                className={styles.actionIcon}
                                                                                onClick={() => setDeletingTeacherId(null)}
                                                                                disabled={actionLoading && loadingTeacherId === teacher._id}
                                                                            >
                                                                                <CancelIcon style={{ color: "#f44336" }}/>
                                                                            </IconButton>
                                                                        </div>
                                                                    ) : (
                                                                        <div className={styles.buttonsContainer}>
                                                                            <IconButton
                                                                                className={styles.actionIcon}
                                                                                onClick={() => handleStartEdit(teacher._id)}
                                                                                disabled={actionLoading && loadingTeacherId === teacher._id}
                                                                            >
                                                                                {actionLoading && loadingTeacherId === teacher._id ? (
                                                                                    <div style={{ width: 24, height: 24 }}>
                                                                                        <Circles color="#1976d2" height={24} width={24} />
                                                                                    </div>
                                                                                ) : (
                                                                                    <EditIcon style={{ color: "#4caf50" }}/>
                                                                                )}
                                                                            </IconButton>
                                                                            <IconButton
                                                                                className={`${styles.actionIcon} ${styles.deleteIcon}`}
                                                                                onClick={() => handleStartDelete(teacher._id)}
                                                                                disabled={actionLoading}
                                                                            >
                                                                                <DeleteIcon style={{ color: "#f44336" }}/>
                                                                            </IconButton>
                                                                            <IconButton
                                                                                className={styles.actionIcon}
                                                                                onClick={() => handleOpenAssignmentModal(teacher._id)}
                                                                                disabled={actionLoading}
                                                                            >
                                                                                <AddCircleIcon style={{ color: "#113f67" }}/>
                                                                            </IconButton>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                );
                                            })
                                        ) : (
                                            <TableRow className={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                                                <TableCell className={`${styles.stickyColumn} ${styles.firstColumn}`}>{index + 1}</TableCell>
                                                <TableCell className={`${styles.stickyColumn} ${styles.secondColumn}`}>{teacher.name}</TableCell>
                                                <TableCell style={{textAlign: 'center'}}>{teacher.basicTeachingLessons}</TableCell>
                                                <TableCell style={{textAlign: 'center'}}>{teacher.totalReducedLessons}</TableCell>
                                                <TableCell className={styles.reductionCell}>
                                                    {teacher.reductions && teacher.reductions.map((reduction, rIndex) => (
                                                        <div key={rIndex} className={styles.reductionRow}>
                                                            {reduction.reductionReason}
                                                        </div>
                                                    ))}
                                                    {teacher.homeroomInfo?.reductionReason && (
                                                        <div className={styles.reductionRow}>
                                                            {teacher.homeroomInfo.reductionReason}
                                                        </div>
                                                    )}
                                                    {!teacher.reductions?.length && !teacher.homeroomInfo?.reductionReason && (
                                                        <div className={styles.reductionRow}>Không có</div>
                                                    )}
                                                </TableCell>
                                                <TableCell style={{textAlign: 'center'}}>{teacher.finalBasicTeachingLessons}</TableCell>
                                                <TableCell style={{textAlign: 'center'}}>Chưa khai báo</TableCell>
                                                <TableCell style={{textAlign: 'center'}}>Chưa khai báo</TableCell>
                                                <TableCell style={{textAlign: 'center'}}>0%</TableCell>
                                                <TableCell style={{textAlign: 'center'}}>0</TableCell>
                                                <TableCell>-</TableCell>
                                                <TableCell>-</TableCell>
                                                {editingTeacherId && <TableCell></TableCell>}
                                                <TableCell>-</TableCell>
                                                <TableCell>-</TableCell>
                                                <TableCell>-</TableCell>
                                                {deletingTeacherId && <TableCell></TableCell>}
                                                <TableCell>
                                                    <div className={styles.actionButtons}>
                                                        <div className={styles.buttonsContainer}>
                                                            <IconButton
                                                                className={styles.actionIcon}
                                                                onClick={() => handleOpenAssignmentModal(teacher._id)}
                                                                disabled={actionLoading}
                                                            >
                                                                <AddCircleIcon style={{ color: "#113f67" }}/>
                                                            </IconButton>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
                </Box>
            </div>

            <CreateAssignmentModal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setSelectedTeacherId(null);
                    setSelectedTeacherAssignments([]);
                }}
                subjects={subjects}
                teacherId={selectedTeacherId}
                onAssignmentCreate={handleCreateAssignment}
                existingAssignments={selectedTeacherAssignments}
                isLoading={actionLoading && loadingTeacherId === selectedTeacherId}
            />

            <Footer/>
            <ToastContainer />
        </>
    );
};

export default React.memo(LeaderDashboard);