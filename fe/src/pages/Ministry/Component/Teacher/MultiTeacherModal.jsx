import React from 'react';
import Modal from 'react-modal';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import styles from '../../../../css/Ministry/components/MultiTeacherModal.module.css';

const MultiTeacherModal = ({ 
    isOpen, 
    onClose, 
    excelData, 
    setExcelData, 
    setExcelFile,
    handleFileChange, 
    handleUpload, 
    handleDownloadTemplate 
}) => {
    const handleClosePreview = () => {
        if (setExcelData && setExcelFile) {
            setExcelData(null);
            setExcelFile(null);
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
                    <label htmlFor="excel-upload">Chọn file Excel:</label>
                    <input
                        type="file"
                        id="excel-upload"
                        accept=".xlsx, .xls"
                        onChange={handleFileChange}
                    />
                </div>
                {excelData && (
                    <div className={styles.previewContainer}>
                        <div className={styles.previewHeader}>
                            <h3>Xem trước dữ liệu:</h3>
                            <button 
                                onClick={handleClosePreview}
                                className={styles.closePreviewButton}
                                aria-label="Đóng xem trước"
                            >
                                <CloseIcon />
                            </button>
                        </div>
                        <div className={styles.tableWrapper}>
                            <table className={styles.previewTable}>
                                <thead>
                                    <tr>
                                        <th>Email</th>
                                        <th>Tên</th>
                                        <th>Số điện thoại</th>
                                        <th>Chức vụ</th>
                                        <th>Khoa</th>
                                        <th>Loại</th>
                                        <th>Môn giảng dạy</th>
                                        <th>Số tiết/tuần</th>
                                        <th>Số tuần dạy</th>
                                        <th>Số tiết giảm/tuần</th>
                                        <th>Số tuần giảm</th>
                                        <th>Lý do giảm</th>
                                        <th>Lớp chủ nhiệm</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {excelData.map((row, index) => (
                                        <tr key={index}>
                                            <td>{row.email}</td>
                                            <td>{row.name}</td>
                                            <td>{row.phone}</td>
                                            <td>{row.position}</td>
                                            <td>{row.department}</td>
                                            <td>{row.type}</td>
                                            <td>{row.teachingSubjects}</td>
                                            <td>{row.lessonsPerWeek}</td>
                                            <td>{row.teachingWeeks}</td>
                                            <td>{row.reducedLessonsPerWeek}</td>
                                            <td>{row.reducedWeeks}</td>
                                            <td>{row.reductionReason}</td>
                                            <td>{row.homeroom}</td>
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
                        <button type="button" onClick={handleUpload} className={styles.submitButton}>
                            <CloudUploadIcon /> Tải lên
                        </button>
                    )}
                    <button 
                        type="button" 
                        onClick={onClose} 
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