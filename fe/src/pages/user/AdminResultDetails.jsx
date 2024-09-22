import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getResultById } from '../../services/resultServices';
import '../../css/ActionResult.css';
import { Circles } from 'react-loader-spinner';

const AdminResultDetail = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

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
      const className = result.action === 'DELETE'
        ? result.dataBefore?.name
        : result.dataAfter?.name;
      return (
        <p><strong>Lớp được chỉnh sửa:</strong> {className || 'Không có thông tin'}</p>
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
      case 'Department':
        return 'Tổ bộ môn';
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
      subjects: 'Các môn học'
    };
    return translations[field] || field;
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    return new Date(dateString).toLocaleDateString('vi-VN', options);
  };

  const renderChanges = (data) => {
    if (!data) return <p>Không có dữ liệu</p>;

    const changes = [];
    const relevantFields = result.entityType === 'Class'
      ? ['name', 'grade', 'campus', 'subjects']
      : ['name', 'email', 'phone', 'position', 'department', 'isLeader', 'type',
         'totalAssignment', 'lessonsPerWeek', 'teachingWeeks', 'basicTeachingLessons'];

    relevantFields.forEach(field => {
      if (data[field] !== undefined) {
        if (field === 'subjects' && Array.isArray(data[field])) {
          changes.push(
            <div key={field}>
              <strong>{translateField(field)}:</strong>
              <ul>
                {data[field].map((subject, index) => (
                  <li key={index}>
                    Môn học ID: {subject.subject}, Số tiết: {subject.lessonCount}
                  </li>
                ))}
              </ul>
            </div>
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
      <h1>Chi tiết hành động</h1>
      {result && (
        <div className="result-info">
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
      <div className="button-container">
        <button className="register-button" onClick={handleBack}>Quay lại</button>
      </div>
    </div>
  );
};

export default AdminResultDetail;