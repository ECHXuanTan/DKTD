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
import { 
    createAssignment, 
    batchDeleteAssignments, 
    getClassSubjectInfo, 
    getAllAssignmentTeachers,
    batchEditAssignments 
} from '../../services/assignmentServices.js';import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Box, Typography, TextField, Button, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Grid, Checkbox, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ExportPDFButton from './Component/ExportPDFButton.jsx';
import ExportDepartmentTeachers from './Component/ExportDepartmentTeachers.jsx';
import FilterButton from './Component/FilterButton.jsx';
import CreateAssignmentModal from './Component/CreateAssignmentModal.jsx';
import ImportTeacherAssignmentsModal from './Component/Teacher/ImportTeacherAssignmentsModal.jsx';
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
    const [deletingTeacherId, setDeletingTeacherId] = useState(null);
    const [selectedAssignments, setSelectedAssignments] = useState([]);
    const [filterType, setFilterType] = useState('all');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [maxLessons, setMaxLessons] = useState({});
    const [isEditMode, setIsEditMode] = useState(false);


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

    useEffect(() => {
        const fetchAllMaxLessons = async () => {
            try {
                const promises = Object.values(teacherAssignments).flat().map(assignment => 
                    getClassSubjectInfo(assignment.classId, assignment.subjectId, assignment.teacherId)
                );
                
                const results = await Promise.all(promises);
                
                const newMaxLessons = {};
                Object.values(teacherAssignments).flat().forEach((assignment, index) => {
                    newMaxLessons[assignment.id] = results[index].totalLessons;
                });
                
                setMaxLessons(newMaxLessons);
            } catch (error) {
                console.error('Error fetching max lessons:', error);
                toast.error('Không thể lấy thông tin số tiết tối đa');
            }
        };
    
        if (Object.keys(teacherAssignments).length > 0) {
            fetchAllMaxLessons();
        }
    }, [teacherAssignments]);

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

    const handleStartDelete = useCallback((teacherId) => {
        setDeletingTeacherId(teacherId);
        setSelectedAssignments([]);
    }, []);

    const handleDeleteSelected = useCallback(async () => {
        if (selectedAssignments.length === 0) {
            toast.warning('Vui lòng chọn ít nhất một phân công để xóa');
            return;
        }
    
        try {
            setActionLoading(true);
            setLoadingTeacherId(deletingTeacherId);
    
            // Delete all selected assignments
            await batchDeleteAssignments(selectedAssignments);
            
            const [teachersData, newAssignments] = await Promise.all([
                getDepartmentTeachers(),
                getAllAssignmentTeachers(deletingTeacherId)
            ]);
    
            setTeachers(teachersData);
            setTeacherAssignments(prev => ({
                ...prev,
                [deletingTeacherId]: newAssignments
            }));
    
            setDeletingTeacherId(null);
            setSelectedAssignments([]);
            toast.success('Xóa phân công thành công');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa phân công');
        } finally {
            setActionLoading(false);
            setLoadingTeacherId(null);
        }
    }, [deletingTeacherId, selectedAssignments, getAllAssignmentTeachers, getDepartmentTeachers]);

    const handleCreateAssignment = useCallback(async (assignments) => {
        try {
            setActionLoading(true);
            setLoadingTeacherId(selectedTeacherId);
    
            await createAssignment(assignments);
            
            const [teachersData, newAssignments] = await Promise.all([
                getDepartmentTeachers(),
                selectedTeacherId ? getAllAssignmentTeachers(selectedTeacherId) : Promise.resolve(null)
            ]);
    
            setTeachers(teachersData);
            if (selectedTeacherId && newAssignments) {
                setTeacherAssignments(prev => ({
                    ...prev,
                    [selectedTeacherId]: newAssignments
                }));
            }
            
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

    const handleStartEdit = (assignment) => {
        setEditingAssignment(assignment.id);
        setEditValue(assignment.completedLessons.toString());
        setIsEditMode(true);
    };
    
    const handleCancelEdit = () => {
        setEditingAssignment(null);
        setEditValue('');
        setIsEditMode(false);
    };
    
    const handleSaveEdit = async (assignment) => {
        try {
            setActionLoading(true);
            const newValue = parseInt(editValue);
            
            if (isNaN(newValue) || newValue < 0) {
                toast.error('Số tiết phải là số dương');
                return;
            }
    
            if (newValue > maxLessons[assignment.id]) {
                toast.error(`Số tiết không được vượt quá ${maxLessons[assignment.id]}`);
                return;
            }
    
            await batchEditAssignments([{
                assignmentId: assignment.id,
                completedLessons: newValue
            }]);
    
            const [teachersData, newAssignments] = await Promise.all([
                getDepartmentTeachers(),
                getAllAssignmentTeachers(assignment.teacherId)
            ]);
    
            setTeachers(teachersData);
            setTeacherAssignments(prev => ({
                ...prev,
                [assignment.teacherId]: newAssignments
            }));
    
            setEditingAssignment(null);
            setEditValue('');
            setIsEditMode(false);
            toast.success('Cập nhật số tiết thành công');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật số tiết');
        } finally {
            setActionLoading(false);
        }
    };

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
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={() => setIsImportModalOpen(true)} 
                                startIcon={<CloudUploadIcon />}
                                style={{ marginRight: '10px' }}
                            >
                                Tải lên Excel
                            </Button>
                            <ExportDepartmentTeachers 
                                departmentId={teacher?.department?._id} 
                                departmentName={currentDepartment}
                            />
                            <Link to="/leader/class-statistics" style={{ textDecoration: 'none', marginLeft: '10px' }}>
                                <Button style={{borderRadius: '26px', fontWeight: 'bold'}} variant="contained">
                                    Thống kê theo lớp
                                </Button>
                            </Link>
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
                                <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết khai báo</TableCell>
                                {isEditMode && <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết tối đa</TableCell>}
                                {deletingTeacherId && <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`} style={{ width: '60px' }}>Chọn</TableCell>}
                                <TableCell className={`${styles.tableHeader} ${styles.actionColumn}`}>Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredTeachers.map((teacher, index) => {
                                const assignments = teacherAssignments[teacher._id] || [];
                                const rowSpan = Math.max(assignments.length || 1, 1);
                                const isDeleting = deletingTeacherId === teacher._id;

                                return (
                                    <React.Fragment key={teacher._id}>
                                        {assignments.length > 0 ? (
                                            assignments.map((assignment, idx) => (
                                                <TableRow key={assignment.id} className={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                                                    {idx === 0 && (
                                                        <>
                                                            <TableCell rowSpan={rowSpan} className={`${styles.stickyColumn} ${styles.firstColumn}`}>{index + 1}</TableCell>
                                                            <TableCell rowSpan={rowSpan} className={`${styles.stickyColumn} ${styles.secondColumn}`}>{teacher.name}</TableCell>
                                                            <TableCell rowSpan={rowSpan} style={{textAlign: 'center'}}>{teacher.basicTeachingLessons}</TableCell>
                                                            <TableCell rowSpan={rowSpan} style={{textAlign: 'center'}}>{teacher.totalReducedLessons}</TableCell>
                                                            <TableCell rowSpan={rowSpan} className={styles.reductionCell}>
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
                                                            <TableCell rowSpan={rowSpan} style={{textAlign: 'center'}}>{teacher.finalBasicTeachingLessons}</TableCell>
                                                            <TableCell rowSpan={rowSpan} style={{textAlign: 'center'}}>{teacher.totalAssignment || "Chưa khai báo"}</TableCell>
                                                            <TableCell rowSpan={rowSpan} style={{textAlign: 'center'}}>{teacher.declaredTeachingLessons || "Chưa khai báo"}</TableCell>
                                                            <TableCell rowSpan={rowSpan} style={{textAlign: 'center'}}>{`${calculateCompletionPercentage(teacher.declaredTeachingLessons, teacher.finalBasicTeachingLessons)}%`}</TableCell>
                                                            <TableCell rowSpan={rowSpan} style={{textAlign: 'center'}}>{calculateExcessLessons(teacher.declaredTeachingLessons, teacher.finalBasicTeachingLessons)}</TableCell>
                                                        </>
                                                    )}
                                                    <TableCell>{assignment.className}</TableCell>
                                                    <TableCell>{assignment.subjectName}</TableCell>
                                                    <TableCell style={{textAlign: 'center'}}>
                                                        {editingAssignment === assignment.id ? (
                                                            <TextField
                                                                value={editValue}
                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                type="number"
                                                                size="small"
                                                                style={{ width: '80px' }}
                                                                InputProps={{
                                                                    inputProps: { 
                                                                        min: 0,
                                                                        max: maxLessons[assignment.id] || 0 
                                                                    }
                                                                }}
                                                                autoFocus
                                                            />
                                                        ) : assignment.completedLessons}
                                                    </TableCell>
                                                    {isEditMode && (
                                                        <TableCell style={{textAlign: 'center'}}>
                                                            {maxLessons[assignment.id] || '-'}
                                                        </TableCell>
                                                    )}
                                                    {deletingTeacherId ? (
                                                        <TableCell style={{ width: '60px', textAlign: 'center' }}>
                                                            {isDeleting && (
                                                                <Checkbox
                                                                    checked={selectedAssignments.includes(assignment.id)}
                                                                    onChange={() => handleCheckAssignment(assignment.id)}
                                                                    disabled={actionLoading && loadingTeacherId === teacher._id}
                                                                />
                                                            )}
                                                        </TableCell>
                                                    ) : null}
                                                    <TableCell>
                                                        <div className={styles.actionButtons}>
                                                            {editingAssignment === assignment.id ? (
                                                                <div className={styles.buttonsContainer}>
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => handleSaveEdit({...assignment, teacherId: teacher._id})}
                                                                        disabled={actionLoading}
                                                                    >
                                                                        <SaveIcon style={{ color: "#4caf50" }}/>
                                                                    </IconButton>
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={handleCancelEdit}
                                                                        disabled={actionLoading}
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
                                                                        size="small"
                                                                        onClick={() => handleStartEdit(assignment)}
                                                                        disabled={actionLoading}
                                                                    >
                                                                        <EditIcon style={{ color: "#2196f3" }}/>
                                                                    </IconButton>
                                                                    <IconButton
                                                                        className={`${styles.actionIcon} ${styles.deleteIcon}`}
                                                                        onClick={() => handleStartDelete(teacher._id)}
                                                                        disabled={actionLoading}
                                                                    >
                                                                        <DeleteIcon style={{ color: "#f44336" }}/>
                                                                    </IconButton>
                                                                    {idx === 0 && (
                                                                        <IconButton
                                                                            className={styles.actionIcon}
                                                                            onClick={() => handleOpenAssignmentModal(teacher._id)}
                                                                            disabled={actionLoading}
                                                                        >
                                                                            <AddCircleIcon style={{ color: "#113f67" }}/>
                                                                        </IconButton>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
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
                                                <TableCell>-</TableCell>
                                                {isEditMode && <TableCell>-</TableCell>}
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

            <ImportTeacherAssignmentsModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onAssignmentCreate={async () => {
                const [teachersData, aboveCount, belowCount] = await Promise.all([
                    getDepartmentTeachers(),
                    getTeachersAboveThresholdCount(teacher.department._id), 
                    getTeachersBelowBasicCount(teacher.department._id)
                ]);

                setTeachers(teachersData);
                setAboveThresholdCount(aboveCount);
                setBelowThresholdCount(belowCount);

                const assignmentsPromises = teachersData.map(teacher => 
                    getAllAssignmentTeachers(teacher._id)
                );
                const assignmentsResults = await Promise.all(assignmentsPromises);
                const assignmentsMap = {};
                teachersData.forEach((teacher, index) => {
                    assignmentsMap[teacher._id] = assignmentsResults[index];
                });
                setTeacherAssignments(assignmentsMap);
                }}
            />
            <Footer/>
            <ToastContainer />
        </>
    );
};

export default React.memo(LeaderDashboard);