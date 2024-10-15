import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { Circles } from 'react-loader-spinner';
import { toast } from 'react-toastify';
import { createManyTeachers } from '../../../../services/teacherService';
import { getDepartmentNames } from '../../../../services/departmentService';
import { getNonSpecializedSubjects } from '../../../../services/subjectServices';
import styles from '../../../../css/Ministry/components/MultiTeacherModal.module.css';
import { read, utils, write } from 'xlsx';
import FileSaver from 'file-saver';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';

Modal.setAppElement('#root');

const MultiTeacherModal = ({ isOpen, onClose, onTeachersAdded }) => {
    const [excelFile, setExcelFile] = useState(null);
    const [excelData, setExcelData] = useState(null);
    const [editingData, setEditingData] = useState(null);
    const [headers, setHeaders] = useState([]);
    const [isUploadingExcel, setIsUploadingExcel] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [subjects, setSubjects] = useState([]);

    useEffect(() => {
        if (excelData) {
            setEditingData(JSON.parse(JSON.stringify(excelData)));
        }
    }, [excelData]);

    useEffect(() => {
        const fetchDepartmentsAndSubjects = async () => {
            try {
                const deptData = await getDepartmentNames();
                setDepartments(deptData);
                const subjectData = await getNonSpecializedSubjects();
                setSubjects(subjectData);
            } catch (error) {
                console.error('Error fetching departments and subjects:', error);
            }
        };
        fetchDepartmentsAndSubjects();
    }, []);

    const handleDownloadTemplate = () => {
        const data = [
            ['Họ và tên', 'Email', 'Số điện thoại', 'Tổ chuyên môn', 'Môn học giảng dạy', 'Hình thức giáo viên', 'Số tiết dạy một tuần', 'Số tuần dạy', 'Số tiết giảm 1 tuần', 'Số tuần giảm', 'Nội dung giảm'],
            ['Nguyễn Văn A', 'nguyenvana@example.com', '0923456789', 'Tổ Tiếng Anh', 'Tiếng Anh', 'Cơ hữu', '20', '15', '2', '18', 'GVCN'],
            ['Trần Thị B', 'tranthib@example.com', '0987654321', 'Tổ Vật lý', 'Vật lý',  'Thỉnh giảng', '', '', '', '', ''],
        ];

        const ws = utils.aoa_to_sheet(data);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Template");

        const excelBuffer = write(wb, { bookType: 'xlsx', type: 'array' });
        const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        FileSaver.saveAs(dataBlob, 'teacher_template.xlsx');
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        setExcelFile(file);
    
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                
                if (jsonData.length > 0 && Array.isArray(jsonData[0])) {
                    const headers = jsonData[0];
                    setHeaders(headers);
    
                    const processedData = jsonData.slice(1).map(row => {
                        const rowData = {};
                        headers.forEach((header, index) => {
                            rowData[header] = row[index] || '';
                        });
                        return rowData;
                    });
                    
                    setExcelData(processedData);
                } else {
                    throw new Error('Invalid Excel format');
                }
            } catch (error) {
                console.error('Error processing Excel file:', error);
                toast.error('File Excel không hợp lệ hoặc không chứa dữ liệu');
                setExcelFile(null);
                setHeaders([]);
                setExcelData(null);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleExcelUpload = async () => {
        if (!excelFile) {
            toast.error('Vui lòng chọn file Excel trước khi tải lên');
            return;
        }
    
        if (!validateAllData()) {
            toast.error('Vui lòng kiểm tra lại dữ liệu. Đảm bảo tất cả các trường đều hợp lệ.');
            return;
        }
    
        setIsUploadingExcel(true);
        try {
            const formattedData = editingData.map(row => ({
                'Tên': row['Họ và tên'],
                'Email': row['Email'],
                'Số điện thoại': row['Số điện thoại'],
                'Tổ chuyên môn': row['Tổ chuyên môn'],
                'Môn học giảng dạy': row['Môn học giảng dạy'],
                'Hình thức giáo viên': row['Hình thức giáo viên'],
                'Số tiết dạy một tuần': row['Số tiết dạy một tuần'],
                'Số tuần dạy': row['Số tuần dạy'],
                'Số tiết giảm 1 tuần': row['Số tiết giảm 1 tuần'],
                'Số tuần giảm': row['Số tuần giảm'],
                'Nội dung giảm': row['Nội dung giảm']
            }));
    
            const response = await createManyTeachers(formattedData);
            
            let successCount = 0;
            let errorMessages = [];
    
            if (response.invalidTeachers && response.invalidTeachers.length > 0) {
                errorMessages = response.invalidTeachers.map(item => 
                    `${item.name}: ${item.errors.join(', ')}`
                );
            }
    
            if (response.createdTeachers) {
                successCount = response.createdTeachers.length;
            }
    
            if (response.errors) {
                errorMessages = errorMessages.concat(response.errors.map(err => 
                    `${err.email || 'Unknown'}: ${err.message}`
                ));
            }
    
            // Đóng modal ngay lập tức
            clearData();
            onClose();

            // Hiển thị thông báo toast và cập nhật danh sách giáo viên
            if (successCount > 0) {
                toast.success(`Đã tạo thành công ${successCount} giáo viên`);
                onTeachersAdded(); // Cập nhật danh sách giáo viên
            }
    
            if (errorMessages.length > 0) {
                const errorMessage = `Có ${errorMessages.length} giáo viên không hợp lệ:\n${errorMessages.join('\n')}`;
                toast.error(errorMessage);
            }
        } catch (error) {
            console.error('Error creating teachers:', error);
            toast.error(error.message || 'Đã xảy ra lỗi khi tạo giáo viên');
        } finally {
            setIsUploadingExcel(false);
        }
    };

    const clearData = () => {
        setExcelData(null);
        setEditingData(null);
        setExcelFile(null);
        setHeaders([]);
        setIsEditing(false);
    };

    const validateInput = (value, header) => {
        if (['Họ và tên', 'Email', 'Tổ chuyên môn', 'Môn học giảng dạy', 'Hình thức giáo viên'].includes(header)) {
            return value && value.trim() !== '';
        } else if (['Số tiết dạy một tuần', 'Số tuần dạy', 'Số tiết giảm 1 tuần', 'Số tuần giảm'].includes(header)) {
            const numValue = Number(value);
            return !isNaN(numValue) && numValue >= 0;
        } else if (header === 'Số điện thoại') {
            return value === '' || /^[0-9]{10}$/.test(value);
        }
        return true;
    };

    const validateAllData = () => {
        for (let row of editingData) {
            for (let [header, value] of Object.entries(row)) {
                if (!validateInput(value, header)) {
                    return false;
                }
            }
        }
        return true;
    };

    const handleEdit = (rowIndex, field, value) => {
        const newData = [...editingData];
        newData[rowIndex][field] = value;
        setEditingData(newData);
    };

    const handleSaveChanges = () => {
        if (validateAllData()) {
            setExcelData(editingData);
            setIsEditing(false);
            toast.success('Các thay đổi đã được lưu');
        } else {
            toast.error('Vui lòng kiểm tra lại dữ liệu. Đảm bảo tất cả các trường đều hợp lệ.');
        }
    };

    const handleCancelChanges = () => {
        setEditingData(JSON.parse(JSON.stringify(excelData)));
        setIsEditing(false);
        toast.info('Các thay đổi đã được hủy');
    };

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onClose}
            contentLabel="Tải lên file Excel"
            className={styles.modalExcel}
            overlayClassName={styles.overlay}
        >
            <h2 className={styles.modalTitle}>Tải lên file Excel</h2>
            <form onSubmit={(e) => { e.preventDefault(); }} className={styles.form}>
                <div className={styles.formGroup}>
                    <label htmlFor="excel-upload">Chọn file Excel: <span style={{color: "red"}}>(File tải lên phải có các cột giống như file mẫu)</span></label>
                    <input
                        type="file"
                        id="excel-upload"
                        accept=".xlsx, .xls"
                        onChange={handleFileUpload}
                    />
                </div>
                {editingData && (
                    <div className={styles.previewContainer}>
                        <div className={styles.previewHeader}>
                            <h3>Xem trước dữ liệu:</h3>
                            <div className={styles.editButtons}>
                                {!isEditing ? (
                                    <button type="button" onClick={() => setIsEditing(true)} className={styles.editButton}>
                                        <EditIcon /> Chỉnh sửa
                                    </button>
                                ) : (
                                    <>
                                        <button type="button" onClick={handleSaveChanges} className={styles.saveButton}>
                                            <SaveIcon /> Lưu thay đổi
                                        </button>
                                        <button type="button" onClick={handleCancelChanges} className={styles.cancelButton}>
                                            <CancelIcon /> Hủy thay đổi
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className={styles.tableWrapper}>
                            <table className={styles.previewTable}>
                                <thead>
                                    <tr>
                                        {headers.map((header, index) => (
                                            <th key={index} className={header === 'Họ và tên' || header === 'Email' ? styles.wideColumn : ''}>{header}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {editingData.map((row, rowIndex) => (
                                        <tr key={rowIndex}>
                                            {headers.map((header, cellIndex) => {
                                                const isValid = validateInput(row[header], header);
                                                return (
                                                    <td key={cellIndex} className={`${!isValid ? styles.invalidInput : ''} ${header === 'Họ và tên' || header === 'Email' ? styles.wideColumn : ''}`}>
                                                        {isEditing ? (
                                                            header === 'Tổ chuyên môn' ? (
                                                                <select
                                                                    value={row[header]}
                                                                    onChange={(e) => handleEdit(rowIndex, header, e.target.value)}
                                                                >
                                                                    <option value="">Chọn Tổ bộ môn</option>
                                                                    {departments.filter(dept => dept.name !== "Tổ Giáo vụ – Đào tạo").map((dept) => (
                                                                        <option key={dept._id} value={dept.name}>{dept.name}</option>
                                                                    ))}
                                                                </select>
                                                            ) : header === 'Môn học giảng dạy' ? (
                                                                <select
                                                                    value={row[header]}
                                                                    onChange={(e) => handleEdit(rowIndex, header, e.target.value)}
                                                                >
                                                                    <option value="">Chọn môn học</option>
                                                                    {subjects.map((subject) => (
                                                                        <option key={subject._id} value={subject.name}>{subject.name}</option>
                                                                    ))}
                                                                </select>
                                                            ) : header === 'Hình thức giáo viên' ? (
                                                                <select
                                                                    value={row[header]}
                                                                    onChange={(e) => handleEdit(rowIndex, header, e.target.value)}
                                                                >
                                                                    <option value="">Chọn hình thức giáo viên</option>
                                                                    <option value="Cơ hữu">Cơ hữu</option>
                                                                    <option value="Thỉnh giảng">Thỉnh giảng</option>
                                                                </select>
                                                            ) : (
                                                                <input 
                                                                    type={['Số tiết dạy một tuần', 'Số tuần dạy', 'Số tiết giảm 1 tuần', 'Số tuần giảm'].includes(header) ? 'number' : 'text'}
                                                                    value={row[header] || ''}
                                                                    onChange={(e) => handleEdit(rowIndex, header, e.target.value)}
                                                                />
                                                            )
                                                        ) : row[header] || '-'}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                <div className={styles.formActions}>
                    <button type="button" onClick={handleDownloadTemplate} className={styles.downloadButton}>
                        Tải xuống mẫu Excel
                    </button>
                    {editingData && (
                        <button type="button" onClick={handleExcelUpload} className={styles.submitButton} disabled={isUploadingExcel || isEditing}>
                            {isUploadingExcel ? (
                                <Circles type="TailSpin" color="#FFF" height={20} width={20} />
                            ) : (
                                <>
                                    <CloudUploadIcon style={{marginRight: '5px'}}/> Tải lên
                                </>
                            )}
                        </button>
                    )}
                    <button 
                        type="button" 
                        onClick={() => {
                            clearData();
                            onClose();
                        }} 
                        className={styles.cancelButton}
                    >
                        Hủy
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default MultiTeacherModal;