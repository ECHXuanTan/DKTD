import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { getUser, logout } from '../../services/authServices.js';
import { getTeacherByEmail } from '../../services/teacherService.js';
import { useNavigate } from 'react-router-dom';
import Modal from 'react-modal';
import { Circles } from 'react-loader-spinner';
import '../../css/Dashboard.css';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';

Modal.setAppElement('#root');

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserAndTeacher = async () => {
      try {
        const userData = await getUser();
        setUser(userData);
        
        if (userData) {
          if (userData.user.isAdmin) {
            navigate('/admin-dashboard');
            return;
          }
          const teacherData = await getTeacherByEmail();
          setTeacher(teacherData);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setErrorMessage(error.message);
        setShowModal(true);
        setLoading(false); 
      }
    };

    fetchUserAndTeacher();
  }, [navigate]);

  const closeModal = () => {
    setShowModal(false);
    setErrorMessage('');
    navigate('/login');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeclare = () => {
    if (teacher.department.name === 'Tổ Giáo vụ – Đào tạo') {
      navigate('/ministry-declare');
    } else {
      navigate('/leader-declare');
    }
  };

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
        <title>Trang chủ</title>
        <meta name="description" content="Trang đăng ký môn học trường Phổ Thông Năng Khiếu - ĐHQG" />
      </Helmet>
      <Header />
      <div className="dashboard">
        {user && teacher ? (
          <>
            <h1>Chào mừng giáo viên {teacher.name} đến với trang khai báo tiết dạy!</h1>
            <div className="profile-info">
              <h2>Thông tin chi tiết:</h2>
              <p><strong>Họ và tên:</strong> {teacher.name}</p>
              <p><strong>Email:</strong> {teacher.email}</p>
              <p><strong>Số điện thoại:</strong> {teacher.phone}</p>
              <p><strong>Tổ bộ môn:</strong> {teacher.department.name}</p>
              <p><strong>Chức vụ:</strong> {teacher.position}</p>
            </div>
            <div className="button-container">
              <button className="register-button" onClick={handleDeclare}>
                {teacher.department.name === 'Tổ Giáo vụ – Đào tạo' ? 'Khai báo số tiết dạy cho Tổ bộ môn' : 'Khai báo số tiết dạy cho giáo viên'}
              </button>
              <button className="logout-button" onClick={handleLogout}>Đăng xuất</button>
            </div>
          </>
        ) : null}
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
      </div>
      <Footer />
    </>
  );
};

export default Dashboard;
