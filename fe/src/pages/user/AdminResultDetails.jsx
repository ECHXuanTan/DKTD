// AdminResultDetail.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getResultById } from '../../services/resultServices';
import { getUser } from '../../services/authServices.js';
import { Circles } from 'react-loader-spinner';
import styles from '../../css/Admin/AdminResultDetail.module.css';
import { Helmet } from 'react-helmet-async';

const AdminResultDetail = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAdminAndStats = async () => {
      try {
        const userData = await getUser();
        if (!userData || userData.user.role !== 2) {
          switch(userData.user.role) {
            case 1:
              navigate('/ministry-dashboard');
              break;
            case 0:
              navigate('/user-dashboard');
              break;
            default:
              navigate('/login');
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminAndStats();
  }, [navigate]);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const data = await getResultById(id);
        setResult(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchResult();
  }, [id]);

  const renderEntityInfo = () => {
    if (result.entityType === 'Teacher') {
      if (Array.isArray(result.dataAfter) || Array.isArray(result.dataBefore)) {
        const teacherData = result.action === 'DELETE' ? result.dataBefore : result.dataAfter;
        const count = Array.isArray(teacherData) ? teacherData.length : 0;
        return (
          <p><strong>Số giáo viên được {translateAction(result.action).toLowerCase()}:</strong> {count} giáo viên</p>
        );
      } else {
        const teacherName = result.action === 'DELETE' 
          ? result.dataBefore?.name 
          : result.dataAfter?.name;
        return (
          <p><strong>Giáo viên được chỉnh sửa:</strong> {teacherName || 'Không có thông tin'}</p>
        );
      }
    } else if (result.entityType === 'Class') {
      const classData = result.action === 'DELETE' ? result.dataBefore : result.dataAfter;
      if (Array.isArray(classData)) {
        return (
          <p><strong>Số lớp được chỉnh sửa:</strong> {classData.length}</p>
        );
      } else {
        return (
          <p><strong>Lớp được chỉnh sửa:</strong> {classData?.name || 'Không có thông tin'}</p>
        );
      }
    } else if (result.entityType === 'TeacherAssignment') {
      const assignmentData = result.action === 'DELETE' ? result.dataBefore : result.dataAfter;
      if (Array.isArray(assignmentData)) {
        const uniqueTeachers = new Set();
        const uniqueClasses = new Set();
  
        assignmentData.forEach(assignment => {
          uniqueTeachers.add(assignment.teacher.name);
          uniqueClasses.add(assignment.class.name);
        });
  
        return (
          <>
            <p><strong>Số phân công được {translateAction(result.action).toLowerCase()}:</strong> {assignmentData.length}</p>
            <p><strong>Giáo viên:</strong> {Array.from(uniqueTeachers).join(', ')}</p>
            <p><strong>Các lớp:</strong> {Array.from(uniqueClasses).join(', ')}</p>
          </>
        );
      } else {
        return (
          <>
            <p><strong>Lớp:</strong> {assignmentData.class.name}</p>
            <p><strong>Môn học:</strong> {assignmentData.subject.name}</p>
            <p><strong>Giáo viên:</strong> {assignmentData.teacher.name}</p>
          </>
        );
      }
    }
    return null;
  };

  const translateAction = (action) => {
    switch (action) {
      case 'CREATE': return 'Tạo mới';
      case 'UPDATE': return 'Cập nhật';
      case 'DELETE': return 'Xóa';
      default: return action;
    }
  };

  const translateEntityType = (type) => {
    switch (type) {
      case 'Teacher': return 'Giáo viên';
      case 'TeacherAssignment': return 'Khai báo giảng dạy';
      case 'Class': return 'Lớp học';
      default: return type;
    }
  };

  const translateField = (field) => {
    const translations = {
      name: 'Tên',
      email: 'Email',
      phone: 'Số điện thoại',
      position: 'Chức vụ',
      department: 'Tổ bộ môn',
      isLeader: 'Là tổ trưởng',
      type: 'Loại giáo viên',
      totalAssignment: 'Tổng số tiết được phân công',
      lessonsPerWeek: 'Số tiết/tuần',
      teachingWeeks: 'Số tuần dạy',
      basicTeachingLessons: 'Số tiết cơ bản',
      grade: 'Khối',
      campus: 'Cơ sở',
      subject: 'Môn học',
      completedLessons: 'Số tiết được phân công',
      class: 'Lớp',
      lessonCount: 'Số tiết'
    };
    return translations[field] || field;
  };

  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    };
    return new Date(dateString).toLocaleDateString('vi-VN', options);
  };

  const renderSingleClassChanges = (data) => {
    if (!data) return <p>Không có dữ liệu</p>;
  
    return (
      <>
      <Helmet>
        <title>Kết quả khai báo tiết dạy</title>
        <meta name="description" content="Trang quản trị kết quả khai báo tiết dạy" />
      </Helmet>
      <div className={styles.classGrid}>
        <div className={styles.infoColumn}>
          <div className={styles.infoCard}>
            <h4>Thông tin cơ bản</h4>
            <p className={styles.changeItem}>
              <strong>Khối:</strong> {data.grade}
            </p>
            <p className={styles.changeItem}>
              <strong>Cơ sở:</strong> {data.campus}
            </p>
            <p className={styles.changeItem}>
              <strong>Sĩ số:</strong> {data.size}
            </p>
          </div>
        </div>
        <div className={styles.infoColumn}>
          <div className={styles.infoCard}>
            <h4>Thông tin môn học</h4>
            {data.subjects?.map((subjectData, index) => (
              <div key={index}>
                <p className={styles.changeItem}>
                  <strong>Môn học:</strong> {subjectData.subjectName}
                </p>
                <p className={styles.changeItem}>
                  <strong>Tổng số tiết:</strong> {subjectData.lessonCount}
                </p>
                <p className={styles.changeItem}>
                  <strong>Số tiết/tuần:</strong> {subjectData.periodsPerWeek}
                </p>
                <p className={styles.changeItem}>
                  <strong>Số tuần:</strong> {subjectData.numberOfWeeks}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      </>
      
    );
  };

  const renderTeacherChanges = (data) => {
    if (!data) return <p>Không có dữ liệu</p>;
  
    if (Array.isArray(data)) {
      return data.map((teacherData, index) => (
        <div key={index} className={styles.teacherInfo}>
          <h3>Giáo viên {index + 1}: {teacherData.name}</h3>
          {renderSingleTeacherChanges(teacherData)}
        </div>
      ));
    } else {
      return renderSingleTeacherChanges(data);
    }
  };
  
  const renderSingleTeacherChanges = (data) => {
    if (!data) return <p>Không có dữ liệu</p>;
  
    return (
      <div className={styles.teacherGrid}>
        <div className={styles.infoColumn}>
          <div className={styles.infoCard}>
            <h4>Thông tin cá nhân</h4>
            <p className={styles.changeItem}>
              <strong>Họ và tên:</strong> {data.name}
            </p>
            <p className={styles.changeItem}>
              <strong>Email:</strong> {data.email}
            </p>
            <p className={styles.changeItem}>
              <strong>Số điện thoại:</strong> {data.phone || 'Chưa cập nhật'}
            </p>
            <p className={styles.changeItem}>
              <strong>Chức vụ:</strong> {data.position}
            </p>
            <p className={styles.changeItem}>
              <strong>Tổ bộ môn:</strong> {data.department}
            </p>
            <p className={styles.changeItem}>
              <strong>Hình thức giáo viên:</strong> {data.type}
            </p>
          </div>
        </div>
        <div className={styles.infoColumn}>
          <div className={styles.infoCard}>
            <h4>Thông tin giảng dạy</h4>
            <p className={styles.changeItem}>
              <strong>Môn học giảng dạy:</strong> {data.teachingSubjects}
            </p>
            <p className={styles.changeItem}>
              <strong>Số tiết cơ bản:</strong> {data.basicTeachingLessons}
            </p>
            <p className={styles.changeItem}>
              <strong>Số tiết/tuần:</strong> {data.lessonsPerWeek}
            </p>
            <p className={styles.changeItem}>
              <strong>Số tuần dạy:</strong> {data.teachingWeeks}
            </p>
            <p className={styles.changeItem}>
              <strong>Tổng số tiết giảm trừ:</strong> {data.totalReducedLessons}
            </p>
            <p className={styles.changeItem}>
              <strong>Tổng số tiết được phân công:</strong> {data.totalAssignment}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderSingleAssignmentChanges = (data) => {
    if (!data) return <p>Không có dữ liệu</p>;
  
    return (
      <div className={styles.assignmentGrid}>
        <div className={styles.infoColumn}>
          <div className={styles.infoCard}>
            <h4>Thông tin lớp và môn học</h4>
            <p className={styles.changeItem}>
              <strong>Lớp:</strong> {data.class.name}
            </p>
            <p className={styles.changeItem}>
              <strong>Môn học:</strong> {data.subject.name}
            </p>
          </div>
        </div>
        <div className={styles.infoColumn}>
          <div className={styles.infoCard}>
            <h4>Thông tin giảng dạy</h4>
            <p className={styles.changeItem}>
              <strong>Giáo viên:</strong> {data.teacher.name}
            </p>
            <p className={styles.changeItem}>
              <strong>Số tiết được phân công:</strong> {data.completedLessons}
            </p>
          </div>
        </div>
      </div>
    );
  };
  
  const renderAssignmentChanges = (data) => {
    if (!data) return <p>Không có dữ liệu</p>;
  
    if (Array.isArray(data)) {
      return data.map((assignmentData, index) => (
        <div key={index} className={styles.assignmentInfo}>
          <h3>Phân công {index + 1}</h3>
          {renderSingleAssignmentChanges(assignmentData)}
        </div>
      ));
    } else {
      return renderSingleAssignmentChanges(data);
    }
  };
  
  const renderChanges = (data) => {
    if (!data) return <p>Không có dữ liệu</p>;
    
    if (result.entityType === 'Teacher') {
      return renderTeacherChanges(data);
    } else if (result.entityType === 'Class') {
      return renderSingleClassChanges(data);
    } else if (result.entityType === 'TeacherAssignment') {
      return renderAssignmentChanges(data);
    }
    
    return <p>Loại dữ liệu không được hỗ trợ</p>;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Circles type="TailSpin" color="#00BFFF" height={80} width={80} />
      </div>
    );
  }

  if (error) {
    return <div className={styles.errorMessage}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      {result && (
        <div className={styles.resultInfo}>
          <Link to="/admin-result" className={styles.backLink}>
            <ArrowBackIcon/>
          </Link>
          <h1 className={styles.title}>Chi tiết hành động</h1>
          
          <section className={styles.section}>
            <h2>Thông tin người thực hiện</h2>
            <p><strong>Tên giáo viên:</strong> {result.user.name}</p>
            <p><strong>Email:</strong> {result.user.email}</p>
            <p><strong>Chức vụ:</strong> {result.user.teacher.position}</p>
            <p><strong>Tổ bộ môn:</strong> {result.user.teacher.department.name}</p>
          </section>

          <section className={styles.section}>
            <h2>Thông tin hành động</h2>
            <p><strong>Loại hành động:</strong> {translateAction(result.action)}</p>
            <p><strong>Thời gian:</strong> {formatDate(result.timestamp)}</p>
            <p><strong>Đối tượng tác động:</strong> {translateEntityType(result.entityType)}</p>
            {renderEntityInfo()}
          </section>

          <section className={styles.section}>
            <h2>Nội dung thay đổi</h2>
            {result.action === 'CREATE' && (
              <div className={styles.changes}>
                <h3>Dữ liệu được tạo:</h3>
                {renderChanges(result.dataAfter)}
              </div>
            )}
            {result.action === 'UPDATE' && (
              <div className={styles.changes}>
                <h3>Dữ liệu trước khi cập nhật:</h3>
                {renderChanges(result.dataBefore)}
                <h3 style={{marginTop: '5px'}}>Dữ liệu sau khi cập nhật:</h3>
                {renderChanges(result.dataAfter)}
              </div>
            )}
            {result.action === 'DELETE' && (
              <div className={styles.changes}>
                <h3>Dữ liệu đã xóa:</h3>
                {renderChanges(result.dataBefore)}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminResultDetail;