import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import styles from '../../../../css/Ministry/components/ModalStyles.module.css';

const EditSubjectModal = ({ isOpen, onClose, onUpdateSubject, subject }) => {
    const [periodsPerWeek, setPeriodsPerWeek] = useState('');
    const [numberOfWeeks, setNumberOfWeeks] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (subject) {
            setPeriodsPerWeek(subject.periodsPerWeek?.toString() || '3');
            setNumberOfWeeks(subject.numberOfWeeks?.toString() || '18');
            setError('');
        }
    }, [subject]);

    const handlePeriodsChange = (e) => {
        const value = e.target.value;
        if (value === '' || (parseInt(value) > 0 && Number.isInteger(Number(value)))) {
            setPeriodsPerWeek(value);
            setError('');
        } else {
            setError('Số tiết/tuần phải lớn hơn 0');
        }
    };

    const handleWeeksChange = (e) => {
        const value = e.target.value;
        if (value === '' || (parseInt(value) > 0 && Number.isInteger(Number(value)))) {
            setNumberOfWeeks(value);
            setError('');
        } else {
            setError('Số tuần phải lớn hơn 0');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const periods = parseInt(periodsPerWeek);
        const weeks = parseInt(numberOfWeeks);
        
        if (!periods || !weeks || periods <= 0 || weeks <= 0) {
            setError('Vui lòng điền đầy đủ thông tin và đảm bảo các giá trị là số dương');
            return;
        }

        onUpdateSubject({
            periodsPerWeek: periods,
            numberOfWeeks: weeks
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onClose}
            contentLabel="Edit Subject"
            className={styles.modal}
            overlayClassName={styles.overlay}
        >
            <h2>Điều chỉnh khai báo môn học</h2>
            <p>Môn học: <span style={{fontWeight: '600'}}>{subject?.subject?.name}</span></p>
            <form onSubmit={handleSubmit}>
                <label>
                    Số tiết/tuần:
                    <input
                        type="number"
                        value={periodsPerWeek}
                        onChange={handlePeriodsChange}
                        min="1"
                        step="1"
                        required
                    />
                </label>
                <label>
                    Số tuần:
                    <input
                        type="number"
                        value={numberOfWeeks}
                        onChange={handleWeeksChange}
                        min="1"
                        step="1"
                        required
                    />
                </label>
                <div className={styles.calculatedLessons}>
                    <p>Tổng số tiết: {periodsPerWeek && numberOfWeeks ? parseInt(periodsPerWeek) * parseInt(numberOfWeeks) : 0}</p>
                </div>
                {error && <p className={styles.errorMessage}>{error}</p>}
                <div className={styles.buttonGroup}>
                    <button 
                        type="submit" 
                        disabled={!!error || !periodsPerWeek || !numberOfWeeks}
                        className={styles.primaryButton}
                    >
                        Cập nhật
                    </button>
                    <button 
                        type="button" 
                        onClick={onClose}
                        className={styles.secondaryButton}
                    >
                        Hủy
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default EditSubjectModal;