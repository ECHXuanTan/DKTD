import React, { useState } from 'react';
import logo from '../assets/images/logo ptnk.svg';
import '../css/Header.css';
import { IconButton, Menu, MenuItem } from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import { logout } from '../services/authServices';

function Header() {
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenu = (event) => {
      setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
      setAnchorEl(null);
  };

  const handleLogout = async () => {
      await logout();
      handleClose();
  };

  return (
      <header className="header">
          <div className="logo-container">
              <img src={logo} alt="Phổ Thông Năng Khiếu Logo" className="logo" />
          </div>
          <div className="user-menu">
              <IconButton
                  size="large"
                  aria-label="account of current user"
                  aria-controls="menu-appbar"
                  aria-haspopup="true"
                  onClick={handleMenu}
                  color="inherit"
              >
                  <AccountCircleIcon />
              </IconButton>
              <Menu
                  id="menu-appbar"
                  anchorEl={anchorEl}
                  anchorOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                  }}
                  keepMounted
                  transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                  }}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
              >
                  <MenuItem onClick={handleLogout}>Đăng xuất</MenuItem>
              </Menu>
          </div>
      </header>
  );
}

export default Header;  