import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getResultById } from '../../services/resultServices';
import { getUser } from '../../services/authServices.js';
import '../../css/ActionResult.css';
import { Circles } from 'react-loader-spinner';

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
          // Redirect based on user role
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
        } else {
         
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

  const handleBack = () => {
    navigate('/admin-result/');
  };

  const renderEntityInfo = () => {
    if (result.entityType === 'Teacher') {
      const teacherName = result.action === 'DELETE' 
        ? result.dataBefore?.name 
        : result.dataAfter?.name;
      return (
        <p><strong>Giáo viên được chỉnh sửa:</strong> {teacherName || 'Không có thông tin'}</p>
      );
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
      return (
        <>
          <p><strong>Lớp:</strong> {assignmentData.class.name}</p>
          <p><strong>Môn học:</strong> {assignmentData.subject.name}</p>
          <p><strong>Giáo viên:</strong> {assignmentData.teacher.name}</p>
        </>
      );
    }
    return null;
  };

  const translateAction = (action) => {
    switch (action) {
      case 'CREATE':
        return 'Tạo mới';
      case 'UPDATE':
        return 'Cập nhật';
      case 'DELETE':
        return 'Xóa';
      default:
        return action;
    }
  };

  const translateEntityType = (type) => {
    switch (type) {
      case 'Teacher':
        return 'Giáo viên';
      case 'TeacherAssignment':
        return 'Khai báo giảng dạy';
      case 'Class':
        return 'Lớp học';
      default:
        return type;
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
      subjects: 'Các môn học',
      completedLessons: 'Số tiết được phân công',
      class: 'Lớp',
      subject: 'Môn học',
      teacher: 'Giáo viên'
    };
    return translations[field] || field;
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    return new Date(dateString).toLocaleDateString('vi-VN', options);
  };

  const renderChanges = (data) => {
    if (!data) return <p>Không có dữ liệu</p>;

    if (Array.isArray(data)) {
      return data.map((classData, index) => (
        <div key={index} className="class-info">
          <h3>Lớp {index + 1}: {classData.name}</h3>
          {renderSingleClassChanges(classData)}
        </div>
      ));
    } else {
      return renderSingleClassChanges(data);
    }
  };

  const renderSingleClassChanges = (data) => {
    const changes = [];
    let relevantFields = [];

    if (result.entityType === 'Class') {
      relevantFields = ['name', 'grade', 'campus', 'subjects'];
    } else if (result.entityType === 'Teacher') {
      relevantFields = ['name', 'email', 'phone', 'position', 'department', 'isLeader', 'type',
                        'totalAssignment', 'lessonsPerWeek', 'teachingWeeks', 'basicTeachingLessons'];
    } else if (result.entityType === 'TeacherAssignment') {
      relevantFields = ['class', 'subject', 'teacher', 'completedLessons'];
    }

    relevantFields.forEach(field => {
      if (data[field] !== undefined) {
        if (field === 'subjects' && Array.isArray(data[field])) {
          changes.push(
            <div key={field}>
              <strong>{translateField(field)}:</strong>
              {renderSubjectsTable(data[field])}
            </div>
          );
        } else if (['class', 'subject', 'teacher'].includes(field)) {
          changes.push(
            <p key={field}>
              <strong>{translateField(field)}:</strong> {data[field].name}
            </p>
          );
        } else {
          changes.push(
            <p key={field}>
              <strong>{translateField(field)}:</strong> {data[field].toString()}
            </p>
          );
        }
      }
    });

    return changes.length > 0 ? changes : <p>Không có thay đổi</p>;
  };

  const renderSubjectsTable = (subjects) => {
    if (!subjects || subjects.length === 0) return <p>Không có dữ liệu môn học</p>;

    const rows = [];
    for (let i = 0; i < subjects.length; i += 2) {
      rows.push(
        <tr key={i} style={{ backgroundColor: i % 4 === 0 ? 'white' : '#e3f6f5' }}>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>{subjects[i].subjectName}</td>
          <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{subjects[i].lessonCount}</td>
          {subjects[i + 1] && (
            <>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{subjects[i + 1].subjectName}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{subjects[i + 1].lessonCount}</td>
            </>
          )}
        </tr>
      );
    }

    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
        <thead>
          <tr style={{ backgroundColor: '#5585b5', color: 'white' }}>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Môn học</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>Số tiết</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Môn học</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>Số tiết</th>
          </tr>
        </thead>
        <tbody>
          {rows}
        </tbody>
      </table>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Circles type="TailSpin" color="#00BFFF" height={80} width={80} />
      </div>
    );
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="subject-result-container">
      {result && (
        <div className="result-info">
          <Link to="/admin-result" style={{ textDecoration: 'none', paddingBottom: '5px', fontSize: '20px'}}>
            <ArrowBackIcon/>
          </Link>
          <h1>Chi tiết hành động</h1>
          <h2>Thông tin người thực hiện</h2>
          <p><strong>Tên giáo viên:</strong> {result.user.name}</p>
          <p><strong>Email:</strong> {result.user.email}</p>
          <p><strong>Chức vụ:</strong> {result.user.teacher.position}</p>
          <p><strong>Tổ bộ môn:</strong> {result.user.teacher.department.name}</p>

          <h2>Thông tin hành động</h2>
          <p><strong>Loại hành động:</strong> {translateAction(result.action)}</p>
          <p><strong>Thời gian:</strong> {formatDate(result.timestamp)}</p>
          <p><strong>Đối tượng tác động:</strong> {translateEntityType(result.entityType)}</p>
          {renderEntityInfo()}

          <h2>Nội dung thay đổi</h2>
          {result.action === 'CREATE' && (
            <div className="changes">
              <h3>Dữ liệu được tạo:</h3>
              {renderChanges(result.dataAfter)}
            </div>
          )}
          {result.action === 'UPDATE' && (
            <div className="changes">
              <h3>Dữ liệu trước khi cập nhật:</h3>
              {renderChanges(result.dataBefore)}
              <h3>Dữ liệu sau khi cập nhật:</h3>
              {renderChanges(result.dataAfter)}
            </div>
          )}
          {result.action === 'DELETE' && (
            <div className="changes">
              <h3>Dữ liệu đã xóa:</h3>
              {renderChanges(result.dataBefore)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminResultDetail;