import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import styles from '../../../css/Ministry/components/ModalStyles.module.css';

const FilterPanel = ({ isSpecialized, onChange }) => {
    return (
        <div className={styles.filterPanel}>
            <button
                className={`${styles.filterButton} ${isSpecialized ? styles.active : ''}`}
                onClick={() => onChange(true)}
            >
                Môn chuyên
            </button>
            <button
                className={`${styles.filterButton} ${!isSpecialized ? styles.active : ''}`}
                onClick={() => onChange(false)}
            >
                Môn không chuyên
            </button>
        </div>
    );
};

const AddSubjectModal = ({ isOpen, onClose, onAddSubject, subjects, currentClass }) => {
    const [selectedSubject, setSelectedSubject] = useState('');
    const [lessonCount, setLessonCount] = useState('');
    const [error, setError] = useState('');
    const [isSpecialized, setIsSpecialized] = useState(true);

    useEffect(() => {
        setSelectedSubject('');
    }, [isSpecialized]);

    const handleLessonCountChange = (e) => {
        const value = e.target.value;
        if (value === '' || (parseInt(value) > 0 && Number.isInteger(Number(value)))) {
            setLessonCount(value);
            setError('');
        } else {
            setError('Số tiết phải lớn hơn 0');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (selectedSubject && lessonCount && parseInt(lessonCount) > 0) {
            onAddSubject(selectedSubject, lessonCount, isSpecialized);
        } else {
            setError('Vui lòng chọn môn học và nhập số tiết lớn hơn 0');
        }
    };

    const filteredSubjects = subjects.filter(subject => 
        subject.isSpecialized === isSpecialized && 
        (currentClass?.subjects 
            ? !currentClass.subjects.some(classSubject => classSubject.subject._id === subject._id)
            : true)
    );

    if (!currentClass) {
        return null; // or return a loading state, or an error message
    }

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onClose}
            contentLabel="Add Subject"
            className={styles.modal}
            overlayClassName={styles.overlay}
        >
            <h2>Thêm môn học mới cho lớp {currentClass.name}</h2>
            <form onSubmit={handleSubmit}>
                <FilterPanel
                    isSpecialized={isSpecialized}
                    onChange={setIsSpecialized}
                />
                <label>
                    Chọn môn học:
                    <select 
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        required
                    >
                        <option value="">Chọn môn học</option>
                        {filteredSubjects.map((subject) => (
                            <option key={subject._id} value={subject._id}>
                                {subject.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    Số tiết học:
                    <input
                        type="number"
                        value={lessonCount}
                        onChange={handleLessonCountChange}
                        min="1"
                        step="1"
                        required
                    />
                </label>
                {error && <p className={styles.errorMessage}>{error}</p>}
                <div className={styles.buttonGroup}>
                    <button type="submit" disabled={!selectedSubject || !lessonCount || !!error}>Thêm</button>
                    <button type="button" onClick={onClose}>Hủy</button>
                </div>
            </form>
        </Modal>
    );
};

export default AddSubjectModal;