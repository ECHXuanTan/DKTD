import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './pages/auth/Login';
import Dashboard from './pages/user/Dashboard';
import AdminDashboard from './pages/user/AdminDashboard';
import AdminActionResultScreen from './pages/user/AdminResultDashboard';
import AdminResultDetail from './pages/user/AdminResultDetails';
import MinistryDeclare from './pages/Ministry/MinistryDeclareScreen';
import ClassScreen from './pages/Ministry/ClassScreen';
import ClassDetail from './pages/Ministry/ClassDetails.Screen';
import TeacherScreen from './pages/Ministry/TeacherScreen';
import LeaderDeclare from './pages/Leader/LeaderDeclareScrenn';
import TeacherDeclareScreen from './pages/Leader/TeacherDeclareScreen';
import LeaderClassScreen from './pages/Leader/LeaderClassScreen';
import LeaderWarning from './pages/Leader/LeaderWarning';

import MinistryTeacherStatic from './pages/Ministry/MinistryTeacherStatic';
import MinistryClassStatistics from './pages/Ministry/MinistryClassStatistics';
import MinistrySubjectStatistics from './pages/Ministry/MinistrySubjectStatistics';
import TeacherWorkloadStatistics from './pages/Ministry/TeacherWorkloadStatistics';
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
        <Route path="/ministry-class" element={<ClassScreen />} />
        <Route path="/ministry-teacher" element={<TeacherScreen />} />
        <Route path="/class/:id" element={<ClassDetail />} />
        <Route path="/ministry/teacher-statistics" element={<MinistryTeacherStatic />} />
        <Route path="/ministry/teacher-warning" element={<TeacherWorkloadStatistics />} />
        <Route path="/ministry/class-statistics" element={<MinistryClassStatistics />} />
        <Route path="/ministry/subject-statistics" element={<MinistrySubjectStatistics />} />

        <Route path="/leader-declare" element={<LeaderDeclare />} />
        <Route path="/declare-teacher/:id" element={<TeacherDeclareScreen />} />
        <Route path="/leader/class-statistics" element={<LeaderClassScreen />} />
        <Route path="/leader/warning" element={<LeaderWarning />} />

      </Routes>
    </Router>
  );
};

export default App;
