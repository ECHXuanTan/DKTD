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
      return (
        <p><strong>Giáo viên được chỉnh sửa:</strong> {result.dataBefore.name}</p>
      );
    } else if (result.entityType === 'Department') {
      return (
        <p><strong>Tổ bộ môn được chỉnh sửa:</strong> {result.dataBefore.name}</p>
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
      default:
        return type;
    }
  };

  const translateField = (field) => {
    const translations = {
      name: 'Tên',
      email: 'Email',
      phone: 'Số điện thoại',
      teachingHours: 'Số giờ dạy',
      salary: 'Lương',
      totalAssignmentTime: 'Tổng thời gian phân công',
      salaryPrice: 'Đơn giá lương'
    };
    return translations[field] || field;
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    return new Date(dateString).toLocaleDateString('vi-VN', options);
  };

  const renderChanges = (before, after) => {
    const changes = [];
    const relevantFields = result.entityType === 'Teacher' 
      ? ['name', 'email', 'phone', 'teachingHours', 'salary']
      : ['totalAssignmentTime', 'salaryPrice'];

    relevantFields.forEach(field => {
      if (before[field] !== after[field]) {
        changes.push(
          <p key={field}>
            <strong>{translateField(field)}:</strong> {before[field]} → {after[field]}
          </p>
        );
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
          {result.action === 'UPDATE' && (
            <div className="changes">
              {renderChanges(result.dataBefore, result.dataAfter)}
            </div>
          )}
          {result.action === 'CREATE' && (
            <div className="changes">
              <h3>Dữ liệu được tạo:</h3>
              {renderChanges({}, result.dataAfter)}
            </div>
          )}
          {result.action === 'DELETE' && (
            <div className="changes">
              <h3>Dữ liệu đã xóa:</h3>
              {renderChanges(result.dataBefore, {})}
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