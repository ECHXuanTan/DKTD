import React from 'react';
import '../css/Footer.css';

function Footer()  {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="footer">
      <p>Copyright {currentYear} © Trường Phổ Thông Năng Khiếu.</p>
      {/* <p>Fullstack Developer: Đào Xuân Tân</p> */}
    </footer>
  );
};

export default Footer;
