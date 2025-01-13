import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
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
} from '../../services/assignmentServices.js';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Box, Typography, TextField, Button, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Grid, Checkbox, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SchoolIcon from '@mui/icons-material/School';
import ExportDepartmentTeachers from './Component/ExportDepartmentTeachers.jsx';
import FilterButton from './Component/FilterButton.jsx';
import CreateAssignmentModal from './Component/CreateAssignmentModal.jsx';
import ImportTeacherAssignmentsModal from './Component/Teacher/ImportTeacherAssignmentsModal.jsx';
import styles from '../../css/Leader/LeaderDeclare.module.css';

const excludedIds = ["67801209b2349d98214e33b0", "6720a875ecc34e29a4c2642c", "677feb6ab2349d98214e175b", 
                    "678079b1b2349d98214e7848", "67807f9cb2349d98214e7f5c", "67808309b2349d98214e85cf", 
                    "678088aeb2349d98214e8ac3", "6710730c6ad80da90b6489ff", "6746e4e5153d5710f1c1a64c"];

const calculateCompletionPercentage = (declaredTeachingLessons, finalBasicTeachingLessons) => {
    if (finalBasicTeachingLessons === 0) return 0;
    const percentage = (declaredTeachingLessons / finalBasicTeachingLessons) * 100;
    return Math.min(percentage, 100).toFixed(2);
};

const calculateExcessLessons = (declaredTeachingLessons, finalBasicTeachingLessons) => {
    return Math.max(0, declaredTeachingLessons - finalBasicTeachingLessons);
};

const calculateTotalReducedLessons = (teacher) => {
    const reductionLessons = teacher.totalReducedLessons || 0;
    const homeroomLessons = teacher.homeroomInfo?.totalReducedLessons || 0;
    return reductionLessons + homeroomLessons;
};

