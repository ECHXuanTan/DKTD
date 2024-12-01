import React, { useState } from 'react';
import Modal from 'react-modal';
import { Circles } from 'react-loader-spinner';
import { toast } from 'react-toastify';
import { createClass } from '../../../services/classServices';
import styles from '../../../css/Ministry/components/SingleClassModal.module.css';

Modal.setAppElement('#root');

const initialClassState = {
    name: '',
    grade: '',
    campus: '',
    size: '',
    subjects: [{
        subjectId: '',
        periodsPerWeek: '',
        numberOfWeeks: '',
        lessonCount: '',
        isEditing: true,
        isSpecialized: true
    }]
};

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

const SingleClassModal = ({ isOpen, onClose, onClassAdded, subjects }) => {
    const [newClass, setNewClass] = useState(initialClassState);
    const [isCreatingClass, setIsCreatingClass] = useState(false);

    const resetForm = () => {
        setNewClass(initialClassState);
    };

    const calculateLessonCount = (periodsPerWeek, numberOfWeeks) => {
        if (periodsPerWeek && numberOfWeeks) {
            return parseInt(periodsPerWeek) * parseInt(numberOfWeeks);
        }
        return '';
    };

    const handleInputChange = (event, index = 0) => {
        const { name, value } = event.target;
        if (['subjectId', 'periodsPerWeek', 'numberOfWeeks'].includes(name)) {
            const updatedSubjects = [...newClass.subjects];
            updatedSubjects[index] = { 
                ...updatedSubjects[index], 
                [name]: value 
            };

            if (name === 'periodsPerWeek' || name === 'numberOfWeeks') {
                const periodsPerWeek = name === 'periodsPerWeek' ? value : updatedSubjects[index].periodsPerWeek;
                const numberOfWeeks = name === 'numberOfWeeks' ? value : updatedSubjects[index].numberOfWeeks;
                updatedSubjects[index].lessonCount = calculateLessonCount(periodsPerWeek, numberOfWeeks);
            }

            setNewClass(prevState => ({
                ...prevState,
                subjects: updatedSubjects
            }));
        } else if (name === 'size') {
            const numValue = parseInt(value);
            if (numValue < 1) return;
            setNewClass(prevState => ({
                ...prevState,
                [name]: numValue.toString()
            }));
        } else {
            setNewClass(prevState => ({
                ...prevState,
                [name]: value
            }));
        }
    };

    const handleSpecializedChange = (index, isSpecialized) => {
        setNewClass(prevState => {
            const updatedSubjects = [...prevState.subjects];
            updatedSubjects[index] = { 
                ...updatedSubjects[index], 
                isSpecialized: isSpecialized,
                subjectId: '' 
            };
            return {
                ...prevState,
                subjects: updatedSubjects
            };
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const subject = newClass.subjects[0];
        
        if (!subject.subjectId || !subject.periodsPerWeek || !subject.numberOfWeeks || 
            parseInt(subject.periodsPerWeek) < 1 || parseInt(subject.numberOfWeeks) < 1) {
            toast.error('Vui lòng điền đầy đủ thông tin môn học và đảm bảo số tiết một tuần và số tuần lớn hơn hoặc bằng 1.');
            return;
        }
        if (parseInt(newClass.size) < 1) {
            toast.error('Sĩ số phải lớn hơn hoặc bằng 1.');
            return;
        }
    
        setIsCreatingClass(true);
        try {
            const classData = {
                ...newClass,
                grade: parseInt(newClass.grade),
                size: parseInt(newClass.size),
                subjects: [{
                    subjectId: subject.subjectId,
                    periodsPerWeek: parseInt(subject.periodsPerWeek),
                    numberOfWeeks: parseInt(subject.numberOfWeeks),
                    lessonCount: parseInt(subject.lessonCount),
                    isSpecialized: subject.isSpecialized
                }]
            };
            await createClass(classData);
            toast.success('Tạo lớp mới thành công!');
            onClassAdded();
            handleClose();
        } catch (error) {
            console.error('Error creating class:', error);
            toast.error(error.response?.data?.message || 'Đã có lỗi xảy ra');
        } finally {
            setIsCreatingClass(false);
        }
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={handleClose}
            contentLabel="Tạo Lớp Mới"
            className={styles.modal}
            overlayClassName={styles.overlay}
        >
            <h2 className={styles.modalTitle}>Tạo Lớp Mới</h2>
            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                        <label htmlFor="name">Tên lớp:</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={newClass.name}
                            onChange={(e) => handleInputChange(e)}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="size">Sĩ số:</label>
                        <input
                            type="number"
                            id="size"
                            name="size"
                            value={newClass.size}
                            onChange={(e) => handleInputChange(e)}
                            required
                            min="1"
                        />
                    </div>
                </div>
                <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                        <label htmlFor="grade">Khối:</label>
                        <select
                            id="grade"
                            name="grade"
                            value={newClass.grade}
                            onChange={(e) => handleInputChange(e)}
                            required
                        >
                            <option value="">Chọn khối</option>
                            <option value="10">Khối 10</option>
                            <option value="11">Khối 11</option>
                            <option value="12">Khối 12</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="campus">Cơ sở:</label>
                        <select
                            id="campus"
                            name="campus"
                            value={newClass.campus}
                            onChange={(e) => handleInputChange(e)}
                            required
                        >
                            <option value="">Chọn cơ sở</option>
                            <option value="Quận 5">Quận 5</option>
                            <option value="Thủ Đức">Thủ Đức</option>
                        </select>
                    </div>
                </div>

                <div className={styles.subjectsContainer}>
                    <h3>Môn học</h3>
                    <div className={styles.subjectItem}>
                        <FilterPanel
                            isSpecialized={newClass.subjects[0].isSpecialized}
                            onChange={(isSpecialized) => handleSpecializedChange(0, isSpecialized)}
                        />
                        <div className={styles.subjectInputGroup}>
                            <label htmlFor="subjectId">Môn học:</label>
                            <select
                                id="subjectId"
                                name="subjectId"
                                value={newClass.subjects[0].subjectId}
                                onChange={(e) => handleInputChange(e, 0)}
                                required
                            >
                                <option value="">Chọn môn học</option>
                                {subjects
                                    .filter(subj => subj.isSpecialized === newClass.subjects[0].isSpecialized)
                                    .map((subj) => (
                                        <option key={subj._id} value={subj._id}>
                                            {subj.name}
                                        </option>
                                    ))
                                }
                            </select>
                        </div>
                        <div className={styles.subjectInputGroup}>
                            <label htmlFor="periodsPerWeek">Số tiết/tuần:</label>
                            <input
                                type="number"
                                id="periodsPerWeek"
                                name="periodsPerWeek"
                                value={newClass.subjects[0].periodsPerWeek}
                                onChange={(e) => handleInputChange(e, 0)}
                                required
                                min="1"
                            />
                        </div>
                        <div className={styles.subjectInputGroup}>
                            <label htmlFor="numberOfWeeks">Số tuần:</label>
                            <input
                                type="number"
                                id="numberOfWeeks"
                                name="numberOfWeeks"
                                value={newClass.subjects[0].numberOfWeeks}
                                onChange={(e) => handleInputChange(e, 0)}
                                required
                                min="1"
                            />
                        </div>
                        <div className={styles.subjectInputGroup}>
                            <label>Tổng số tiết:</label>
                            <input 
                                type="text"
                                value={newClass.subjects[0].lessonCount}
                                disabled
                                className={styles.disabledInput}
                            />
                        </div>
                    </div>
                </div>

                <div className={styles.buttonGroup}>
                    <button type="submit" className={styles.submitButton} disabled={isCreatingClass}>
                        {isCreatingClass ? (
                            <Circles color="#FFF" height={24} width={24} />
                        ) : (
                            'Tạo Lớp'
                        )}
                    </button>
                    <button type="button" onClick={handleClose} className={styles.cancelButton}>
                        Hủy
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default SingleClassModal;