import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/images/pho-thong-nang-khieu-logo.jpg';
import '../../css/Login.css';
import { authService } from '../../services/authServices';

const clientID = "772775577887-mid4fgus3v3k22i6r30me6dpgkv1e8j8.apps.googleusercontent.com";

const Login = () => {
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const checkLoginTime = () => {
    const now = new Date();
    const vietnamTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const deadlineTime = new Date('2024-07-16T00:00:00');
    deadlineTime.setHours(deadlineTime.getHours() + 7); // Adjust for Vietnam time (UTC+7)
    return vietnamTime < deadlineTime;
  };

  const isAdminEmail = (email) => {
    const adminEmails = ['dnvu.ctv@ptnk.edu.vn', 'hmthong@ptnk.edu.vn'];
    return adminEmails.includes(email);
  };

  const onLoginSuccess = async (credentialResponse) => {
    const decoded = jwtDecode(credentialResponse.credential);
    
    if (!decoded.email.endsWith('@ptnk.edu.vn')) {
      setErrorMessage('Đăng nhập không hợp lệ! Vui lòng dùng email ptnk.edu.vn');
      return;
    }

    // if (!checkLoginTime() && !isAdminEmail(decoded.email)) {
    //   setErrorMessage('Đã hết hạn đăng ký');
    //   return;
    // }
  
    try {
      const result = await authService.checkUser({
        email: decoded.email,
        googleId: decoded.sub,
        name: decoded.name
      });
      
      if (result.success) {
        setErrorMessage('');
        if (result.isAdmin) {
          navigate('/admin-dashboard');
        } else {
          navigate('/dashboard');
        }
      } else {
        setErrorMessage('Đăng nhập thất bại. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Error during login:', error);
      if (error.response && error.response.status === 404) {
        const teacherInfo = error.response.data.teacherInfo;
        setErrorMessage(
          `Không tìm thấy thông tin giáo viên\nHọ và tên: ${teacherInfo.name}\nEmail: ${teacherInfo.email}`
        );
      } else {
        setErrorMessage('Đăng nhập thất bại. Vui lòng thử lại.');
      }
    }
  };

  const onLoginFailure = (error) => {
    console.log("LOGIN FAILED! Error: ", error);
    setErrorMessage('Đăng nhập thất bại. Vui lòng thử lại.');
  };

  return (
    <>
      <Helmet>
        <title>Đăng nhập</title>
        <meta name="description" content="Trang đăng nhập" />
      </Helmet>
      <GoogleOAuthProvider clientId={clientID}>
        <div className="login-container">
          <div className="login-box">
            <img src={logo} alt="Pho Thong Nang Khieu Logo" className="login-logo" />
            <h1 className="login-title">Đăng nhập</h1>
            <p className="login-subtitle">Hệ thống đăng ký môn học dành cho khối 10</p>
            <p className="login-subtitle">Hãy đăng nhập bằng tài khoản email ptnk.edu.vn</p>
            {errorMessage && (
              <p className="error-message">
                {errorMessage.split('\n').map((line, index) => (
                  <span key={index} className={line.includes('Họ và tên') || line.includes('Email') ? 'student-info' : ''}>
                    {line}<br />
                  </span>
                ))}
              </p>
            )}
            <div id="signInButton">
              <GoogleLogin
                onSuccess={onLoginSuccess}
                onError={onLoginFailure}
              />
            </div>
          </div>
        </div>
      </GoogleOAuthProvider>
    </>
  );
};

export default Login;