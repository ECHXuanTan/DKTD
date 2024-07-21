import React from 'react';
import logo from '../assets/images/pho-thong-nang-khieu-logo.png';
import '../css/Header.css';

function Header() {
    return (
      <header className="header">
        <div className="logo-container">
          <img src={logo} alt="Phổ Thông Năng Khiếu Logo" className="logo" />
        </div>
      </header>
    );
  };

  export default Header;
  