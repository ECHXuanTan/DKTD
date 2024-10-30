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
    const [periodsPerWeek, setPeriodsPerWeek] = useState('3');
    const [numberOfWeeks, setNumberOfWeeks] = useState('18');
    const [error, setError] = useState('');
    const [isSpecialized, setIsSpecialized] = useState(true);

    useEffect(() => {
        setSelectedSubject('');
    }, [isSpecialized]);

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
        if (selectedSubject && periodsPerWeek && numberOfWeeks && 
            parseInt(periodsPerWeek) > 0 && parseInt(numberOfWeeks) > 0) {
            onAddSubject({
                subjectId: selectedSubject,
                periodsPerWeek: parseInt(periodsPerWeek),
                numberOfWeeks: parseInt(numberOfWeeks)
            });
        } else {
            setError('Vui lòng điền đầy đủ thông tin và đảm bảo các giá trị là số dương');
        }
    };

    const filteredSubjects = subjects.filter(subject => 
        subject.isSpecialized === isSpecialized && 
        (currentClass?.subjects 
            ? !currentClass.subjects.some(classSubject => classSubject.subject._id === subject._id)
            : true)
    );

    if (!currentClass) {
        return null;
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
                <div>
                    <p>Tổng số tiết: {periodsPerWeek && numberOfWeeks ? parseInt(periodsPerWeek) * parseInt(numberOfWeeks) : 0}</p>
                </div>
                {error && <p className={styles.errorMessage}>{error}</p>}
                <div className={styles.buttonGroup}>
                    <button type="submit" disabled={!selectedSubject || !periodsPerWeek || !numberOfWeeks || !!error}>Thêm</button>
                    <button type="button" onClick={onClose}>Hủy</button>
                </div>
            </form>
        </Modal>
    );
};

export default AddSubjectModal;
