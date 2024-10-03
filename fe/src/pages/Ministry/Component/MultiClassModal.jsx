import React, { useState } from 'react';
import Modal from 'react-modal';
import { Circles } from 'react-loader-spinner';
import { toast } from 'react-toastify';
import { createClasses } from '../../../services/classServices';
import styles from '../../../css/Ministry/Class.module.css';
import { read, utils, write } from 'xlsx';
import FileSaver from 'file-saver';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

Modal.setAppElement('#root');

const MultiClassModal = ({ isOpen, onClose, onClassesAdded }) => {
    const [excelFile, setExcelFile] = useState(null);
    const [excelData, setExcelData] = useState(null);
    const [isUploadingExcel, setIsUploadingExcel] = useState(false);

    const handleDownloadTemplate = () => {
        const subjectOrder = [
            'Toán', 'Tin học', 'Vật lý', 'Hóa học', 'Sinh học', 'Công nghệ', 'Tiếng Anh',
            'Ngữ văn', 'Lịch sử', 'Địa lý', 'Giáo dục kinh tế - Pháp luật', 'Giáo dục Quốc phòng', 'Thể dục'
        ];

        const data = [
            ['Tên lớp', 'Khối', 'Cơ sở', ...subjectOrder],
            ['10A1', '10', 'Quận 5', 45, 30, 30, 30, 30, 15, 45, 40, 30, 30, 15, 15, 30],
            ['11B2', '11', 'Thủ Đức', 45, 30, 30, 30, 30, 15, 45, 40, 30, 30, 15, 15, 30],
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
            const jsonData = utils.sheet_to_json(worksheet);
            
            const processedData = jsonData.map(row => {
                const { 'Tên lớp': name, 'Khối': grade, 'Cơ sở': campus, ...subjects } = row;
                return { name, grade, campus, ...subjects };
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

        const expectedSubjects = [
            'Toán', 'Tin học', 'Vật lý', 'Hóa học', 'Sinh học', 'Công nghệ', 'Tiếng Anh',
            'Ngữ văn', 'Lịch sử', 'Địa lý', 'Giáo dục kinh tế - Pháp luật', 'Giáo dục Quốc phòng', 'Thể dục'
        ];

        const processedClasses = excelData.map(classData => {
            const { name, grade, campus, ...subjectData } = classData;
            const subjects = [];

            for (const subjectName of expectedSubjects) {
                const lessonCount = parseInt(subjectData[subjectName], 10);
                if (!isNaN(lessonCount) && lessonCount > 0) {
                    subjects.push({
                        name: subjectName,
                        lessonCount: lessonCount
                    });
                }
            }

            return { name, grade, campus, subjects };
        });

        const invalidClasses = processedClasses.filter(classData => 
            !classData.name || !classData.grade || !classData.campus || classData.subjects.length === 0
        );

        if (invalidClasses.length > 0) {
            const invalidClassNames = invalidClasses.map(c => c.name || 'Unnamed').join(', ');
            toast.error(`Các lớp sau không hợp lệ hoặc không có môn học: ${invalidClassNames}`);
            return;
        }

        setIsUploadingExcel(true);
        try {
            await createClasses(processedClasses);
            toast.success('Tải lên và tạo lớp thành công!');
            onClassesAdded();
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
                {excelData && (
                    <div className={styles.previewContainer}>
                        <div className={styles.previewHeader}>
                            <h3>Xem trước dữ liệu:</h3>
                            <button 
                                onClick={() => {
                                    setExcelData(null);
                                    setExcelFile(null);
                                }}
                                className={styles.closePreviewButton}
                            >
                                Đóng xem trước
                            </button>
                        </div>
                        <div className={styles.tableWrapper}>
                            <table className={styles.previewTable}>
                                <thead>
                                    <tr>
                                        <th>Tên lớp</th>
                                        <th>Khối</th>
                                        <th>Cơ sở</th>
                                        <th>Toán</th>
                                        <th>Tin học</th>
                                        <th>Vật lý</th>
                                        <th>Hóa học</th>
                                        <th>Sinh học</th>
                                        <th>Công nghệ</th>
                                        <th>Tiếng Anh</th>
                                        <th>Ngữ văn</th>
                                        <th>Lịch sử</th>
                                        <th>Địa lý</th>
                                        <th>Giáo dục kinh tế - Pháp luật</th>
                                        <th>Giáo dục Quốc phòng</th>
                                        <th>Thể dục</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {excelData.map((row, index) => (
                                        <tr key={index}>
                                            <td>{row['name'] || '-'}</td>
                                            <td>{row['grade'] || '-'}</td>
                                            <td>{row['campus'] || '-'}</td>
                                            <td className={!row['Toán'] ? styles.emptyCell : ''}>{row['Toán'] || '-'}</td>
                                            <td className={!row['Tin học'] ? styles.emptyCell : ''}>{row['Tin học'] || '-'}</td>
                                            <td className={!row['Vật lý'] ? styles.emptyCell : ''}>{row['Vật lý'] || '-'}</td>
                                            <td className={!row['Hóa học'] ? styles.emptyCell : ''}>{row['Hóa học'] || '-'}</td>
                                            <td className={!row['Sinh học'] ? styles.emptyCell : ''}>{row['Sinh học'] || '-'}</td>
                                            <td className={!row['Công nghệ'] ? styles.emptyCell : ''}>{row['Công nghệ'] || '-'}</td>
                                            <td className={!row['Tiếng Anh'] ? styles.emptyCell : ''}>{row['Tiếng Anh'] || '-'}</td>
                                            <td className={!row['Ngữ văn'] ? styles.emptyCell : ''}>{row['Ngữ văn'] || '-'}</td>
                                            <td className={!row['Lịch sử'] ? styles.emptyCell : ''}>{row['Lịch sử'] || '-'}</td>
                                            <td className={!row['Địa lý'] ? styles.emptyCell : ''}>{row['Địa lý'] || '-'}</td>
                                            <td className={!row['Giáo dục kinh tế - Pháp luật'] ? styles.emptyCell : ''}>{row['Giáo dục kinh tế - Pháp luật'] || '-'}</td>
                                            <td className={!row['Giáo dục Quốc phòng'] ? styles.emptyCell : ''}>{row['Giáo dục Quốc phòng'] || '-'}</td>
                                            <td className={!row['Thể dục'] ? styles.emptyCell : ''}>{row['Thể dục'] || '-'}</td>
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
                    {excelData && (
                        <button type="button" onClick={handleExcelUpload} className={styles.submitButton} disabled={isUploadingExcel}>
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
                            onClose();
                            setExcelData(null);
                            setExcelFile(null);
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