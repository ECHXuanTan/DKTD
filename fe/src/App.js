import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Circles } from 'react-loader-spinner';
import './css/App.css';

const Login = lazy(() => import('./pages/auth/Login'));
const AdminDashboard = lazy(() => import('./pages/user/AdminDashboard'));
const AdminActionResultScreen = lazy(() => import('./pages/user/AdminResultDashboard'));
const AdminResultDetail = lazy(() => import('./pages/user/AdminResultDetails'));
const AdminClassScreen = lazy(() => import('./pages/user/AdminClassScreen'));
const AdminDepartment = lazy(() => import('./pages/user/AdminDepartment'));

const MinistryDeclare = lazy(() => import('./pages/Ministry/MinistryDeclareScreen'));
const ClassScreen = lazy(() => import('./pages/Ministry/ClassScreen'));
const TeacherScreen = lazy(() => import('./pages/Ministry/TeacherScreen'));
const SubjectScreen  = lazy(() => import('./pages/Ministry/SubjectScreen'));
const LeaderDeclare = lazy(() => import('./pages/Leader/LeaderDeclareScrenn'));
const TeacherDeclareScreen = lazy(() => import('./pages/Leader/TeacherDeclareScreen'));
const LeaderClassScreen = lazy(() => import('./pages/Leader/LeaderClassScreen'));

const MinistryTeacherStatic = lazy(() => import('./pages/Ministry/MinistryTeacherStatic'));
const MinistryClassStatistics = lazy(() => import('./pages/Ministry/MinistryClassStatistics'));
const MinistrySubjectStatistics = lazy(() => import('./pages/Ministry/MinistrySubjectStatistics'));

const LoadingScreen = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh' 
  }}>
    <Circles type="TailSpin" color="#00BFFF" height={80} width={80} />
  </div>
);

const App = () => {

  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Ignore key prop warnings
    if (args[0]?.includes?.('unique "key" prop')) {
      return;
    }
    // Ignore validateDOMNesting warnings
    if (args[0]?.includes?.('validateDOMNesting')) {
      return;
    }
    originalConsoleError.apply(console, args);
  };

  return (
    <HelmetProvider>
      <Router>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/admin-result" element={<AdminActionResultScreen />} />
            <Route path="/admin-action-result/:id" element={<AdminResultDetail />} />
            <Route path="/admin/class-statistics" element={<AdminClassScreen />} />
            <Route path="/admin-dashboard/department/:departmentId" element={<AdminDepartment />} />

            <Route path="/ministry-declare" element={<MinistryDeclare />} />
            <Route path="/ministry-class" element={<ClassScreen />} />
            <Route path="/ministry-teacher" element={<TeacherScreen />} />
            <Route path="/ministry-subject" element={<SubjectScreen />} />
            <Route path="/ministry/teacher-statistics" element={<MinistryTeacherStatic />} />
            <Route path="/ministry/class-statistics" element={<MinistryClassStatistics />} />
            <Route path="/ministry/subject-statistics" element={<MinistrySubjectStatistics />} />

            <Route path="/leader-declare" element={<LeaderDeclare />} />
            <Route path="/declare-teacher/:id" element={<TeacherDeclareScreen />} />
            <Route path="/leader/class-statistics" element={<LeaderClassScreen />} />
            {/* <Route path="/leader/warning" element={<LeaderWarning />} /> */}
          </Routes>
        </Suspense>
      </Router>
    </HelmetProvider>
  );
};

export default App;