import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import styles from '../../../css/Ministry/components/ModalStyles.module.css';

const EditSubjectModal = ({ isOpen, onClose, onUpdateSubject, subject }) => {
    const [newLessonCount, setNewLessonCount] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (subject) {
            setNewLessonCount(subject.lessonCount);
            setError('');
        }
    }, [subject]);

    const handleInputChange = (e) => {
        const value = e.target.value;
        if (value === '' || (parseInt(value) > 0 && Number.isInteger(Number(value)))) {
            setNewLessonCount(value);
            setError('');
        } else {
            setError('Số tiết phải lớn hơn 0');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (newLessonCount && parseInt(newLessonCount) > 0) {
            onUpdateSubject(newLessonCount);
        } else {
            setError('Số tiết phải lớn hơn 0');
        }
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
            <p>Môn học: <span style={{fontWeight: '600'}}>{subject?.subject.name}</span></p>
            <form onSubmit={handleSubmit}>
                <label>
                    Khai báo tiết học:
                    <input
                        type="number"
                        value={newLessonCount}
                        onChange={handleInputChange}
                        min="1"
                        step="1"
                        required
                    />
                </label>
                {error && <p className={styles.errorMessage}>{error}</p>}
                <div className={styles.buttonGroup}>
                    <button type="submit" disabled={!!error || !newLessonCount}>Cập nhật</button>
                    <button type="button" onClick={onClose}>Hủy</button>
                </div>
            </form>
        </Modal>
    );
};

export default EditSubjectModal;