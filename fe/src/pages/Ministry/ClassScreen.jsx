import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, Link } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { Circles } from 'react-loader-spinner';
import 'react-toastify/dist/ReactToastify.css';
import styles from '../../css/Ministry/Class.module.css';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import { getUser } from '../../services/authServices.js';
import { getClasses } from '../../services/classServices.js';
import { getSubject } from '../../services/subjectServices.js';
import { Box, Typography, TextField, Button, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Select, MenuItem } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SingleClassModal from './Component/SingleClassModal.jsx';
import MultiClassModal from './Component/MultiClassModal.jsx';

const ClassScreen = () => { 
    const [user, setUser] = useState(null);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [gradeFilter, setGradeFilter] = useState('');
    const [showSingleClassModal, setShowSingleClassModal] = useState(false);
    const [showMultiClassModal, setShowMultiClassModal] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserAndData = async () => {
            try {
                const userData = await getUser();
                setUser(userData);
                
                if (userData) {
                    if (userData.user && userData.user.isAdmin) {
                        navigate('/admin-dashboard');
                        return;
                    }
                    const classData = await getClasses();
                    setClasses(classData);
                    const subjectData = await getSubject();
                    setSubjects(subjectData);
                }
                setLoading(false);
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('Đã xảy ra lỗi khi tải dữ liệu');
                setLoading(false);
            }
        };
        fetchUserAndData();
    }, [navigate]);

    const handleSearchChange = (event) => {
        setSearchQuery(event.target.value);
    };

    const handleGradeFilterChange = (event) => {
        setGradeFilter(event.target.value);
    };

    const handleClassAdded = async () => {
        try {
            const updatedClassData = await getClasses();
            setClasses(updatedClassData);
            toast.success('Danh sách lớp đã được cập nhật');
        } catch (error) {
            console.error('Error refreshing classes:', error);
            toast.error('Không thể cập nhật danh sách lớp');
        }
    };

    const columns = [
        { field: 'index', label: 'STT', width: '5%' },
        { field: 'name', label: 'Tên lớp', width: '15%' },
        { field: 'grade', label: 'Khối', width: '10%' },
        { field: 'campus', label: 'Cơ sở', width: '10%' },
        { field: 'subjects', label: 'Môn học', width: '20%' },
        { field: 'lessonCount', label: 'Số tiết', width: '10%' },
        { field: 'updatedAt', label: 'Lần chỉnh sửa gần nhất', width: '10%' },
        { field: 'actions', label: 'Xem chi tiết', width: '10%', },
    ];

    const filteredRows = classes.filter((classItem) =>
        classItem.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (gradeFilter === '' || classItem.grade === parseInt(gradeFilter))
    );

    const rows = filteredRows.map((classItem, index) => {
        const rowSpan = classItem.subjects.length || 1;
        return classItem.subjects.map((subject, subjectIndex) => ({
            id: `${classItem._id}-${subject.subject._id}`,
            index: subjectIndex === 0 ? index + 1 : null,
            name: subjectIndex === 0 ? classItem.name : null,
            grade: subjectIndex === 0 ? classItem.grade : null,
            campus: subjectIndex === 0 ? classItem.campus : null,
            subjects: subject.subject.name,
            lessonCount: subject.lessonCount,
            updatedAt: subjectIndex === 0 ? new Date(classItem.updatedAt).toLocaleString() : null,
            actions: subjectIndex === 0 ? (
                <VisibilityIcon
                    onClick={() => navigate(`/class/${classItem._id}`)}
                    sx={{ cursor: 'pointer' }}
                />
            ) : null,
            isFirstRow: subjectIndex === 0,
            rowSpan: rowSpan,
        }));
    }).flat();

    const uniqueGrades = [...new Set(classes.map(classItem => classItem.grade))];

    if (loading) {
        return (
            <div className="loading-container">
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
            <ToastContainer />
            <div className={styles.classDashboardMinistry}>
                <Box m="20px">
                    <Link to="/ministry-declare" style={{ display: 'block', textDecoration: 'none', marginBottom: '5px', fontSize: '20px' }}>
                        <ArrowBackIcon />
                    </Link>
                    <Typography variant="h4" mb={2} className={styles.sectionTitle}>
                        Danh sách lớp học
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
                        <div style={{display: 'flex', gap: '20px'}}>
                            <Select
                                value={gradeFilter}
                                onChange={handleGradeFilterChange}
                                displayEmpty
                                style={{ width: '200px' }}
                            >
                                <MenuItem value="">Tất cả khối</MenuItem>
                                {uniqueGrades.map((grade) => (
                                    <MenuItem key={grade} value={grade}>Khối {grade}</MenuItem>
                                ))}
                            </Select>
                            <Button 
                                variant="contained" 
                                onClick={() => setShowSingleClassModal(true)}
                                style={{ marginRight: '10px' }}
                            >
                                Thêm 1 lớp
                            </Button>
                            <Button 
                                variant="contained" 
                                onClick={() => setShowMultiClassModal(true)}
                            >
                                Thêm nhiều lớp
                            </Button>
                        </div>
                    </Box>
                    <TableContainer component={Paper} className={styles.tableContainer}>
                        <Table className={styles.table}>
                            <TableHead>
                                <TableRow>
                                    {columns.map((column) => (
                                        <TableCell key={column.field} style={{ width: column.width }}>
                                            {column.label}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((row) => (
                                    <TableRow key={row.id}>
                                        {columns.map((column) => {
                                            if (row.isFirstRow || column.field === 'subjects' || column.field === 'lessonCount') {
                                                return (
                                                    <TableCell 
                                                        key={`${row.id}-${column.field}`}
                                                        rowSpan={column.field === 'subjects' || column.field === 'lessonCount' ? 1 : row.rowSpan}
                                                    >
                                                        {row[column.field]}
                                                    </TableCell>
                                                );
                                            }
                                            return null;
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            </div>
            <Footer />
        
            <SingleClassModal
                isOpen={showSingleClassModal}
                onClose={() => setShowSingleClassModal(false)}
                onClassAdded={handleClassAdded}
                subjects={subjects}
            />

            <MultiClassModal
                isOpen={showMultiClassModal}
                onClose={() => setShowMultiClassModal(false)}
                onClassesAdded={handleClassAdded}
            />
        </>
    );
}

export default ClassScreen;