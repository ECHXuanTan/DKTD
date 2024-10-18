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

    const fixedHeaders = ['Tên lớp', 'Khối', 'Sĩ số', 'Cơ sở'];

    useEffect(() => {
        if (excelData) {
            setEditingData(JSON.parse(JSON.stringify(excelData)));
        }
    }, [excelData]);

    const handleDownloadTemplate = () => {
        const data = [
            ['Tên lớp', 'Khối', 'Sĩ số', 'Cơ sở', 'Toán', 'Tin học', 'Vật lý', 'Hóa học', 'Sinh học', 'Công nghệ', 'Tiếng Anh', 'Ngữ văn', 'Lịch sử', 'Địa lý', 'Giáo dục kinh tế - Pháp luật', 'Giáo dục Quốc phòng', 'Thể dục'],
            ['10A1', '10', '40', 'Quận 5', '45', '30', '30', '30', '30', '15', '45', '40', '30', '30', '15', '15', '30'],
            ['11B2', '11', '45', 'Thủ Đức', '45', '30', '30', '30', '30', '15', '45', '40', '30', '30', '15', '15', '30'],
        ];

        const ws = utils.aoa_to_sheet(data);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Template");

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
            const jsonData = utils.sheet_to_json(worksheet, { header: 1 });
            
            const headers = jsonData[0];
            setHeaders(headers);

            const processedData = jsonData.slice(1).map(row => {
                const rowData = {};
                headers.forEach((header, index) => {
                    if (index < 4) {
                        rowData[header] = row[index];
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

        if (!validateAllData()) {
            toast.error('Vui lòng kiểm tra lại dữ liệu. Đảm bảo tất cả các trường đều hợp lệ.');
            return;
        }

        setIsUploadingExcel(true);
        try {
            const formattedData = editingData.map(row => {
                const { 'Tên lớp': name, 'Khối': grade, 'Sĩ số': size, 'Cơ sở': campus, ...subjects } = row;
                return {
                    name,
                    grade: parseInt(grade, 10),
                    size: parseInt(size, 10),
                    campus,
                    ...subjects
                };
            });

            await createClasses(formattedData);
            toast.success('Tải lên và tạo lớp thành công!');
            onClassesAdded();
            clearData();
            onClose();
        } catch (error) {
            console.error('Error uploading Excel file:', error);
            if (error.response && error.response.data && error.response.data.message) {
                const errorMessage = error.response.data.message;
                if (errorMessage.includes('Tên lớp đã tồn tại')) {
                    const classNames = errorMessage.split(':')[1].trim();
                    toast.error(`Các lớp sau đã tồn tại: ${classNames}`);
                } else {
                    toast.error(errorMessage);
                }
            } else {
                toast.error('Đã có lỗi xảy ra khi tải lên file');
            }
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

    const validateInput = (value, type) => {
        if (type === 'text') {
            return value && value.trim() !== '';
        } else if (type === 'number') {
            const numValue = Number(value);
            return !isNaN(numValue) && numValue > 0;
        } else if (type === 'grade') {
            return ['10', '11', '12'].includes(value);
        } else if (type === 'campus') {
            return ['Quận 5', 'Thủ Đức'].includes(value);
        } else if (type === 'lessonCount') {
            if (value === '' || value === null || value === undefined) return true;
            const numValue = Number(value);
            return !isNaN(numValue) && numValue > 0;
        }
        return true;
    };

    const validateAllData = () => {
        for (let row of editingData) {
            for (let [header, value] of Object.entries(row)) {
                let type;
                if (header === 'Tên lớp') {
                    type = 'text';
                } else if (header === 'Khối') {
                    type = 'grade';
                } else if (header === 'Sĩ số') {
                    type = 'number';
                } else if (header === 'Cơ sở') {
                    type = 'campus';
                } else {
                    type = 'lessonCount';
                }
                if (!validateInput(value, type)) {
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

    const handleHeaderEdit = (index, newValue) => {
        if (fixedHeaders.includes(headers[index])) return;
        const newHeaders = [...headers];
        newHeaders[index] = newValue;
        setHeaders(newHeaders);

        const newData = editingData.map(row => {
            const newRow = {...row};
            delete Object.assign(newRow, {[newValue]: newRow[headers[index]]})[headers[index]];
            return newRow;
        });
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
                    <label htmlFor="excel-upload">Chọn file Excel: <span style={{color: "red"}}>(File tải lên phải có các cột (Tên lớp, Khối, Sĩ số, Cơ sở) và các cột tên lớp chính xác giống như file mẫu)</span></label>
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
                                            <th key={index}>
                                                {isEditing && !fixedHeaders.includes(header) ? (
                                                    <input 
                                                        type="text" 
                                                        value={header} 
                                                        onChange={(e) => handleHeaderEdit(index, e.target.value)}
                                                    />
                                                ) : header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {editingData.map((row, rowIndex) => (
                                        <tr key={rowIndex}>
                                            {headers.map((header, cellIndex) => {
                                                let type;
                                                if (header === 'Tên lớp') {
                                                    type = 'text';
                                                } else if (header === 'Khối') {
                                                    type = 'grade';
                                                } else if (header === 'Sĩ số') {
                                                    type = 'number';
                                                } else if (header === 'Cơ sở') {
                                                    type = 'campus';
                                                } else {
                                                    type = 'lessonCount';
                                                }
                                                const isValid = validateInput(row[header], type);
                                                return (
                                                    <td key={cellIndex} className={!isValid ? styles.invalidInput : ''}>
                                                        {isEditing ? (
                                                            <input 
                                                                type={type === 'number' || type === 'lessonCount' ? 'number' : 'text'}
                                                                value={row[header] || ''}
                                                                onChange={(e) => handleEdit(rowIndex, header, e.target.value)}
                                                                min={type === 'number' || type === 'lessonCount' ? "1" : undefined}
                                                            />
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

export default MultiClassModal;