import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAllResult } from '../../services/resultServices';
import { getUser } from '../../services/authServices';
import { getAllDepartment } from '../../services/departmentService';
import styles from '../../css/Admin/AdminActionResultScreen.module.css';
import { Box, Typography, TextField, InputAdornment, Button, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Circles } from 'react-loader-spinner';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import { Helmet } from 'react-helmet';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function AdminActionResultScreen() {
  const [user, setUser] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserAndResults = async () => {
      try {
        const userData = await getUser();
        setUser(userData);
       
        if (userData) {
          if (!userData || userData.user.role !== 2) {
           // Redirect based on user role
          switch(userData.user.role) {
            case 1:
              navigate('/ministry-dashboard');
              break;
            case 0:
              navigate('/user-dashboard');
              break;
            default:
              navigate('/login');
          }
          }
          const resultsData = await getAllResult();
          setResults(resultsData.existingResult);
          
          const departmentNames = await getAllDepartment();
          setDepartments(departmentNames);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message);
        setLoading(false);
      }
    };
    fetchUserAndResults();
  }, [navigate]);

  const handleStartDateChange = (event) => {
    setStartDate(event.target.value);
  };

  const handleEndDateChange = (event) => {
    setEndDate(event.target.value);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleDepartmentChange = (event) => {
    setSelectedDepartment(event.target.value);
  };

  const handleActionChange = (event) => {
    setSelectedAction(event.target.value);
  };

  const handleBack = () => {
    navigate('/admin-dashboard');
  };

  const getActionClass = (action) => {
    switch (action) {
      case 'Tạo mới':
        return styles.createAction;
      case 'Cập nhật':
        return styles.updateAction;
      case 'Xóa':
        return styles.deleteAction;
      default:
        return '';
    }
  };

  const translateAction = (action) => {
    switch (action) {
      case 'CREATE':
        return 'Tạo mới';
      case 'UPDATE':
        return 'Cập nhật';
      case 'DELETE':
        return 'Xóa';
      default:
        return action;
    }
  };

  const translateEntityType = (entityType) => {
    switch (entityType) {
      case 'Class':
        return 'Lớp học';
      case 'Teacher':
        return 'Giáo viên';
      case 'TeacherAssignment':
        return 'Khai báo';
      default:
        return entityType;
    }
  };

  const columns = [
    { field: 'index', headerName: 'STT', flex: 0.2 },
    { 
      field: 'action', 
      headerName: 'Hành động', 
      flex: 0.5,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box
          className={`${styles.actionButton} ${getActionClass(params.value)}`}
        >
          {params.value}
        </Box>
      )
    },
    { field: 'userName', headerName: 'Tên giáo viên', flex: 0.8 },
    { field: 'position', headerName: 'Chức vụ', flex: 0.5 },
    { field: 'department', headerName: 'Tổ bộ môn', flex: 0.8 },
    { field: 'entityType', headerName: 'Loại đối tượng', flex: 0.6 },
    { field: 'timestamp', headerName: 'Thời gian', flex: 0.8 },
    {
      field: 'actions',
      headerName: 'Xem chi tiết',
      headerAlign: 'center',
      align: 'center',
      flex: 0.4,
      renderCell: ({ row }) => {
        return (
          <VisibilityIcon
            onClick={() => navigate(`/admin-action-result/${row.id}`)}
            sx={{ cursor: 'pointer' }}
          />
        );
      },
    },
  ];

  const filteredRows = results.filter((record) => {
    const timestamp = new Date(record.timestamp);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    const userName = record.user.name.toLowerCase();
    const searchTerm = searchQuery.toLowerCase();
    const department = record.user.teacher ? record.user.teacher.department.name : 'N/A';

    const dateCondition =
      (start && end && timestamp >= start && timestamp <= end) ||
      (start && !end && timestamp >= start) ||
      (!start && end && timestamp <= end) ||
      (!start && !end);

    const searchCondition = userName.includes(searchTerm);
    const departmentCondition = selectedDepartment === '' || department === selectedDepartment;
    const actionCondition = selectedAction === '' || translateAction(record.action) === selectedAction;

    return dateCondition && searchCondition && departmentCondition && actionCondition;
  });

  const rows = filteredRows.map((record, index) => ({
    id: record._id,
    index: index + 1,
    action: translateAction(record.action),
    userName: record.user.name,
    position: record.user.teacher ? record.user.teacher.position : 'N/A',
    department: record.user.teacher ? record.user.teacher.department.name : 'N/A',
    entityType: translateEntityType(record.entityType),
    timestamp: new Date(record.timestamp).toLocaleString(),
  }));

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
        <title>Kết quả khai báo tiết dạy</title>
        <meta name="description" content="Trang quản trị kết quả khai báo tiết dạy" />
      </Helmet>
      <Header/>
      <div className={styles.pageWrapper}>
        <section className={styles.resultSection}>
          <Box m="20px">
            <Link to="/admin-dashboard" style={{ textDecoration: 'none', padding: '5px', fontSize: '20px' }}>
                <ArrowBackIcon />
            </Link>
            <Typography variant="h4" className={styles.sectionTitle}>
              Lịch sử hành động người dùng
            </Typography>
            <Box display="flex" flexDirection="column" mb={2}>
              <Box display="flex" alignItems="center" mb={2} className={styles.searchContainer}>
                <TextField
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Tìm kiếm theo tên giáo viên"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  className={styles.searchField}
                />
              </Box>
              <Box display="flex" alignItems="center" mb={2} className={styles.filterContainer}>
                <TextField
                  type="date"
                  label="Ngày bắt đầu"
                  value={startDate}
                  onChange={handleStartDateChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  className={styles.dateField}
                />
                <TextField
                  type="date"
                  label="Ngày kết thúc"
                  value={endDate}
                  onChange={handleEndDateChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  className={styles.dateField}
                />
                <FormControl className={styles.filterSelect}>
                  <InputLabel>Tổ bộ môn</InputLabel>
                  <Select
                    value={selectedDepartment}
                    onChange={handleDepartmentChange}
                    label="Tổ bộ môn"
                  >
                    <MenuItem value="">Tất cả</MenuItem>
                    {departments.map((dept) => (
                      <MenuItem key={dept._id} value={dept.name}>{dept.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl className={styles.filterSelect}>
                  <InputLabel>Hành động</InputLabel>
                  <Select
                    value={selectedAction}
                    onChange={handleActionChange}
                    label="Hành động"
                  >
                    <MenuItem value="">Tất cả</MenuItem>
                    <MenuItem value="Tạo mới">Tạo mới</MenuItem>
                    <MenuItem value="Cập nhật">Cập nhật</MenuItem>
                    <MenuItem value="Xóa">Xóa</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
            {error ? (
              <Typography color="error" className={styles.errorMessage}>{error}</Typography>
            ) : (
              <Box className={styles.dataGridContainer}>
                {rows.length > 0 ? (
                  <DataGrid
                    rows={rows}
                    columns={columns}
                    pageSize={10}
                    rowsPerPageOptions={[10]}
                    className={styles.dataGrid}
                    disableSelectionOnClick
                    getRowId={(row) => row.id}
                    getRowClassName={(params) =>
                      params.indexRelativeToCurrentPage % 2 === 0 ? styles.rowEven : styles.rowOdd
                    }
                  />
                ) : (
                  <Typography variant="subtitle1" align="center" className={styles.noResultsMessage}>
                    Không có kết quả!
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </section>
      </div>
      <Footer />
    </>
  );
}