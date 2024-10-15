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

    useEffect(() => {
        if (excelData) {
            setEditingData(JSON.parse(JSON.stringify(excelData)));
        }
    }, [excelData]);

    const handleDownloadTemplate = () => {
        const data = [
            ['Tên lớp', 'Toán', 'Tin học', 'Vật lý', 'Hóa học', 'Sinh học', 'Công nghệ', 'Tiếng Anh', 'Ngữ văn', 'Lịch sử', 'Địa lý', 'Giáo dục kinh tế - Pháp luật', 'Giáo dục Quốc phòng', 'Thể dục'],
            ['10A1', '45', '30', '30', '30', '30', '15', '45', '40', '30', '30', '15', '15', '30'],
            ['11B2', '45', '30', '30', '30', '30', '15', '45', '40', '30', '30', '15', '15', '30'],
        ];

        const ws = utils.aoa_to_sheet(data);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Template");

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
            
            const headers = jsonData[0];
            setHeaders(headers);

            const processedData = jsonData.slice(1).map(row => {
                const rowData = {};
                headers.forEach((header, index) => {
                    if (index === 0) {
                        rowData['name'] = row[index];
                    } else {
                        if (row[index]) {
                            rowData[header] = parseInt(row[index], 10);
                        }
                    }
                });
                return rowData;
            });
            
            setExcelData(processedData);
        };
        reader.readAsArrayBuffer(file);
    };

    const handleExcelUpload = async () => {
        if (!excelFile) {
            toast.error('Vui lòng chọn file Excel trước khi tải lên');
            return;
        }

        setIsUploading(true);
        try {
            const result = await addSubjectsToClasses({ classes: editingData });
            console.log(result);

            if (result.results && result.results.length > 0) {
                const errorResults = result.results.filter(r => r.status === 'Lỗi' || r.status === 'Lỗi một phần');
                const successResults = result.results.filter(r => r.status === 'Thành công');

                if (errorResults.length > 0) {
                    const errorMessages = errorResults.map(r => {
                        if (r.message) {
                            return `${r.className}: ${r.message}`;
                        } else if (r.results) {
                            const subjectErrors = r.results.filter(sr => sr.status === 'Lỗi').map(sr => `${sr.subjectName}: ${sr.message}`).join(', ');
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
            onClose();
        } catch (error) {
            console.error('Error uploading Excel file:', error);
            if (error.response && error.response.data) {
                const errorData = error.response.data;
                if (errorData.results && errorData.results.length > 0) {
                    const errorMessages = errorData.results.map(r => `${r.className}: ${r.message}`).join('\n');
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
        if (type === 'text') {
            return value && value.trim() !== '';
        } else if (type === 'number') {
            return !isNaN(value) && parseInt(value) >= 0;
        }
        return true;
    };

    const handleEdit = (index, field, value) => {
        const newData = [...editingData];
        newData[index][field] = value;
        setEditingData(newData);
    };

    const handleSaveChanges = () => {
        if (editingData.every(row => 
            Object.entries(row).every(([key, value]) => 
                validateInput(value, key === 'name' ? 'text' : 'number')
            )
        )) {
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
            contentLabel="Tải lên file Excel môn học"
            className={styles.modal}
            overlayClassName={styles.overlay}
        >
            <h2 className={styles.modalTitle}>Tải lên file Excel môn học</h2>
            <form onSubmit={(e) => { e.preventDefault(); }} className={styles.form}>
                <div className={styles.formGroup}>
                    <label htmlFor="excel-upload">Chọn file Excel:</label>
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
                        <table className={styles.previewTable}>
                            <thead>
                                <tr>
                                    {headers.map((header, index) => (
                                        <th key={index}>{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {editingData.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                        {headers.map((header, cellIndex) => {
                                            const key = cellIndex === 0 ? 'name' : header;
                                            const type = cellIndex === 0 ? 'text' : 'number';
                                            const isValid = validateInput(row[key], type);
                                            return (
                                                <td key={cellIndex} className={!isValid ? styles.invalidInput : ''}>
                                                    {isEditing ? (
                                                        <input 
                                                            type={type}
                                                            value={row[key] || ''}
                                                            onChange={(e) => handleEdit(rowIndex, key, e.target.value)}
                                                        />
                                                    ) : row[key] || '-'}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
                    <button type="button" onClick={onClose} className={styles.closeButton}>
                        Đóng
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default MultiSubjectUploadModal;