import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, Link } from 'react-router-dom';
import Modal from 'react-modal';
import { Circles } from 'react-loader-spinner';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from '../../css/Ministry/Class.module.css';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import { getUser } from '../../services/authServices.js';
import { getClasses, createClass, createClasses } from '../../services/classServices.js';
import { getSubject } from '../../services/subjectServices.js';
import { Box, Typography, TextField, Button, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Select, MenuItem } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { read, utils, write } from 'xlsx';
import FileSaver from 'file-saver';

Modal.setAppElement('#root');

const ClassScreen = () => { 
    const [user, setUser] = useState(null);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [gradeFilter, setGradeFilter] = useState('');
    const [showAddOptions, setShowAddOptions] = useState(false);
    const [showSingleClassModal, setShowSingleClassModal] = useState(false);
    const [showMultiClassModal, setShowMultiClassModal] = useState(false);
    const [excelFile, setExcelFile] = useState(null);
    const [excelData, setExcelData] = useState(null);
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [isCreatingClass, setIsCreatingClass] = useState(false);
    const [isUploadingExcel, setIsUploadingExcel] = useState(false);

    const [newClass, setNewClass] = useState({
        name: '',
        grade: '',
        campus: '',
        subjects: [{ subjectId: '', lessonCount: '', isEditing: true }]
    });
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
                setErrorMessage(error.message);
                setShowModal(true);
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

    const handleAddClass = () => {
        setShowAddOptions(true);
    };

    const handleAddSingleClass = () => {
        setShowAddOptions(false);
        setShowSingleClassModal(true);
    };

    const handleAddMultiClass = () => {
        setShowAddOptions(false);
        setShowMultiClassModal(true);
    };

    const handleInputChange = (event, index) => {
        const { name, value } = event.target;
        if (name === 'subjectId') {
            const updatedSubjects = [...newClass.subjects];
            const oldSubjectId = updatedSubjects[index].subjectId;
            updatedSubjects[index] = { ...updatedSubjects[index], [name]: value };
            setNewClass(prevState => ({
                ...prevState,
                subjects: updatedSubjects
            }));
            setSelectedSubjects(prev => {
                const newSelected = prev.filter(id => id !== value);
                if (oldSubjectId) {
                    newSelected.push(oldSubjectId);
                }
                return newSelected;
            });
        } else if (name === 'lessonCount') {
            const updatedSubjects = [...newClass.subjects];
            updatedSubjects[index] = { ...updatedSubjects[index], [name]: value };
            setNewClass(prevState => ({
                ...prevState,
                subjects: updatedSubjects
            }));
        } else {
            setNewClass(prevState => ({
                ...prevState,
                [name]: value
            }));
        }
    };

    const handleAddSubject = () => {
        const lastSubject = newClass.subjects[newClass.subjects.length - 1];
        if (!lastSubject.subjectId || !lastSubject.lessonCount) {
            toast.error('Vui lòng chọn môn học và nhập số tiết trước khi thêm môn mới.');
            return;
        }
        setNewClass(prevState => ({
            ...prevState,
            subjects: [...prevState.subjects, { subjectId: '', lessonCount: '', isEditing: true }]
        }));
    };

    const handleRemoveSubject = (index) => {
        setNewClass(prevState => {
            const updatedSubjects = prevState.subjects.filter((_, i) => i !== index);
            const removedSubject = prevState.subjects[index];
            if (removedSubject.subjectId) {
                setSelectedSubjects(prev => prev.filter(id => id !== removedSubject.subjectId));
            }
            if (updatedSubjects.length === 0) {
                return {
                    ...prevState,
                    subjects: [{ subjectId: '', lessonCount: '', isEditing: true }]
                };
            }
            return {
                ...prevState,
                subjects: updatedSubjects
            };
        });
    };

    const handleEditSubject = (index) => {
        setNewClass(prevState => {
            const updatedSubjects = [...prevState.subjects];
            updatedSubjects[index] = { ...updatedSubjects[index], isEditing: true };
            return {
                ...prevState,
                subjects: updatedSubjects
            };
        });
    };
    
    const handleSaveSubject = (index) => {
        const subject = newClass.subjects[index];
        if (!subject.subjectId || !subject.lessonCount) {
            toast.error('Vui lòng chọn môn học và nhập số tiết trước khi lưu.');
            return;
        }
        setNewClass(prevState => {
            const updatedSubjects = [...prevState.subjects];
            updatedSubjects[index] = { ...updatedSubjects[index], isEditing: false };
            return {
                ...prevState,
                subjects: updatedSubjects
            };
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const isAllSubjectsValid = newClass.subjects.every(subject => subject.subjectId && subject.lessonCount);
        if (!isAllSubjectsValid) {
            toast.error('Vui lòng điền đầy đủ thông tin cho tất cả các môn học.');
            return;
        }
        setIsCreatingClass(true);
        try {
            const classData = {
                ...newClass,
                grade: parseInt(newClass.grade),
                subjects: newClass.subjects.map(subject => ({
                    subjectId: subject.subjectId,
                    lessonCount: parseInt(subject.lessonCount)
                }))
            };
            await createClass(classData);
            setShowSingleClassModal(false);
            toast.success('Tạo lớp mới thành công!');
            const updatedClassData = await getClasses();
            setClasses(updatedClassData);
        } catch (error) {
            console.error('Error creating class:', error);
            if (error.response && error.response.data && error.response.data.message.includes('Tên lớp đã tồn tại')) {
                toast.error(`Lớp ${newClass.name} đã tồn tại.`);
            } else {
                toast.error('Đã có lỗi xảy ra');
            }
        } finally {
            setIsCreatingClass(false);
        }
    };

    const handleDownloadTemplate = () => {
        const subjectOrder = [
            'Toán', 'Tin học', 'Vật lý', 'Hóa học', 'Sinh học', 'Công nghệ', 'Tiếng Anh',
            'Ngữ văn', 'Lịch sử', 'Địa lý', 'Giáo dục kinh tế - Pháp luật', 'Giáo dục Quốc phòng', 'Thể dục'
        ];

        const data = [
            ['Tên lớp', 'Khối', 'Cơ sở', ...subjectOrder],
            ['10A1', '10', 'Quận 5', 45, 30, 30, 30, 30, 15, 45, 40, 30, 30, 15, 15, 30],
            ['11B2', '11', 'Thủ Đức', 45, 30, 30, 30, 30, 15, 45, 40, 30, 30, 15, 15, 30],
        ];

        const ws = utils.aoa_to_sheet(data);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Template");

        const excelBuffer = write(wb, { bookType: 'xlsx', type: 'array' });
        const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        FileSaver.saveAs(dataBlob, 'class_template.xlsx');
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        setExcelFile(file);

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = utils.sheet_to_json(worksheet);
            
            // Process the data to match the expected format
            const processedData = jsonData.map(row => {
                const { 'Tên lớp': name, 'Khối': grade, 'Cơ sở': campus, ...subjects } = row;
                return { name, grade, campus, ...subjects };
            });
            
            setExcelData(processedData);
        };
        reader.readAsArrayBuffer(file);
    };

    const handleExcelUpload = async () => {
        if (!excelFile) {
            toast.error('Vui lòng chọn file Excel trước khi tải lên');
            return;
        }

        const expectedSubjects = [
            'Toán', 'Tin học', 'Vật lý', 'Hóa học', 'Sinh học', 'Công nghệ', 'Tiếng Anh',
            'Ngữ văn', 'Lịch sử', 'Địa lý', 'Giáo dục kinh tế - Pháp luật', 'Giáo dục Quốc phòng', 'Thể dục'
        ];

        // Process the Excel data
        const processedClasses = excelData.map(classData => {
            const { name, grade, campus, ...subjectData } = classData;
            const subjects = [];

            for (const subjectName of expectedSubjects) {
                const lessonCount = parseInt(subjectData[subjectName], 10);
                if (!isNaN(lessonCount) && lessonCount > 0) {
                    subjects.push({
                        name: subjectName,
                        lessonCount: lessonCount
                    });
                }
            }

            return { name, grade, campus, subjects };
        });

        // Validate the processed data
        const invalidClasses = processedClasses.filter(classData => 
            !classData.name || !classData.grade || !classData.campus || classData.subjects.length === 0
        );

        if (invalidClasses.length > 0) {
            const invalidClassNames = invalidClasses.map(c => c.name || 'Unnamed').join(', ');
            toast.error(`Các lớp sau không hợp lệ hoặc không có môn học: ${invalidClassNames}`);
            return;
        }

        setIsUploadingExcel(true);
        try {
            await createClasses(processedClasses);
            toast.success('Tải lên và tạo lớp thành công!');
            const updatedClassData = await getClasses();
            setClasses(updatedClassData);
            setShowMultiClassModal(false);
            setExcelData(null);
            setExcelFile(null);
        } catch (error) {
            console.error('Error uploading Excel file:', error);
            if (error.response && error.response.data && error.response.data.message) {
                const errorMessage = error.response.data.message;
                if (errorMessage.includes('Tên lớp đã tồn tại')) {
                    const classNames = errorMessage.split(':')[1].trim();
                    toast.error(`Các lớp sau đã tồn tại: ${classNames}`);
                } else {
                    toast.error(errorMessage);
                }
            } else {
                toast.error('Đã có lỗi xảy ra khi tải lên file');
            }
        } finally {
            setIsUploadingExcel(false);
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
                                style={{ width: '200px',  }}
                            >
                                <MenuItem value="">Tất cả khối</MenuItem>
                                {uniqueGrades.map((grade) => (
                                    <MenuItem key={grade} value={grade}>Khối {grade}</MenuItem>
                                ))}
                            </Select>
                            <Select
                                value=""
                                onChange={(event) => {
                                    if (event.target.value === 'single') {
                                        handleAddSingleClass();
                                    } else if (event.target.value === 'multi') {
                                        handleAddMultiClass();
                                    }
                                }}
                                displayEmpty
                                style={{ width: '200px' }}
                            >
                                <MenuItem value="" disabled>Thêm lớp mới</MenuItem>
                                <MenuItem value="single">Thêm 1 lớp</MenuItem>
                                <MenuItem value="multi">Thêm nhiều lớp</MenuItem>
                            </Select>
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
        
            {/* Modal for adding a single class */}
            <Modal
                isOpen={showSingleClassModal}
                onRequestClose={() => setShowSingleClassModal(false)}
                contentLabel="Tạo Lớp Mới"
                className={styles.modal}
                overlayClassName={styles.overlay}
            >
                <h2 className={styles.modalTitle}>Tạo Lớp Mới</h2>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label htmlFor="name">Tên lớp:</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={newClass.name}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="grade">Khối:</label>
                        <select
                            id="grade"
                            name="grade"
                            value={newClass.grade}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">Chọn khối</option>
                            <option value="10">Khối 10</option>
                            <option value="11">Khối 11</option>
                            <option value="12">Khối 12</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="campus">Cơ sở:</label>
                        <select
                            id="campus"
                            name="campus"
                            value={newClass.campus}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">Chọn cơ sở</option>
                            <option value="Quận 5">Quận 5</option>
                            <option value="Thủ Đức">Thủ Đức</option>
                        </select>
                    </div>
                    <div className={styles.subjectsContainer}>
                        <h3>Danh sách môn học</h3>
                        {newClass.subjects.map((subject, index) => (
                            <div key={index} className={styles.subjectItem}>
                                {!subject.isEditing ? (
                                    <div className={styles.subjectSummary}>
                                        <span>{subjects.find(s => s._id === subject.subjectId)?.name} - {subject.lessonCount} tiết</span>
                                        <div>
                                            <button type="button" onClick={() => handleEditSubject(index)} className={styles.editButton}>
                                                <EditIcon />
                                            </button>
                                            <button type="button" onClick={() => handleRemoveSubject(index)} className={styles.removeButton}>
                                                <DeleteIcon />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className={styles.subjectInputGroup}>
                                            <label htmlFor={`subjectId-${index}`}>Môn học:</label>
                                            <select
                                                id={`subjectId-${index}`}
                                                name="subjectId"
                                                value={subject.subjectId}
                                                onChange={(e) => handleInputChange(e, index)}
                                                required
                                            >
                                                <option value="">Chọn môn học</option>
                                                {subjects
                                                    .filter(subj => !selectedSubjects.includes(subj._id))
                                                    .map((subj) => (
                                                        <option key={subj._id} value={subj._id}>
                                                            {subj.name}
                                                        </option>
                                                    ))
                                                }
                                            </select>
                                        </div>
                                        <div className={styles.subjectInputGroup}>
                                            <label htmlFor={`lessonCount-${index}`}>Số tiết:</label>
                                            <input
                                                type="number"
                                                id={`lessonCount-${index}`}
                                                name="lessonCount"
                                                value={subject.lessonCount}
                                                onChange={(e) => handleInputChange(e, index)}
                                                required
                                            />
                                        </div>
                                        <button type="button" onClick={() => handleSaveSubject(index)} className={styles.saveButton}>
                                            Lưu
                                        </button>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                    <button type="button" onClick={handleAddSubject} className={styles.addButton}>
                       Thêm môn học
                    </button>
                    <div className={styles.formActions}>
                        <button type="submit" className={styles.submitButton} disabled={isCreatingClass}>
                            {isCreatingClass ? (
                                <Circles type="TailSpin" color="#FFF" height={20} width={20} />
                            ) : (
                                'Tạo Lớp'
                            )}
                        </button>
                        <button type="button" onClick={() => setShowSingleClassModal(false)} className={styles.cancelButton}>Hủy</button>
                    </div>
                </form>
            </Modal>        

            {/* Modal for uploading Excel file */}
            <Modal
                isOpen={showMultiClassModal}
                onRequestClose={() => {
                    setShowMultiClassModal(false);
                    setExcelData(null);
                    setExcelFile(null);
                }}
                contentLabel="Tải lên file Excel"
                className={styles.modalExcel}
                overlayClassName={styles.overlay}
            >
                <h2 className={styles.modalTitle}>Tải lên file Excel</h2>
                <form onSubmit={(e) => { e.preventDefault(); }} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label htmlFor="excel-upload">Chọn file Excel: <span style={{color: "red"}}>(File tải lên phải có các cột giống như file mẫu)</span></label>
                        <input
                            type="file"
                            id="excel-upload"
                            accept=".xlsx, .xls"
                            onChange={handleFileUpload}
                        />
                    </div>
                    {excelData && (
    <div className={styles.previewContainer}>
        <div className={styles.previewHeader}>
            <h3>Xem trước dữ liệu:</h3>
            <button 
                onClick={() => {
                    setExcelData(null);
                    setExcelFile(null);
                }}
                className={styles.closePreviewButton}
            >
                Đóng xem trước
            </button>
        </div>
        <div className={styles.tableWrapper}>
            <table className={styles.previewTable}>
                <thead>
                    <tr>
                        <th>Tên lớp</th>
                        <th>Khối</th>
                        <th>Cơ sở</th>
                        <th>Toán</th>
                        <th>Tin học</th>
                        <th>Vật lý</th>
                        <th>Hóa học</th>
                        <th>Sinh học</th>
                        <th>Công nghệ</th>
                        <th>Tiếng Anh</th>
                        <th>Ngữ văn</th>
                        <th>Lịch sử</th>
                        <th>Địa lý</th>
                        <th>Giáo dục kinh tế - Pháp luật</th>
                        <th>Giáo dục Quốc phòng</th>
                        <th>Thể dục</th>
                    </tr>
                </thead>
                <tbody>
                    {excelData.map((row, index) => (
                        <tr key={index}>
                            <td>{row['name'] || '-'}</td>
                            <td>{row['grade'] || '-'}</td>
                            <td>{row['campus'] || '-'}</td>
                            <td className={!row['Toán'] ? styles.emptyCell : ''}>{row['Toán'] || '-'}</td>
                            <td className={!row['Tin học'] ? styles.emptyCell : ''}>{row['Tin học'] || '-'}</td>
                            <td className={!row['Vật lý'] ? styles.emptyCell : ''}>{row['Vật lý'] || '-'}</td>
                            <td className={!row['Hóa học'] ? styles.emptyCell : ''}>{row['Hóa học'] || '-'}</td>
                            <td className={!row['Sinh học'] ? styles.emptyCell : ''}>{row['Sinh học'] || '-'}</td>
                            <td className={!row['Công nghệ'] ? styles.emptyCell : ''}>{row['Công nghệ'] || '-'}</td>
                            <td className={!row['Tiếng Anh'] ? styles.emptyCell : ''}>{row['Tiếng Anh'] || '-'}</td>
                            <td className={!row['Ngữ văn'] ? styles.emptyCell : ''}>{row['Ngữ văn'] || '-'}</td>
                            <td className={!row['Lịch sử'] ? styles.emptyCell : ''}>{row['Lịch sử'] || '-'}</td>
                            <td className={!row['Địa lý'] ? styles.emptyCell : ''}>{row['Địa lý'] || '-'}</td>
                            <td className={!row['Giáo dục kinh tế - Pháp luật'] ? styles.emptyCell : ''}>{row['Giáo dục kinh tế - Pháp luật'] || '-'}</td>
                            <td className={!row['Giáo dục Quốc phòng'] ? styles.emptyCell : ''}>{row['Giáo dục Quốc phòng'] || '-'}</td>
                            <td className={!row['Thể dục'] ? styles.emptyCell : ''}>{row['Thể dục'] || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
)}
                    <div className={styles.formActions}>
                        <button type="button" onClick={handleDownloadTemplate} className={styles.downloadButton}>
                            Tải xuống mẫu Excel
                        </button>
                        {excelData && (
                            <button type="button" onClick={handleExcelUpload} className={styles.submitButton} disabled={isUploadingExcel}>
                                {isUploadingExcel ? (
                                    <Circles type="TailSpin" color="#FFF" height={20} width={20} />
                                ) : (
                                    <>
                                        <CloudUploadIcon /> Tải lên
                                    </>
                                )}
                            </button>
                        )}
                        <button 
                            type="button" 
                            onClick={() => {
                                setShowMultiClassModal(false);
                                setExcelData(null);
                                setExcelFile(null);
                            }} 
                            className={styles.cancelButton}
                        >
                            Hủy
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
}

export default ClassScreen;