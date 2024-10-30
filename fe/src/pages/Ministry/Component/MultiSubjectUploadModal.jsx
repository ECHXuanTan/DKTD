import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { Circles } from 'react-loader-spinner';
import { toast } from 'react-toastify';
import { addSubjectsToClasses } from '../../../services/classServices';
import { read, utils, write } from 'xlsx';
import FileSaver from 'file-saver';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import styles from '../../../css/Ministry/components/MultiSubjectUpload.module.css';

Modal.setAppElement('#root');

const MultiSubjectUploadModal = ({ isOpen, onClose, onSubjectsAdded }) => {
    const [excelFile, setExcelFile] = useState(null);
    const [excelData, setExcelData] = useState(null);
    const [editingData, setEditingData] = useState(null);
    const [headers, setHeaders] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const headers_template = ['Tên lớp', 'Môn học', 'Số tiết/tuần', 'Số tuần'];

    useEffect(() => {
        if (excelData) {
            setEditingData(JSON.parse(JSON.stringify(excelData)));
        }
    }, [excelData]);

    const handleDownloadTemplate = () => {
        const sampleData = [
            // Lớp 10A1
            ['10A1', 'Toán', '3', '15'],
            ['10A1', 'Ngữ văn', '2', '20'],
            ['10A1', 'Tiếng Anh', '3', '15'],
            // Lớp 11B2
            ['11B2', 'Toán', '3', '15'],
            ['11B2', 'Ngữ văn', '2', '20'],
            ['11B2', 'Tiếng Anh', '3', '15']
        ];

        const data = [headers_template, ...sampleData];
        const ws = utils.aoa_to_sheet(data);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Template");

        const wscols = [
            { wch: 15 }, // Tên lớp
            { wch: 30 }, // Môn học
            { wch: 15 }, // Số tiết/tuần
            { wch: 10 }  // Số tuần
        ];
        ws['!cols'] = wscols;

        const excelBuffer = write(wb, { bookType: 'xlsx', type: 'array' });
        const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        FileSaver.saveAs(dataBlob, 'multi_subject_template.xlsx');
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
            const jsonData = utils.sheet_to_json(worksheet, { header: 1 });
            
            const uploadedHeaders = jsonData[0];
            if (!headers_template.every((header, index) => header === uploadedHeaders[index])) {
                toast.error('Format file không đúng. Vui lòng sử dụng template được cung cấp.');
                return;
            }

            setHeaders(uploadedHeaders);
            const processedData = jsonData.slice(1).map(row => ({
                'Tên lớp': row[0],
                'Môn học': row[1],
                'Số tiết/tuần': row[2],
                'Số tuần': row[3]
            }));
            
            setExcelData(processedData);
        };
        reader.readAsArrayBuffer(file);
    };

    const processDataForUpload = (data) => {
        const classGroups = data.reduce((acc, row) => {
            const className = row['Tên lớp'];
            if (!acc[className]) {
                acc[className] = {
                    name: className,
                    subjects: []
                };
            }
            
            acc[className].subjects.push({
                subjectName: row['Môn học'],
                periodsPerWeek: parseInt(row['Số tiết/tuần']),
                numberOfWeeks: parseInt(row['Số tuần']),
                lessonCount: parseInt(row['Số tiết/tuần']) * parseInt(row['Số tuần'])
            });
            
            return acc;
        }, {});

        return Object.values(classGroups);
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

        setIsUploading(true);
        try {
            const formattedData = processDataForUpload(editingData);
            const result = await addSubjectsToClasses({ classes: formattedData });

            if (result.results && result.results.length > 0) {
                const errorResults = result.results.filter(r => r.status === 'Lỗi' || r.status === 'Lỗi một phần');
                const successResults = result.results.filter(r => r.status === 'Thành công');

                if (errorResults.length > 0) {
                    const errorMessages = errorResults.map(r => {
                        if (r.message) {
                            return `${r.className}: ${r.message}`;
                        } else if (r.results) {
                            const subjectErrors = r.results
                                .filter(sr => sr.status === 'Lỗi')
                                .map(sr => `${sr.subjectName}: ${sr.message}`)
                                .join(', ');
                            return `${r.className}: ${subjectErrors}`;
                        }
                        return `${r.className}: Lỗi không xác định`;
                    }).join('\n');

                    toast.error(
                        <div>
                            <p>Có lỗi xảy ra khi thêm môn học:</p>
                            <pre style={{maxHeight: '150px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>
                                {errorMessages}
                            </pre>
                        </div>,
                        { autoClose: false }
                    );
                }

                if (successResults.length > 0) {
                    toast.success(`Thêm/cập nhật môn học thành công cho ${successResults.length} lớp`);
                }
            } else {
                toast.success('Tải lên và thêm môn học thành công!');
            }

            onSubjectsAdded();
            clearData();
            onClose();
        } catch (error) {
            console.error('Error uploading Excel file:', error);
            if (error.response?.data) {
                const errorData = error.response.data;
                if (errorData.results?.length > 0) {
                    const errorMessages = errorData.results
                        .map(r => `${r.className}: ${r.message}`)
                        .join('\n');
                    toast.error(
                        <div>
                            <p>{errorData.message}</p>
                            <pre style={{maxHeight: '150px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>
                                {errorMessages}
                            </pre>
                        </div>,
                        { autoClose: false }
                    );
                } else {
                    toast.error(`Lỗi: ${errorData.message}`);
                }
            } else {
                toast.error('Đã có lỗi xảy ra khi tải lên file');
            }
        } finally {
            setIsUploading(false);
        }
    };

    const validateInput = (value, type) => {
        if (!value && value !== 0) return false;
        
        switch (type) {
            case 'text':
                return value.trim() !== '';
            case 'number':
                const num = Number(value);
                return !isNaN(num) && num > 0 && Number.isInteger(num);
            case 'subject':
                return value.trim() !== '';
            default:
                return true;
        }
    };

    const getInputType = (header) => {
        switch (header) {
            case 'Tên lớp':
                return 'text';
            case 'Môn học':
                return 'subject';
            case 'Số tiết/tuần':
            case 'Số tuần':
                return 'number';
            default:
                return 'text';
        }
    };

    const validateAllData = () => {
        if (!editingData || editingData.length === 0) return false;

        return editingData.every(row => {
            return headers_template.every(header => {
                const value = row[header];
                const type = getInputType(header);
                const isValid = validateInput(value, type);
                if (!isValid) {
                    console.error(`Validation failed for ${header}:`, value);
                }
                return isValid;
            });
        });
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
        setExcelFile(null);
        setExcelData(null);
        setEditingData(null);
        setHeaders([]);
        setIsEditing(false);
    };

    const handleClose = () => {
        clearData();
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={handleClose}
            contentLabel="Tải lên file Excel môn học"
            className={styles.modal}
            overlayClassName={styles.overlay}
        >
            <h2 className={styles.modalTitle}>Tải lên file Excel môn học</h2>
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
                                                            <input 
                                                                type={type === 'number' ? 'number' : 'text'}
                                                                value={row[header] || ''}
                                                                onChange={(e) => handleEdit(rowIndex, header, e.target.value)}
                                                                min={type === 'number' ? "1" : undefined}
                                                            />
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
                    <button 
                        type="button" 
                        onClick={handleExcelUpload} 
                        className={styles.submitButton} 
                        disabled={isUploading || !excelFile || isEditing}
                    >
                        {isUploading ? (
                            <Circles type="TailSpin" color="#FFF" height={20} width={20} />
                        ) : (
                            <>
                                <CloudUploadIcon style={{marginRight: '5px'}}/> Tải lên
                            </>
                        )}
                    </button>
                    <button 
                        type="button" 
                        onClick={handleClose} 
                        className={styles.closeButton}
                    >
                        Hủy
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default MultiSubjectUploadModal;