const updateTeachersWithCorrectReductions = (teachers) => {
    return teachers.map(teacher => ({
        ...teacher,
        totalReducedLessons: calculateTotalReducedLessons(teacher),
        finalBasicTeachingLessons: teacher.basicTeachingLessons - calculateTotalReducedLessons(teacher)
    }));
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

    useEffect(() => {
        const fetchInitialData = async () => {
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
                
                const filteredTeachers = teachersData.filter(t => !excludedIds.includes(t._id));
                const updatedTeachers = updateTeachersWithCorrectReductions(filteredTeachers);
                setTeachers(updatedTeachers);
    
                if (Array.isArray(updatedTeachers) && updatedTeachers.length > 0) {
                    setCurrentDepartment(updatedTeachers[0].departmentName);
                    
                    const assignmentsPromises = updatedTeachers.map(teacher => 
                        getAllAssignmentTeachers(teacher._id)
                    );
                    const assignmentsResults = await Promise.all(assignmentsPromises);
                    const assignmentsMap = {};
                    updatedTeachers.forEach((teacher, index) => {
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
        };
    
        fetchInitialData();
    }, []);

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
    
            await batchDeleteAssignments(selectedAssignments);
            
            const [teachersData, newAssignments] = await Promise.all([
                getDepartmentTeachers(),
                getAllAssignmentTeachers(deletingTeacherId)
            ]);
    
            const filteredTeachers = teachersData.filter(t => !excludedIds.includes(t._id));
            const updatedTeachers = updateTeachersWithCorrectReductions(filteredTeachers);
            setTeachers(updatedTeachers);
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
    }, [deletingTeacherId, selectedAssignments]);

    const handleCreateAssignment = useCallback(async (assignments) => {
        try {
            setActionLoading(true);
            setLoadingTeacherId(selectedTeacherId);
    
            await createAssignment(assignments);
            
            const [teachersData, newAssignments] = await Promise.all([
                getDepartmentTeachers(),
                selectedTeacherId ? getAllAssignmentTeachers(selectedTeacherId) : Promise.resolve(null)
            ]);
    
            const filteredTeachers = teachersData.filter(t => !excludedIds.includes(t._id));
            const updatedTeachers = updateTeachersWithCorrectReductions(filteredTeachers);
            setTeachers(updatedTeachers);
            
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

    const handleStartEdit = (teacherId) => {
        const assignments = teacherAssignments[teacherId] || [];
        const initialValues = {};
        assignments.forEach(assignment => {
            initialValues[assignment.id] = assignment.completedLessons.toString();
        });
        setEditValue(initialValues);
        setEditingAssignment(teacherId);
        setIsEditMode(true);
    };
    
    const handleSaveEdit = async (teacherId) => {
        try {
            setActionLoading(true);
            setLoadingTeacherId(teacherId);
            
            const assignments = teacherAssignments[teacherId] || [];
            const updatedAssignments = [];
            
            for (const assignment of assignments) {
                const newValue = parseInt(editValue[assignment.id]);
                
                if (isNaN(newValue) || newValue < 0) {
                    toast.error('Số tiết phải là số dương');
                    return;
                }
                
                if (newValue > maxLessons[assignment.id]) {
                    toast.error(`Số tiết không được vượt quá ${maxLessons[assignment.id]} cho lớp ${assignment.className}`);
                    return;
                }
                
                updatedAssignments.push({
                    assignmentId: assignment.id,
                    completedLessons: newValue
                });
            }
            
            await batchEditAssignments(updatedAssignments);
            
            const [teachersData, newAssignments] = await Promise.all([
                getDepartmentTeachers(),
                getAllAssignmentTeachers(teacherId)
            ]);
            
            const filteredTeachers = teachersData.filter(t => !excludedIds.includes(t._id));
            const updatedTeachers = updateTeachersWithCorrectReductions(filteredTeachers);
            setTeachers(updatedTeachers);
            setTeacherAssignments(prev => ({
                ...prev,
                [teacherId]: newAssignments
            }));
            
            setEditingAssignment(null);
            setEditValue({});
            setIsEditMode(false);
            toast.success('Cập nhật số tiết thành công');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật số tiết');
        } finally {
            setActionLoading(false);
            setLoadingTeacherId(null);
        }
    };

    const renderAssignments = (teacher, index) => {
        const assignments = teacherAssignments[teacher._id] || [];
        const hasHomeroom = teacher.homeroomInfo ? 1 : 0;
        const rowSpan = Math.max(assignments.length + hasHomeroom || 1, 1);
        const isDeleting = deletingTeacherId === teacher._id;
        const isEditing = editingAssignment === teacher._id;
        const isThinhGiang = teacher.type === "Thỉnh giảng";
     
        if (assignments.length > 0 || hasHomeroom) {
            return [
                ...assignments.map((assignment, idx) => (
                    <TableRow key={assignment.id} className={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                        {idx === 0 && (
                            <>
                                <TableCell rowSpan={rowSpan} className={`${styles.stickyColumn} ${styles.firstColumn}`}>{index + 1}</TableCell>
                                <TableCell rowSpan={rowSpan} className={`${styles.stickyColumn} ${styles.secondColumn}`}>{teacher.name}</TableCell>
                                <TableCell rowSpan={rowSpan} style={{textAlign: 'center'}}>{teacher.teachingSubjects}</TableCell>
                                <TableCell rowSpan={rowSpan} style={{textAlign: 'center'}}>{teacher.type}</TableCell>
                                <TableCell rowSpan={rowSpan} style={{textAlign: 'center'}}>{isThinhGiang ? '-' : teacher.basicTeachingLessons}</TableCell>
                                <TableCell rowSpan={rowSpan} style={{textAlign: 'center'}}>{isThinhGiang ? '-' : teacher.totalReducedLessons}</TableCell>
                                <TableCell rowSpan={rowSpan} className={styles.reductionCell}>
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
                                <TableCell rowSpan={rowSpan} style={{textAlign: 'center'}}>{isThinhGiang ? '-' : teacher.finalBasicTeachingLessons}</TableCell>
                                <TableCell rowSpan={rowSpan} style={{textAlign: 'center'}}>{isThinhGiang ? '-' : (teacher.declaredTeachingLessons || "Chưa khai báo")}</TableCell>
                                <TableCell rowSpan={rowSpan} style={{textAlign: 'center'}}>{isThinhGiang ? '-' : `${calculateCompletionPercentage(teacher.declaredTeachingLessons, teacher.finalBasicTeachingLessons)}%`}</TableCell>
                                <TableCell rowSpan={rowSpan} style={{textAlign: 'center'}}>{isThinhGiang ? '-' : calculateExcessLessons(teacher.declaredTeachingLessons, teacher.finalBasicTeachingLessons)}</TableCell>
                                <TableCell rowSpan={rowSpan} style={{textAlign: 'center'}}>{teacher.totalAssignment || "Chưa khai báo"}</TableCell>
                            </>
                        )}
                        <TableCell>{assignment.className}</TableCell>
                        <TableCell>{assignment.subjectName}</TableCell>
                        <TableCell style={{textAlign: 'center'}}>
                            {isEditing ? (
                                <TextField
                                    value={editValue[assignment.id] || ''}
                                    onChange={(e) => setEditValue(prev => ({
                                        ...prev,
                                        [assignment.id]: e.target.value
                                    }))}
                                    type="number"
                                    size="small"
                                    style={{ width: '80px' }}
                                    InputProps={{
                                        inputProps: { 
                                            min: 0,
                                            max: maxLessons[assignment.id] || 0 
                                        }
                                    }}
                                />
                            ) : (
                                assignment.completedLessons
                            )}
                        </TableCell>
                        {isEditMode && (
                            <TableCell style={{textAlign: 'center'}}>
                                {maxLessons[assignment.id] || '-'}
                            </TableCell>
                        )}
                        {deletingTeacherId && (
                            <TableCell style={{ width: '60px', textAlign: 'center' }}>
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
                            <TableCell rowSpan={rowSpan}>
                                <div className={styles.actionButtons}>
                                    {isEditing ? (
                                        <div className={styles.buttonsContainer}>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleSaveEdit(teacher._id)}
                                                disabled={actionLoading}
                                            >
                                                <SaveIcon style={{ color: "#4caf50" }}/>
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    setEditingAssignment(null);
                                                    setEditValue({});
                                                    setIsEditMode(false);
                                                }}
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
                                                onClick={() => handleStartEdit(teacher._id)}
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
                )),
                teacher.homeroomInfo && (
                    <TableRow key={`homeroom-${teacher._id}`} className={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                        <TableCell>{teacher.homeroomInfo.className}</TableCell>
                        <TableCell>CC-SHL</TableCell>
                        <TableCell style={{textAlign: 'center'}}>36</TableCell>
                        {isEditMode && <TableCell style={{textAlign: 'center'}}>-</TableCell>}
                        {deletingTeacherId && <TableCell style={{textAlign: 'center'}}></TableCell>}
                    </TableRow>
                )
            ].filter(Boolean);
        } else {
            return (
                <TableRow className={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
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
                    {isEditMode && <TableCell>-</TableCell>}
                    {deletingTeacherId && (
                        <TableCell style={{ width: '60px', textAlign: 'center' }}>
                        </TableCell>
                    )}
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
            );
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
                                <Typography variant="h4">{teachers.reduce((sum, teacher) => sum + (teacher.totalAssignment || 0), 0)}</Typography>
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
                                style={{ marginRight: '10px', fontWeight:'bold', borderRadius: '26px' }}
                            >
                                Tạo phân công
                            </Button>
                            <ExportDepartmentTeachers 
                                departmentId={teacher?.department?._id} 
                                departmentName={currentDepartment}
                            />
                            <Link to="/class-statistics" style={{ textDecoration: 'none', marginLeft: '10px' }}>
                                <Button startIcon={<SchoolIcon />} style={{backgroundColor: '#41a06f',borderRadius: '26px', fontWeight: 'bold'}} variant="contained">
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
                                <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Bộ môn</TableCell>
                                <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Hình thức GV</TableCell>
                                <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết chuẩn</TableCell>
                                <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết giảm trừ</TableCell>
                                <TableCell className={`${styles.tableHeader} ${styles.mediumWidth}`}>Nội dung giảm</TableCell>
                                <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết chuẩn sau khi giảm trừ</TableCell>
                                <TableCell className={`${styles.tableHeader} ${styles.fixedWidth2}`}>Số tiết hoàn thành nhiệm vụ (Tiết chuẩn x3)</TableCell>
                                <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Tỉ lệ hoàn thành</TableCell>
                                <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết hoàn thành nhiệm vụ dư</TableCell>
                                <TableCell className={`${styles.tableHeader} ${styles.fixedWidth2}`}>Tổng số tiết được phân công để tính thù lao</TableCell>
                                <TableCell className={`${styles.tableHeader} ${styles.mediumWidth}`}>Mã lớp</TableCell>
                                <TableCell className={`${styles.tableHeader} ${styles.mediumWidth}`}>Môn học</TableCell>
                                <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết khai báo</TableCell>
                                {isEditMode && <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`}>Số tiết tối đa</TableCell>}
                                {deletingTeacherId && <TableCell className={`${styles.tableHeader} ${styles.fixedWidth}`} style={{ width: '60px' }}>Chọn</TableCell>}
                                <TableCell className={`${styles.tableHeader} ${styles.actionColumn}`}>Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredTeachers.map((teacher, index) => renderAssignments(teacher, index))}
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

                    const filteredTeachers = teachersData.filter(t => !excludedIds.includes(t._id));
                    const updatedTeachers = updateTeachersWithCorrectReductions(filteredTeachers);
                    setTeachers(updatedTeachers);
                    setAboveThresholdCount(aboveCount);
                    setBelowThresholdCount(belowCount);

                    const assignmentsPromises = updatedTeachers.map(teacher => 
                        getAllAssignmentTeachers(teacher._id)
                    );
                    const assignmentsResults = await Promise.all(assignmentsPromises);
                    const assignmentsMap = {};
                    updatedTeachers.forEach((teacher, index) => {
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