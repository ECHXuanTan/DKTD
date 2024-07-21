import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { getUser, logout } from '../../services/authServices.js';
import Modal from 'react-modal';
import { Circles } from 'react-loader-spinner';
import '../../css/AdminDashboard.css';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';

Modal.setAppElement('#root');

const AdminDashboard = () => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const userData = await getUser();
        if (!userData || !userData.user.isAdmin) {
          navigate('/dashboard');
        } else {
          setAdmin(userData.user);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setErrorMessage('Error loading admin data. Please try again.');
        setShowModal(true);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleManageResults = () => {
    navigate('/admin-result');
  };

  const closeModal = () => {
    setShowModal(false);
    setErrorMessage('');
    navigate('/login');
  };

  const renderAdminInfo = () => {
    if (admin.email === 'dnvu.ctv@ptnk.edu.vn') {
      return (
        <>
          <p><strong>Họ và tên:</strong> Đặng Nguyên Vũ</p>
          <p><strong>Email:</strong> dnvu.ctv@ptnk.edu.vn</p>
          <p><strong>Chức vụ:</strong> Cộng tác viên Tổ Phát triển chương trình đào tạo và Đảm bảo chất lượng</p>
        </>
      );
    } else if (admin.email === 'hmthong@ptnk.edu.vn') {
      return (
        <>
          <p><strong>Họ và tên:</strong> Hoàng Minh Thông</p>
          <p><strong>Email:</strong> hmthong@ptnk.edu.vn</p>
          <p><strong>Chức vụ:</strong> Tổ trưởng Tổ Phát triển chương trình đào tạo và Đảm bảo chất lượng</p>
        </>
      );
    } else {
      return (
        <>
          <p><strong>Họ và tên:</strong> {admin.name}</p>
          <p><strong>Email:</strong> {admin.email}</p>
        </>
      );
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
        <title>Admin</title>
        <meta name="description" content="Trang quản trị kết quả đăng ký môn học" />
      </Helmet>
      <Header />
      <div className="admin-dashboard">
      <h1>Trang quản lý kết quả khai báo tiết dạy giáo viên <br></br>Học kì 1 - Năm học 2024 - 2025</h1>
      {admin && (
        <>
          <div className="admin-info">
            <h2>Thông tin quản trị viên:</h2>
            {renderAdminInfo()}
          </div>
          <div className="admin-actions">
            <button className="manage-results-button" onClick={handleManageResults}>
              Quản lý kết quả khai báo
            </button>
            <button className="manage-results-logout-button" onClick={handleLogout}>
              Đăng xuất
            </button>
          </div>
        </>
      )}
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

export default AdminDashboard;
