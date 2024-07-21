import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, Link } from 'react-router-dom';
import Modal from 'react-modal';
import { Circles } from 'react-loader-spinner';
import '../../css/Leader/Dashboard.css';
import Header from '../../components/Header.js';
import Footer from '../../components/Footer.js';
import { getUser } from '../../services/authServices.js';
import { getDepartmentTeachers, createTeacher, updateTeacher, deleteTeacher } from '../../services/teacherService.js';
import { FaEdit, FaPlus } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

Modal.setAppElement('#root');

// Configure pdfMake
pdfMake.vfs = pdfFonts.pdfMake.vfs;
pdfMake.fonts = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf'
  }
};

const LeaderDeclare = () => { 
    const [user, setUser] = useState(null);
    const [teachers, setTeachers] = useState([]);
    const [currentDepartment, setCurrentDepartment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTeacher, setNewTeacher] = useState({ name: '', email: '', phone: '', teachingHours: '' });
    const [inputErrors, setInputErrors] = useState({});
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [teacherToDelete, setTeacherToDelete] = useState(null);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserAndTeachers = async () => {
          try {
            const userData = await getUser();
            setUser(userData);
            
            if (userData) {
                console.log(userData);
              if (userData.user.isAdmin) {
                navigate('/admin-dashboard');
                return;
              }
              const teachersData = await getDepartmentTeachers();
              setTeachers(teachersData.data.sort((a, b) => a.name.localeCompare(b.name)));
              if (teachersData.data.length > 0) {
                setCurrentDepartment(teachersData.data[0].department);
              }
            }
            setLoading(false);
          } catch (error) {
            console.error('Error fetching data:', error);
            toast.error(error.message);
            setLoading(false); 
          }
        };
    
        fetchUserAndTeachers();
      }, [navigate]);

    const openCreateModal = () => {
        setShowCreateModal(true);
    };

    const closeCreateModal = () => {
        setShowCreateModal(false);
        setNewTeacher({ name: '', email: '', phone: '', teachingHours: '' });
        setInputErrors({});
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewTeacher(prev => ({ ...prev, [name]: value }));
        setInputErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validateInputs = (teacher) => {
        const errors = {};
        if (!teacher.name.trim()) errors.name = 'Tên không được để trống';
        if (!teacher.email.trim()) errors.email = 'Email không được để trống';
        else if (!/^[\w-\.]+@ptnk\.edu\.vn$/.test(teacher.email)) errors.email = 'Email phải có đuôi @ptnk.edu.vn';
        if (!teacher.phone.trim()) errors.phone = 'Số điện thoại không được để trống';
        else if (!/^[0-9]{10}$/.test(teacher.phone)) errors.phone = 'Số điện thoại không hợp lệ';
        if (!teacher.teachingHours.toString().trim()) errors.teachingHours = 'Số tiết dạy không được để trống';
        else if (isNaN(teacher.teachingHours) || teacher.teachingHours < 0) errors.teachingHours = 'Số tiết dạy không hợp lệ';
        setInputErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const checkTotalHours = (hours) => {
        const currentTotal = teachers.reduce((sum, teacher) => sum + (teacher.teachingHours || 0), 0);
        return (currentTotal + hours) <= currentDepartment.totalAssignmentTime;
    };

    const handleCreateTeacher = async () => {
        if (!validateInputs(newTeacher)) return;
    
        const newHours = parseInt(newTeacher.teachingHours);
        if (!checkTotalHours(newHours)) {
            toast.error('Tổng số tiết vượt quá giới hạn cho phép!');
            return;
        }

        try {
            const salary = parseInt(newTeacher.teachingHours) * currentDepartment.salaryPrice;
            const createdTeacher = await createTeacher({
                ...newTeacher,
                position: "Giáo viên",
                department: currentDepartment._id, 
                isLeader: false,
                salary: salary,
                teachingHours: parseInt(newTeacher.teachingHours)
            });
            
            closeCreateModal();
            toast.success('Thêm giáo viên thành công!');
            
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            console.error('Error creating teacher:', error);
            toast.error('Không thể tạo giáo viên mới. Vui lòng thử lại.');
        }
    };

    const openEditModal = (teacher) => {
        setEditingTeacher({...teacher});
        setShowEditModal(true);
    };

    const closeEditModal = () => {
        setShowEditModal(false);
        setEditingTeacher(null);
        setInputErrors({});
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditingTeacher(prev => ({ ...prev, [name]: value }));
        setInputErrors(prev => ({ ...prev, [name]: '' }));
    };

    const openUpdateModal = () => {
        setShowUpdateModal(true);
    };

    const closeUpdateModal = () => {
        setShowUpdateModal(false);
    };

    const handleUpdateTeacher = async () => {
        if (!validateInputs(editingTeacher)) return;
        
        const newHours = parseInt(editingTeacher.teachingHours);
        const oldHours = teachers.find(t => t._id === editingTeacher._id).teachingHours || 0;
        if (!checkTotalHours(newHours - oldHours)) {
            toast.error('Tổng số tiết vượt quá giới hạn cho phép!');
            return;
        }

        try {
            const salary = parseInt(editingTeacher.teachingHours) * currentDepartment.salaryPrice;
            const updatedTeacher = await updateTeacher(editingTeacher._id, {
                ...editingTeacher,
                salary: salary,
                teachingHours: parseInt(editingTeacher.teachingHours)
            });
            
            setTeachers(prevTeachers => 
                prevTeachers.map(teacher => 
                    teacher._id === updatedTeacher.teacher._id ? updatedTeacher.teacher : teacher
                )
            );
            
            closeEditModal();
            closeUpdateModal();
            toast.success('Cập nhật giáo viên thành công!');
        } catch (error) {
            console.error('Error updating teacher:', error);
            toast.error('Không thể cập nhật giáo viên. Vui lòng thử lại.');
        }
    };

    const openDeleteModal = (teacher) => {
        setTeacherToDelete(teacher);
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setTeacherToDelete(null);
    };

    const handleDeleteTeacher = async () => {
        if (!teacherToDelete) return;

        try {
            await deleteTeacher(teacherToDelete._id);
            
            setTeachers(prevTeachers => 
                prevTeachers.filter(teacher => teacher._id !== teacherToDelete._id)
            );
            
            closeDeleteModal();
            toast.success('Xóa giáo viên thành công!');
        } catch (error) {
            console.error('Error deleting teacher:', error);
            toast.error('Không thể xóa giáo viên. Vui lòng thử lại.');
        }
    };

    const exportData = (format) => {
        if (format === 'pdf') {
            exportToPDF();
        } else if (format === 'excel') {
            exportToExcel();
        }
        setShowExportDropdown(false);
    };

    const exportToPDF = () => {
        const docDefinition = {
            pageSize: 'A4',
            pageMargins: [40, 60, 40, 60],
            content: [
                { text: `Danh sách giáo viên ${currentDepartment.name}`, style: 'header' },
                { text: `Tổng số tiết được khai báo: ${currentDepartment.totalAssignmentTime}`, style: 'subheader' },
                { text: `Thù lao giảng dạy 1 tiết: ${currentDepartment.salaryPrice.toLocaleString()} VNĐ`, style: 'subheader' },
                {
                    table: {
                        headerRows: 1,
                        widths: ['auto', 'auto', 'auto', 'auto', 'auto'],
                        body: [
                            [
                                { text: 'Tên giáo viên', style: 'tableHeader' },
                                { text: 'Email', style: 'tableHeader' },
                                { text: 'Số điện thoại', style: 'tableHeader' },
                                { text: 'Số tiết dạy', style: 'tableHeader' },
                                { text: 'Lương', style: 'tableHeader' }
                            ],
                            ...teachers.map(teacher => [
                                teacher.name,
                                teacher.email,
                                teacher.phone,
                                teacher.teachingHours?.toString() || '',
                                teacher.salary ? `${teacher.salary.toLocaleString()} VNĐ` : ''
                            ])
                        ]
                    },
                    layout: {
                        hLineWidth: function(i, node) { return 1; },
                        vLineWidth: function(i, node) { return 1; },
                        hLineColor: function(i, node) { return '#aaa'; },
                        vLineColor: function(i, node) { return '#aaa'; },
                        fillColor: function(rowIndex, node, columnIndex) {
                            return (rowIndex % 2 === 0) ? '#f2f2f2' : null;
                        }
                    }
                },
                { text: `Tổng số tiết: ${teachers.reduce((sum, teacher) => sum + (teacher.teachingHours || 0), 0)}/${currentDepartment.totalAssignmentTime}`, style: 'subheader' },
                { text: `Tổng lương: ${teachers.reduce((sum, teacher) => sum + (teacher.salary || 0), 0).toLocaleString()} VNĐ`, style: 'subheader' }
            ],
            styles: {
                header: {
                    fontSize: 18,
                    bold: true,
                    margin: [0, 0, 0, 10]
                },
                subheader: {
                    fontSize: 14,
                    bold: true,
                    margin: [0, 10, 0, 5]
                },
                tableHeader: {
                    bold: true,
                    fontSize: 12,
                    color: 'black',
                    fillColor: '#cccccc'
                }
            },
            defaultStyle: {
                font: 'Roboto'
            }
        };
    
        pdfMake.createPdf(docDefinition).download(`Danh_sach_giao_vien_${currentDepartment.name}.pdf`);
    };
    
    const exportToExcel = () => {
        const fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
        const fileExtension = '.xlsx';
    
        const data = teachers.map(teacher => ({
            "Tên giáo viên": teacher.name,
            "Email": teacher.email,
            "Số điện thoại": teacher.phone,
            "Số tiết dạy": teacher.teachingHours || "",
            "Lương": teacher.salary ? `${teacher.salary.toLocaleString()} VNĐ` : ""
        }));
    
        // Thêm dòng tổng
        const totalHours = teachers.reduce((sum, teacher) => sum + (teacher.teachingHours || 0), 0);
        const totalSalary = teachers.reduce((sum, teacher) => sum + (teacher.salary || 0), 0);
        data.push({
            "Tên giáo viên": "Tổng",
            "Email": "",
            "Số điện thoại": "",
            "Số tiết dạy": `${totalHours}/${currentDepartment.totalAssignmentTime}`,
            "Lương": `${totalSalary.toLocaleString()} VNĐ`
        });
    
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = { Sheets: { 'data': ws }, SheetNames: ['data'] };
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const dataBlob = new Blob([excelBuffer], { type: fileType });
        saveAs(dataBlob, `Danh_sach_giao_vien_${currentDepartment.name}${fileExtension}`);
    };

    if (loading) {
        return (
            <div className="loading-container">
                <Circles type="TailSpin" color="#00BFFF" height={80} width={80} />
            </div>
        );
    }
    
    return(
        <>
        <Helmet>
            <title>Quản lý giáo viên</title>
        </Helmet>
        <Header/>
        <div className="dashboard-leader">
            <div className="dashboard-header">
                <h1>Danh sách giáo viên {currentDepartment.name}</h1>
                <div className="dashboard-info">
                    <p>Tổng số tiết được khai báo: {currentDepartment.totalAssignmentTime}</p>
                    <p>Thù lao giảng dạy 1 tiết: {currentDepartment.salaryPrice.toLocaleString()} VNĐ</p>
                </div>
                <div className="dashboard-actions">
                    <button onClick={openCreateModal} className="create-button">
                        <FaPlus /> Thêm giáo viên mới
                    </button>
                    <div className="export-dropdown">
                        <button onClick={() => setShowExportDropdown(!showExportDropdown)} className="export-button">
                            Xuất báo cáo
                        </button>
                        {showExportDropdown && (
                            <div className="dropdown-content">
                                <button onClick={() => exportData('pdf')}>Xuất PDF</button>
                                <button onClick={() => exportData('excel')}>Xuất Excel</button>
                            </div>
                        )}
                    </div>
                    <Link to="/dashboard" className="back-button">Quay về Dashboard</Link>
                </div>
            </div>
            <table className="teacher-table">
                <thead>
                    <tr>
                        <th>Tên giáo viên</th>
                        <th>Email</th>
                        <th>Số điện thoại</th>
                        <th>Chức vụ</th>
                        <th>Số tiết dạy</th>
                        <th>Lương</th>
                        <th>Điều chỉnh</th>
                    </tr>
                </thead>
                <tbody>
                    {teachers.map((teacher) => (
                        <tr key={teacher._id}>
                            <td>{teacher.name}</td>
                            <td>{teacher.email}</td>
                            <td>{teacher.phone}</td>
                            <td>{teacher.position}</td>
                            <td>{teacher.teachingHours || "Chưa khai báo"}</td>
                            <td>{teacher.salary?.toLocaleString() || "Chưa khai báo"} VNĐ</td>
                            <td style={{textAlign: 'center'}}>
                                <FaEdit className="edit-icon" onClick={() => openEditModal(teacher)} />
                                </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan="4">Tổng</td>
                        <td>{teachers.reduce((sum, teacher) => sum + (teacher.teachingHours || 0), 0)}/{currentDepartment.totalAssignmentTime}</td>
                        <td>{teachers.reduce((sum, teacher) => sum + (teacher.salary || 0), 0).toLocaleString()} VNĐ</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
            <Modal
                isOpen={showCreateModal}
                onRequestClose={closeCreateModal}
                contentLabel="Create Teacher"
                className="leader-declare-modal"
                overlayClassName="leader-declare-overlay"
            >
                <h2>Thêm giáo viên mới</h2>
                <input
                    type="text"
                    name="name"
                    value={newTeacher.name}
                    onChange={handleInputChange}
                    placeholder="Tên giáo viên"
                />
                {inputErrors.name && <p className="error-message">{inputErrors.name}</p>}
                <input
                    type="email"
                    name="email"
                    value={newTeacher.email}
                    onChange={handleInputChange}
                    placeholder="Email"
                />
                {inputErrors.email && <p className="error-message">{inputErrors.email}</p>}
                <input
                    type="tel"
                    name="phone"
                    value={newTeacher.phone}
                    onChange={handleInputChange}
                    placeholder="Số điện thoại"
                />
                {inputErrors.phone && <p className="error-message">{inputErrors.phone}</p>}
                <input
                    type="number"
                    name="teachingHours"
                    value={newTeacher.teachingHours}
                    onChange={handleInputChange}
                    placeholder="Số tiết dạy"
                />
                {inputErrors.teachingHours && <p className="error-message">{inputErrors.teachingHours}</p>}
                <div>
                    <button onClick={handleCreateTeacher}>Tạo</button>
                    <button onClick={closeCreateModal}>Hủy</button>
                </div>
            </Modal>
            <Modal
                isOpen={showEditModal}
                onRequestClose={closeEditModal}
                contentLabel="Edit Teacher"
                className="leader-declare-modal"
                overlayClassName="leader-declare-overlay"
            >
                <h2>Chỉnh sửa thông tin giáo viên</h2>
                <input
                    type="text"
                    name="name"
                    value={editingTeacher?.name || ''}
                    onChange={handleEditInputChange}
                    placeholder="Tên giáo viên"
                />
                {inputErrors.name && <p className="error-message">{inputErrors.name}</p>}
                <input
                    type="email"
                    name="email"
                    value={editingTeacher?.email || ''}
                    onChange={handleEditInputChange}
                    placeholder="Email"
                />
                {inputErrors.email && <p className="error-message">{inputErrors.email}</p>}
                <input
                    type="tel"
                    name="phone"
                    value={editingTeacher?.phone || ''}
                    onChange={handleEditInputChange}
                    placeholder="Số điện thoại"
                />
                {inputErrors.phone && <p className="error-message">{inputErrors.phone}</p>}
                <input
                    type="number"
                    name="teachingHours"
                    value={editingTeacher?.teachingHours || ''}
                    onChange={handleEditInputChange}
                    placeholder="Số tiết dạy"
                />
                {inputErrors.teachingHours && <p className="error-message">{inputErrors.teachingHours}</p>}
                <div>
                    <button onClick={openUpdateModal}>Cập nhật</button>
                    {!editingTeacher?.isLeader && (
                        <button onClick={() => openDeleteModal(editingTeacher)}>Xóa</button>
                    )}
                    <button onClick={closeEditModal}>Hủy</button>
                </div>
            </Modal>
            <Modal
                isOpen={showDeleteModal}
                onRequestClose={closeDeleteModal}
                contentLabel="Delete Teacher"
                className="leader-declare-modal"
                overlayClassName="leader-declare-overlay"
            >
                <h2>Xác nhận xóa giáo viên</h2>
                <p>Bạn có chắc chắn muốn xóa giáo viên này?</p>
                <div>
                    <button onClick={handleDeleteTeacher}>Xóa</button>
                    <button onClick={closeDeleteModal}>Hủy</button>
                </div>
            </Modal>
            <Modal
                isOpen={showUpdateModal}
                onRequestClose={closeUpdateModal}
                contentLabel="Update Teacher"
                className="leader-declare-modal"
                overlayClassName="leader-declare-overlay"
            >
                <h2>Xác nhận cập nhật giáo viên</h2>
                <p>Bạn có chắc chắn muốn cập nhật thông tin giáo viên này?</p>
                <div>
                    <button onClick={handleUpdateTeacher}>Cập nhật</button>
                    <button onClick={closeUpdateModal}>Hủy</button>
                </div>
            </Modal>
        </div>
        <Footer/>
        <ToastContainer />
        </>
    );
};

export default LeaderDeclare;