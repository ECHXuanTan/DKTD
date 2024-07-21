import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllResult } from '../../services/resultServices';
import { getUser, logout } from '../../services/authServices';
import { getDepartmentNames } from '../../services/departmentService';
import '../../css/AdminResult.css';
import { Box, Typography, useTheme, TextField, InputAdornment, Button, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Container } from 'react-bootstrap';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { tokens } from '../../css/theme/theme';
import { Circles } from 'react-loader-spinner';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import { Helmet } from 'react-helmet';

export default function AdminActionResultScreen() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
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
          if (!userData.user.isAdmin) {
            navigate('/dashboard');
            return;
          }
          const resultsData = await getAllResult();
          setResults(resultsData.existingResult);
          
          // Fetch department names
          const departmentNames = await getDepartmentNames();
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBack = () => {
    navigate('/admin-dashboard');
  };

  const getActionClass = (action) => {
    switch (action) {
      case 'Tạo mới':
        return 'create-action';
      case 'Cập nhật':
        return 'update-action';
      case 'Xóa':
        return 'delete-action';
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

  const columns = [
    { field: 'index', headerName: 'STT', flex: 0.2 },
    { 
      field: 'action', 
      headerName: 'Hành động', 
      flex: 0.5,
      renderCell: (params) => (
        <Box
          className={`action-button ${getActionClass(params.value)}`}
        >
          {params.value}
        </Box>
      )
    },
    { field: 'userName', headerName: 'Tên giáo viên', flex: 0.8 },
    { field: 'position', headerName: 'Chức vụ', flex: 0.5 },
    { field: 'department', headerName: 'Tổ bộ môn', flex: 0.8 },
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
    timestamp: new Date(record.timestamp).toLocaleString(),
  }));

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
        <title>Kết quả khai báo tiết dạy</title>
        <meta name="description" content="Trang quản trị kết quả khai báo tiết dạy" />
      </Helmet>
      <Header/>
      <div className="page_wrapper">
        <section className="result_section">
          <Container>
            <Box m="20px">
              <Typography variant="h4" mb={2} style={{ marginBottom:'20px'}}>
                Lịch sử hành động người dùng
              </Typography>
              <Box display="flex" flexDirection="column" mb={2}>
                <Box display="flex" alignItems="center" mb={2}>
                  <TextField
                    type="date"
                    label="Ngày bắt đầu"
                    value={startDate}
                    onChange={handleStartDateChange}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    sx={{ marginRight: 2 }}
                  />
                  <TextField
                    type="date"
                    label="Ngày kết thúc"
                    value={endDate}
                    onChange={handleEndDateChange}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    sx={{ marginRight: 2 }}
                  />
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
                    sx={{ backgroundColor: 'white', flexGrow: 0.3, marginRight: 2 }}
                  />
                  <Button variant="contained" onClick={handleBack} sx={{ backgroundColor: 'blue', marginRight: '10px' }}>Quay lại</Button>
                  <Button variant="contained" onClick={handleLogout} sx={{ backgroundColor: 'red' }}>Đăng xuất</Button>
                </Box>
                <Box display="flex" alignItems="center" mb={2}>
                  <FormControl sx={{ minWidth: 120, marginRight: 2 }}>
                      <InputLabel id="department-select-label">Tổ bộ môn</InputLabel>
                      <Select
                        labelId="department-select-label"
                        id="department-select"
                        value={selectedDepartment}
                        onChange={handleDepartmentChange}
                        label="Tổ bộ môn"
                      >
                        <MenuItem value="">
                          <em>Tất cả</em>
                        </MenuItem>
                        {departments.map((dept) => (
                          <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl sx={{ minWidth: 120, marginRight: 2 }}>
                      <InputLabel id="action-select-label">Hành động</InputLabel>
                      <Select
                        labelId="action-select-label"
                        id="action-select"
                        value={selectedAction}
                        onChange={handleActionChange}
                        label="Hành động"
                      >
                        <MenuItem value="">
                          <em>Tất cả</em>
                        </MenuItem>
                        <MenuItem value="Tạo mới">Tạo mới</MenuItem>
                        <MenuItem value="Cập nhật">Cập nhật</MenuItem>
                        <MenuItem value="Xóa">Xóa</MenuItem>
                      </Select>
                    </FormControl>
                </Box>
              </Box>
              {loading ? (
                <Typography>Đang tải...</Typography>
              ) : error ? (
                <Typography color="error">{error}</Typography>
              ) : (
                <Box
                  m="40px 0 0 0"
                  height="75vh"
                  sx={{
                    '& .MuiDataGrid-root': {
                      border: 'none',
                    },
                    '& .MuiDataGrid-cell': {
                      borderBottom: 'none',
                    },
                    '& .MuiDataGrid-columnHeaders': {
                      backgroundColor: colors.primary[800],
                      borderBottom: 'none',
                    },
                    '& .MuiDataGrid-virtualScroller': {
                      backgroundColor: colors.primary[400],
                    },
                    '& .MuiDataGrid-footerContainer': {
                      borderTop: 'none',
                      backgroundColor: colors.blueAccent[700],
                    },
                    '& .MuiCheckbox-root': {
                      color: `${colors.greenAccent[200]} !important`,
                    },
                    '& .row-odd': {
                      backgroundColor: 'white',
                    },
                    '& .row-even': {
                      backgroundColor: 'lightcyan',
                    },
                  }}
                >
                  {rows.length > 0 ? (
                    <DataGrid
                      rows={rows}
                      columns={columns}
                      getRowId={(row) => row.id}
                      getRowClassName={(params) =>
                        params.indexRelativeToCurrentPage % 2 === 0 ? 'row-even' : 'row-odd'
                      }
                    />
                  ) : (
                    <Typography variant="subtitle1" align="center">
                      Không có kết quả!
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </Container>
        </section>
      </div>
      <Footer />
    </>
  );
}