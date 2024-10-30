import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { Circles } from 'react-loader-spinner';
import { toast } from 'react-toastify';
import { createClass } from '../../../services/classServices';
import styles from '../../../css/Ministry/components/SingleClassModal.module.css';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

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
    const [selectedSubjects, setSelectedSubjects] = useState([]);

    const updateSelectedSubjects = (subjects) => {
        const selected = subjects
            .filter(subject => subject.subjectId)
            .map(subject => subject.subjectId);
        setSelectedSubjects(selected);
    };

    useEffect(() => {
        updateSelectedSubjects(newClass.subjects);
    }, [newClass.subjects]);

    const resetForm = () => {
        setNewClass(initialClassState);
        setSelectedSubjects([]);
    };

    const calculateLessonCount = (periodsPerWeek, numberOfWeeks) => {
        if (periodsPerWeek && numberOfWeeks) {
            return parseInt(periodsPerWeek) * parseInt(numberOfWeeks);
        }
        return '';
    };

    const handleInputChange = (event, index) => {
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

    const handleAddSubject = () => {
        const lastSubject = newClass.subjects[newClass.subjects.length - 1];
        if (!lastSubject.subjectId || !lastSubject.periodsPerWeek || !lastSubject.numberOfWeeks) {
            toast.error('Vui lòng điền đầy đủ thông tin môn học trước khi thêm môn mới.');
            return;
        }
        setNewClass(prevState => ({
            ...prevState,
            subjects: [...prevState.subjects, {
                subjectId: '',
                periodsPerWeek: '',
                numberOfWeeks: '',
                lessonCount: '',
                isEditing: true,
                isSpecialized: true
            }]
        }));
    };

    const handleRemoveSubject = (index) => {
        setNewClass(prevState => {
            const updatedSubjects = prevState.subjects.filter((_, i) => i !== index);
            if (updatedSubjects.length === 0) {
                return {
                    ...prevState,
                    subjects: [{
                        subjectId: '',
                        periodsPerWeek: '',
                        numberOfWeeks: '',
                        lessonCount: '',
                        isEditing: true,
                        isSpecialized: true
                    }]
                };
            }
            return {
                ...prevState,
                subjects: updatedSubjects
            };
        });
    };

    const handleEditSubject = (index) => {
        setNewClass(prevState => {
            const updatedSubjects = [...prevState.subjects];
            updatedSubjects[index] = { ...updatedSubjects[index], isEditing: true };
            return {
                ...prevState,
                subjects: updatedSubjects
            };
        });
    };
    
    const handleSaveSubject = (index) => {
        const subject = newClass.subjects[index];
        if (!subject.subjectId || !subject.periodsPerWeek || !subject.numberOfWeeks) {
            toast.error('Vui lòng điền đầy đủ thông tin môn học trước khi lưu.');
            return;
        }
        if (parseInt(subject.periodsPerWeek) < 1 || parseInt(subject.numberOfWeeks) < 1) {
            toast.error('Số tiết một tuần và số tuần phải lớn hơn hoặc bằng 1.');
            return;
        }
        setNewClass(prevState => {
            const updatedSubjects = [...prevState.subjects];
            updatedSubjects[index] = { ...updatedSubjects[index], isEditing: false };
            return {
                ...prevState,
                subjects: updatedSubjects
            };
        });
    };

    const handleCancelSubject = (index) => {
        setNewClass(prevState => {
            const updatedSubjects = prevState.subjects.filter((_, i) => i !== index);
            return {
                ...prevState,
                subjects: updatedSubjects
            };
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const isAllSubjectsValid = newClass.subjects.every(subject => 
            subject.subjectId && 
            subject.periodsPerWeek && 
            subject.numberOfWeeks && 
            parseInt(subject.periodsPerWeek) >= 1 && 
            parseInt(subject.numberOfWeeks) >= 1
        );
        
        if (!isAllSubjectsValid) {
            toast.error('Vui lòng điền đầy đủ thông tin cho tất cả các môn học và đảm bảo số tiết một tuần và số tuần lớn hơn hoặc bằng 1.');
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
                subjects: newClass.subjects.map(subject => ({
                    subjectId: subject.subjectId,
                    periodsPerWeek: parseInt(subject.periodsPerWeek),
                    numberOfWeeks: parseInt(subject.numberOfWeeks),
                    lessonCount: parseInt(subject.lessonCount),
                    isSpecialized: subject.isSpecialized
                }))
            };
            await createClass(classData);
            toast.success('Tạo lớp mới thành công!');
            onClassAdded();
            handleClose();
        } catch (error) {
            console.error('Error creating class:', error);
            if (error.response && error.response.data && error.response.data.message.includes('Tên lớp đã tồn tại')) {
                toast.error(`Lớp ${newClass.name} đã tồn tại.`);
            } else {
                toast.error('Đã có lỗi xảy ra');
            }
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
                    <h3>Danh sách môn học</h3>
                    {newClass.subjects.map((subject, index) => (
                        <div key={index} className={styles.subjectItem}>
                            {!subject.isEditing ? (
                                <div className={styles.subjectSummary}>
                                    <span>
                                        {subjects.find(s => s._id === subject.subjectId)?.name} - {subject.periodsPerWeek} tiết/tuần x {subject.numberOfWeeks} tuần = {subject.lessonCount} tiết
                                        {subject.isSpecialized ? ' (Chuyên)' : ' (Không chuyên)'}
                                    </span>
                                    <div>
                                        <button type="button" onClick={() => handleEditSubject(index)} className={styles.editButton}>
                                            <EditIcon />
                                        </button>
                                        <button type="button" onClick={() => handleRemoveSubject(index)} className={styles.removeButton}>
                                            <DeleteIcon />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <FilterPanel
                                        isSpecialized={subject.isSpecialized}
                                        onChange={(isSpecialized) => handleSpecializedChange(index, isSpecialized)}
                                    />
                                    <div className={styles.subjectInputGroup}>
                                        <label htmlFor={`subjectId-${index}`}>Môn học:</label>
                                        <select
                                            id={`subjectId-${index}`}
                                            name="subjectId"
                                            value={subject.subjectId}
                                            onChange={(e) => handleInputChange(e, index)}
                                            required
                                        >
                                            <option value="">Chọn môn học</option>
                                            {subjects
                                                .filter(subj => (!selectedSubjects.includes(subj._id) || subj._id === subject.subjectId) && subj.isSpecialized === subject.isSpecialized)
                                                .map((subj) => (
                                                    <option key={subj._id} value={subj._id}>
                                                        {subj.name}
                                                    </option>
                                                ))
                                            }
                                        </select>
                                    </div>
                                    <div className={styles.subjectInputGroup}>
                                        <label htmlFor={`periodsPerWeek-${index}`}>Số tiết/tuần:</label>
                                        <input
                                            type="number"
                                            id={`periodsPerWeek-${index}`}
                                            name="periodsPerWeek"
                                            value={subject.periodsPerWeek}
                                            onChange={(e) => handleInputChange(e, index)}
                                            required
                                            min="1"
                                        />
                                    </div>
                                    <div className={styles.subjectInputGroup}>
                                        <label htmlFor={`numberOfWeeks-${index}`}>Số tuần:</label>
                                        <input
                                            type="number"
                                            id={`numberOfWeeks-${index}`}
                                            name="numberOfWeeks"
                                            value={subject.numberOfWeeks}
                                            onChange={(e) => handleInputChange(e, index)}
                                            required
                                            min="1"
                                        />
                                    </div>
                                    <div className={styles.subjectInputGroup}>
                                        <label>Tổng số tiết:</label>
                                        <input type="text"
                                            value={subject.lessonCount}
                                            disabled
                                            className={styles.disabledInput}
                                        />
                                    </div>
                                    <button type="button" onClick={() => handleSaveSubject(index)} className={styles.saveButton}>
                                        Lưu
                                    </button>
                                    {index > 0 && (
                                        <button type="button" onClick={() => handleCancelSubject(index)} className={styles.cancelButton}>
                                            Hủy
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </div>

                <div className={styles.buttonGroup}>
                    <button type="button" onClick={handleAddSubject} className={styles.addButton}>
                        <AddIcon /> Thêm môn học
                    </button>
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