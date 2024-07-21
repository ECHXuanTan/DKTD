import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './pages/auth/Login';
import Dashboard from './pages/user/Dashboard';
import AdminDashboard from './pages/user/AdminDashboard';
import AdminActionResultScreen from './pages/user/AdminResultDashboard';
import AdminResultDetail from './pages/user/AdminResultDetails';
import MinistryDeclare from './pages/Ministry/MinistryDeclareScreen';
import LeaderDeclare from './pages/Leader/LeaderDeclareScrenn';
import './css/App.css';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/admin-result" element={<AdminActionResultScreen />} />
        <Route path="/admin-action-result/:id" element={<AdminResultDetail />} />
        <Route path="/ministry-declare" element={<MinistryDeclare />} />
        <Route path="/leader-declare" element={<LeaderDeclare />} />

      </Routes>
    </Router>
  );
};

export default App;
