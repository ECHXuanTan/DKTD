import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, Link } from 'react-router-dom';
import Modal from 'react-modal';
import { Circles } from 'react-loader-spinner';
import '../../css/Ministry/Dashboard.css';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import { getAllDepartment, updateDepartmentAssignmentTime } from '../../services/departmentService.js';
import { getUser } from '../../services/authServices.js';
import { FaEdit } from 'react-icons/fa';
import { Typography } from '@mui/material';
import { tokens } from '../../css/theme/theme';


Modal.setAppElement('#root');

const MinistryDeclare = () => { 
    const [user, setUser] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [newAssignmentTime, setNewAssignmentTime] = useState('');
    const [newSalaryPrice, setNewSalaryPrice] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [inputError, setInputError] = useState('');
    const navigate = useNavigate();

    const colors = tokens(/* your theme mode */);

    useEffect(() => {
        const fetchUserAndDepartment = async () => {
          try {
            const userData = await getUser();
            setUser(userData);
            
            if (userData) {
              if (userData.user.isAdmin) {
                navigate('/admin-dashboard');
                return;
              }
              const departmentData = await getAllDepartment();
              setDepartments(departmentData.filter(dept => dept.name !== "Tổ Giáo vụ – Đào tạo"));
            }
            setLoading(false);
          } catch (error) {
            console.error('Error fetching data:', error);
            setErrorMessage(error.message);
            setShowModal(true);
            setLoading(false); 
          }
        };
    
        fetchUserAndDepartment();
      }, [navigate]);
    
    const closeModal = () => {
        setShowModal(false);
        setErrorMessage('');
        navigate('/login');
    };

    const openUpdateModal = (department) => {
        setSelectedDepartment(department);
        setNewAssignmentTime(department.totalAssignmentTime ? department.totalAssignmentTime.toString() : '');
        setNewSalaryPrice(department.salaryPrice ? department.salaryPrice.toString() : '');
        setShowUpdateModal(true);
        setInputError('');
    };

    const closeUpdateModal = () => {
        setShowUpdateModal(false);
        setSelectedDepartment(null);
        setNewAssignmentTime('');
        setNewSalaryPrice('');
        setInputError('');
    };

    const validateInput = (assignmentTime, salaryPrice) => {
        if (assignmentTime === '' || salaryPrice === '') {
            setInputError('Vui lòng nhập đầy đủ thông tin');
            return false;
        }
        if (isNaN(assignmentTime) || isNaN(salaryPrice)) {
            setInputError('Vui lòng chỉ nhập số');
            return false;
        }
        const numAssignmentTime = parseFloat(assignmentTime);
        const numSalaryPrice = parseFloat(salaryPrice);
        if (numAssignmentTime <= 0 || numSalaryPrice <= 0) {
            setInputError('Số tiết dạy và tiền lương phải lớn hơn 0');
            return false;
        }
        setInputError('');
        return true;
    };

    const handleInputChange = (e, setter) => {
        const value = e.target.value;
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setter(value);
        }
    };

    const handleUpdate = () => {
        if (validateInput(newAssignmentTime, newSalaryPrice)) {
            setShowConfirmModal(true);
        }
    };

    const confirmUpdate = async () => {
        try {
            await updateDepartmentAssignmentTime(selectedDepartment._id, newAssignmentTime, newSalaryPrice);
            const updatedDepartments = departments.map(dept =>
                dept._id === selectedDepartment._id
                    ? { ...dept, totalAssignmentTime: newAssignmentTime, salaryPrice: newSalaryPrice, updatedAt: new Date() }
                    : dept
            );
            setDepartments(updatedDepartments);
            setShowConfirmModal(false);
            closeUpdateModal();
        } catch (error) {
            console.error('Error updating department:', error);
            setErrorMessage('Không thể cập nhật. Vui lòng thử lại.');
            setShowModal(true);
        }
    };

    const formatNumber = (number) => {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    const getCompletionStatus = (declared, total) => {
        if (declared === total) return "completed";
        if (declared > 0 && declared < total) return "inProgress";
        return "notStarted";
    };

    if (loading) {
        return (
            <div className="loading-container">
                <Circles type="TailSpin" color="#00BFFF" height={80} width={80} />
            </div>
        );
    }
    
    return(
        <>
        <Helmet>
            <title>Trang khai báo tổng số tiết dạy</title>
        </Helmet>
        <Header/>
        <div className="dashboard-ministry">
            <div className="dashboard-header">
                <h1>Danh sách các tổ bộ môn</h1>
                <Link to="/dashboard" className="back-button">Quay về Dashboard</Link>
            </div>
            <table className="department-table">
                <thead>
                    <tr>
                        <th>Tên tổ bộ môn</th>
                        <th>Tổng số tiết dạy</th>
                        <th>Tiền lương 1 tiết dạy</th>
                        <th>Thời gian cập nhật</th>
                        <th>Số tiết đã khai báo</th>
                        <th>Tình trạng hoàn thành</th>
                        <th>Cập nhật</th>
                    </tr>
                </thead>
                <tbody>
                    {departments.map((dept) => {
                        const status = getCompletionStatus(dept.declaredTeachingTime, dept.totalAssignmentTime);
                        return (
                            <tr key={dept._id}>
                                <td>{dept.name}</td>
                                <td>{dept.totalAssignmentTime || "Chưa khai báo"}</td>
                                <td>
                                    {dept.salaryPrice ? `${formatNumber(dept.salaryPrice)} VND` : "Chưa khai báo"}
                                </td>
                                <td>
                                    {dept.totalAssignmentTime ? new Date(dept.updatedAt).toLocaleString() : "-"}
                                </td>
                                <td>
                                    {dept.totalAssignmentTime 
                                        ? `${dept.declaredTeachingTime}/${dept.totalAssignmentTime}` 
                                        : "Chưa khai báo"}
                                </td>
                                <td>
                                    <Typography color={colors.grey[100]}>
                                        {status === "completed"
                                            ? "Hoàn thành"
                                            : status === "inProgress"
                                            ? "Đang tiến hành"
                                            : "Chưa bắt đầu"}
                                    </Typography>
                                </td>
                                <td>
                                    <FaEdit className="edit-icon" onClick={() => openUpdateModal(dept)} />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <Modal
                isOpen={showModal}
                onRequestClose={closeModal}
                contentLabel="Error Message"
                className="modal"
                overlayClassName="modal-overlay"
            >
                <h2>Thông báo</h2>
                <p>{errorMessage}</p>
                <button onClick={closeModal}>Đóng</button>
            </Modal>
            <Modal
                isOpen={showUpdateModal}
                onRequestClose={closeUpdateModal}
                contentLabel="Update Department"
                className="modal"
                overlayClassName="modal-overlay"
            >
                <h2>Cập nhật thông tin tổ bộ môn</h2>
                <p>Tên tổ bộ môn: {selectedDepartment?.name}</p>
                <input
                    type="text"
                    value={newAssignmentTime}
                    onChange={(e) => handleInputChange(e, setNewAssignmentTime)}
                    placeholder="Nhập tổng số tiết dạy"
                />
                <input
                    type="text"
                    value={newSalaryPrice}
                    onChange={(e) => handleInputChange(e, setNewSalaryPrice)}
                    placeholder="Nhập tiền lương 1 tiết dạy"
                />
                {inputError && <p className="error-message">{inputError}</p>}
                <div>
                    <button onClick={handleUpdate}>Cập nhật</button>
                    <button onClick={closeUpdateModal}>Hủy</button>
                </div>
            </Modal>
            <Modal
                isOpen={showConfirmModal}
                onRequestClose={() => setShowConfirmModal(false)}
                contentLabel="Confirm Update"
                className="modal"
                overlayClassName="modal-overlay"
            >
                <h2>Xác nhận cập nhật</h2>
                <p>Bạn có muốn khai báo thông tin:</p>
                <p>Tổ bộ môn: {selectedDepartment?.name}</p>
                <p>Số tiết dạy: {newAssignmentTime}</p>
                <p>Tiền lương 1 tiết dạy: {newSalaryPrice} VND</p>
                <div>
                    <button onClick={confirmUpdate}>Xác nhận</button>
                    <button onClick={() => setShowConfirmModal(false)}>Hủy</button>
                </div>
            </Modal>
        </div>
        <Footer/>
        </>
    );
};

export default MinistryDeclare;