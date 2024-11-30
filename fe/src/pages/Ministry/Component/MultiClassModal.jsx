import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { Circles } from 'react-loader-spinner';
import { toast } from 'react-toastify';
import { createClasses } from '../../../services/classServices';
import styles from '../../../css/Ministry/components/MultiClassModal.module.css';
import { read, utils, write } from 'xlsx';
import FileSaver from 'file-saver';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';

Modal.setAppElement('#root');

const MultiClassModal = ({ isOpen, onClose, onClassesAdded }) => {
    const [excelFile, setExcelFile] = useState(null);
    const [excelData, setExcelData] = useState(null);
    const [editingData, setEditingData] = useState(null);
    const [headers, setHeaders] = useState([]);
    const [isUploadingExcel, setIsUploadingExcel] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const headers_template = ['Tên lớp', 'Khối', 'Sĩ số', 'Cơ sở', 'Môn học', 'Số tiết/tuần', 'Số tuần'];

    useEffect(() => {
        if (excelData) {
            setEditingData(JSON.parse(JSON.stringify(excelData)));
        }
    }, [excelData]);

    const handleDownloadTemplate = () => {
        // Tạo mẫu dữ liệu với format dọc
        const sampleData = [
            // Lớp 10 ANH TEST
            ['10 ANH TEST', '10', '40', 'Quận 5', 'Toán', '3', '15'],
            ['10 ANH TEST', '10', '40', 'Quận 5', 'Ngữ văn', '2', '20'],
            ['10 ANH TEST', '10', '40', 'Quận 5', 'Tiếng Anh', '3', '15'],
            ['10 ANH TEST', '10', '40', 'Quận 5', 'Vật lý', '2', '15'],
            ['10 ANH TEST', '10', '40', 'Quận 5', 'Hóa học', '2', '15'],
            // Lớp 11 SINH TEST
            ['11 SINH TEST', '11', '45', 'Thủ Đức', 'Toán', '3', '15'],
            ['11 SINH TEST', '11', '45', 'Thủ Đức', 'Ngữ văn', '2', '20'],
            ['11 SINH TEST', '11', '45', 'Thủ Đức', 'Tiếng Anh', '3', '15'],
            ['11 SINH TEST', '11', '45', 'Thủ Đức', 'Vật lý', '2', '15'],
            ['11 SINH TEST', '11', '45', 'Thủ Đức', 'Hóa học', '2', '15']
        ];

        const data = [headers_template, ...sampleData];
        const ws = utils.aoa_to_sheet(data);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Template");

        // Set column widths
        const wscols = [
            { wch: 15 }, // Tên lớp
            { wch: 10 }, // Khối
            { wch: 10 }, // Sĩ số
            { wch: 15 }, // Cơ sở
            { wch: 30 }, // Môn học
            { wch: 15 }, // Số tiết/tuần
            { wch: 10 }  // Số tuần
        ];
        ws['!cols'] = wscols;

        const excelBuffer = write(wb, { bookType: 'xlsx', type: 'array' });
        const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        FileSaver.saveAs(dataBlob, 'class_template.xlsx');
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        setExcelFile(file);
    
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = utils.sheet_to_json(worksheet, { 
                header: headers_template,
                range: 1 // Skip header row
            });
            
            const processedData = jsonData.map(row => {
                let campus = row['Cơ sở'];
                if (campus) {
                    campus = campus.toString().trim().toUpperCase();
                    switch (campus) {
                        case 'Q5':
                        case 'QUẬN 5':
                        case 'QU?N 5':
                            campus = 'Quận 5';
                            break;
                        case 'TĐ':
                        case 'TD':
                        case 'THỦ ĐỨC':
                        case 'THU DUC':
                            campus = 'Thủ Đức';
                            break;
                    }
                }
    
                return {
                    'Tên lớp': row['Tên lớp'],
                    'Khối': row['Khối'],
                    'Sĩ số': row['Sĩ số'],
                    'Cơ sở': campus,
                    'Môn học': row['Môn học'],
                    'Số tiết/tuần': row['Số tiết/tuần'],
                    'Số tuần': row['Số tuần']
                };
            });
    
            setExcelData(processedData);
        };
        reader.readAsArrayBuffer(file);
    };
    
    // Cập nhật hàm validateInput để xử lý tên lớp có chứa cả "Q5" và "TĐ"
    const validateInput = (value, type) => {
        if (!value && value !== 0) return false;
        
        switch (type) {
            case 'text':
                return value.toString().trim() !== '';
            case 'grade':
                return ['10', '11', '12'].includes(value.toString());
            case 'number':
                const num = Number(value);
                return !isNaN(num) && num > 0 && Number.isInteger(num);
            case 'campus':
                const normalizedCampus = value.toString().trim().toUpperCase();
                return ['QUẬN 5', 'Q5', 'THỦ ĐỨC', 'TĐ', 'TD'].includes(normalizedCampus) ||
                       value === 'Quận 5' || value === 'Thủ Đức';
            case 'subject':
                return value.toString().trim() !== '';
            default:
                return true;
        }
    };  
    
    const validateAllData = () => {
        if (!editingData || editingData.length === 0) return false;
    
        const requiredFields = {
            'Tên lớp': 'text',
            'Khối': 'grade',
            'Sĩ số': 'number',
            'Cơ sở': 'campus',
            'Môn học': 'subject',
            'Số tiết/tuần': 'number',
            'Số tuần': 'number'
        };
    
        return editingData.every(row => {
            return Object.entries(requiredFields).every(([field, type]) => {
                const isValid = validateInput(row[field], type);
                if (!isValid) {
                    console.error(`Validation failed for ${field}:`, row[field]);
                }
                return isValid;
            });
        });
    };
    
    const processDataForUpload = (data) => {
        // Create a validation map to track classes and their subjects
        const classValidation = new Map();
        
        // First pass: Validate unique class-subject combinations
        for (const row of data) {
            const className = row['Tên lớp'];
            const subjectName = row['Môn học'];
            
            if (!classValidation.has(className)) {
                classValidation.set(className, subjectName);
            } else {
                // If class already exists with a different subject, throw error
                throw new Error(`Lớp ${className} đã được định nghĩa với môn ${classValidation.get(className)}. Mỗi lớp chỉ được phép có một môn học.`);
            }
        }
        
        // Process validated data
        return data.map(row => ({
            name: row['Tên lớp'],
            grade: parseInt(row['Khối']),
            size: parseInt(row['Sĩ số']),
            campus: row['Cơ sở'],
            subjects: [{
                subjectName: row['Môn học'],
                periodsPerWeek: parseInt(row['Số tiết/tuần']),
                numberOfWeeks: parseInt(row['Số tuần']),
                lessonCount: parseInt(row['Số tiết/tuần']) * parseInt(row['Số tuần'])
            }]
        }));
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
            const formattedData = processDataForUpload(editingData);
            
            console.log('Formatted data:', formattedData);
            
            const result = await createClasses(formattedData);
            toast.success('Tải lên và tạo lớp thành công!');
            onClassesAdded();
            clearData();
            onClose();
        } catch (error) {
            console.error('Error uploading Excel file:', error);
            if (error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else if (error.message) {
                toast.error(error.message);
            } else {
                toast.error('Đã có lỗi xảy ra khi tải lên file');
            }
        } finally {
            setIsUploadingExcel(false);
        }
    };

    const getInputType = (header) => {
        switch (header) {
            case 'Tên lớp':
                return 'text';
            case 'Khối':
                return 'grade';
            case 'Sĩ số':
                return 'number';
            case 'Cơ sở':
                return 'campus';
            case 'Môn học':
                return 'subject';
            case 'Số tiết/tuần':
            case 'Số tuần':
                return 'number';
            default:
                return 'text';
        }
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

    const clearData = () => {
        setExcelData(null);
        setEditingData(null);
        setExcelFile(null);
        setHeaders([]);
        setIsEditing(false);
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
                    <label htmlFor="excel-upload">
                        Chọn file Excel: <span style={{color: "red"}}>
                            (File phải có đúng format như file mẫu)
                        </span>
                    </label>
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
                                        {headers_template.map((header, index) => (
                                            <th key={index}>{header}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {editingData.map((row, rowIndex) => (
                                        <tr key={rowIndex}>
                                            {headers_template.map((header, cellIndex) => {
                                                const type = getInputType(header);
                                                const isValid = validateInput(row[header], type);
                                                return (
                                                    <td key={cellIndex} className={!isValid ? styles.invalidInput : ''}>
                                                        {isEditing ? (
                                                            type === 'campus' ? (
                                                                <select
                                                                    value={row[header] || ''}
                                                                    onChange={(e) => handleEdit(rowIndex, header, e.target.value)}
                                                                >
                                                                    <option value="">Chọn cơ sở</option>
                                                                    <option value="Quận 5">Quận 5</option>
                                                                    <option value="Thủ Đức">Thủ Đức</option>
                                                                </select>
                                                            ) : (
                                                                <input 
                                                                    type={type === 'number' ? 'number' : 'text'}
                                                                    value={row[header] || ''}
                                                                    onChange={(e) => handleEdit(rowIndex, header, e.target.value)}
                                                                    min={type === 'number' ? "1" : undefined}
                                                                />
                                                            )
                                                        ) : row[header]}
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
                        <button 
                            type="button"
                            onClick={handleExcelUpload} 
                            className={styles.submitButton} 
                            disabled={isUploadingExcel || isEditing}
                        >
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

export default MultiClassModal;