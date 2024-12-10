import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { Circles } from 'react-loader-spinner';
import { toast } from 'react-toastify';
import { createClasses } from '../../../../services/classServices';
import { getSubject } from '../../../../services/subjectServices';
import styles from '../../../../css/Ministry/components/MultiClassModal.module.css';
import { read, utils } from 'xlsx';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import ExportClassTemplate from './ExportClassTemplate';

Modal.setAppElement('#root');

const MultiClassModal = ({ isOpen, onClose, onClassesAdded }) => {
    const [excelFile, setExcelFile] = useState(null);
    const [excelData, setExcelData] = useState(null);
    const [editingData, setEditingData] = useState(null);
    const [headers, setHeaders] = useState([]);
    const [isUploadingExcel, setIsUploadingExcel] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [subjects, setSubjects] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const headers_template = ['Tên lớp', 'Khối', 'Sĩ số', 'Cơ sở', 'Môn học', 'Số tiết/tuần', 'Số tuần'];

    useEffect(() => {
        if (isOpen) {
            fetchSubjects();
        }
    }, [isOpen]);

    const fetchSubjects = async () => {
        try {
            setIsLoading(true);
            const subjectsData = await getSubject();
            const filteredSubjects = subjectsData.filter(subject => 
                !["HT", "PHT", "GVĐT", "HTQT", "VP"].includes(subject.name)
            );
            setSubjects(filteredSubjects);
        } catch (error) {
            console.error('Error fetching subjects:', error);
            toast.error('Không thể tải danh sách môn học');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (excelData) {
            setEditingData(JSON.parse(JSON.stringify(excelData)));
        }
    }, [excelData]);

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
                range: 1
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
                return subjects.some(subject => subject.name === value);
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
        const uniqueClassSubjectCombos = new Map();
        const processedData = [];
        
        for (const row of data) {
            const className = row['Tên lớp'];
            const subjectName = row['Môn học'];
            const key = `${className}-${subjectName}`;
            
            if (!uniqueClassSubjectCombos.has(key)) {
                // Create new class data
                const classData = {
                    name: className,
                    grade: parseInt(row['Khối']),
                    size: parseInt(row['Sĩ số']),
                    campus: row['Cơ sở'],
                    subjects: [{
                        subjectName: subjectName,
                        periodsPerWeek: parseInt(row['Số tiết/tuần']),
                        numberOfWeeks: parseInt(row['Số tuần']),
                        lessonCount: parseInt(row['Số tiết/tuần']) * parseInt(row['Số tuần'])
                    }]
                };
                processedData.push(classData);
                uniqueClassSubjectCombos.set(key, true);
            } else {
                throw new Error(`Lớp ${className} đã tồn tại với môn học ${subjectName}`);
            }
        }
    
        return processedData;
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
            await createClasses(formattedData);
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

    const renderTableCell = (row, header, rowIndex, cellIndex) => {
        const type = getInputType(header);
        const isValid = validateInput(row[header], type);
        
        if (!isEditing) {
            return row[header];
        }

        switch (type) {
            case 'campus':
                return (
                    <select
                        value={row[header] || ''}
                        onChange={(e) => handleEdit(rowIndex, header, e.target.value)}
                    >
                        <option value="">Chọn cơ sở</option>
                        <option value="Quận 5">Quận 5</option>
                        <option value="Thủ Đức">Thủ Đức</option>
                    </select>
                );
            case 'subject':
                return (
                    <select
                        value={row[header] || ''}
                        onChange={(e) => handleEdit(rowIndex, header, e.target.value)}
                    >
                        <option value="">Chọn môn học</option>
                        {subjects.map(subject => (
                            <option key={subject._id} value={subject.name}>
                                {subject.name}
                            </option>
                        ))}
                    </select>
                );
            default:
                return (
                    <input 
                        type={type === 'number' ? 'number' : 'text'}
                        value={row[header] || ''}
                        onChange={(e) => handleEdit(rowIndex, header, e.target.value)}
                        min={type === 'number' ? "1" : undefined}
                    />
                );
        }
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
                                                        {renderTableCell(row, header, rowIndex, cellIndex)}
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
                    <ExportClassTemplate />
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