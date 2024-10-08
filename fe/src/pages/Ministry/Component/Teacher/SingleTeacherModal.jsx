import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import styles from '../../../../css/Ministry/components/TeacherModalStyles.module.css';

const SingleTeacherModal = ({ isOpen, onClose, newTeacher, handleInputChange, handleSubmit, departments, nonSpecializedSubjects }) => {
    const [basicTeachingLessons, setBasicTeachingLessons] = useState(0);
    const [totalReducedLessons, setTotalReducedLessons] = useState(0);
    const [phoneError, setPhoneError] = useState('');

    useEffect(() => {
        if (newTeacher.type === 'Cơ hữu') {
            setBasicTeachingLessons(newTeacher.lessonsPerWeek * newTeacher.teachingWeeks);
            setTotalReducedLessons(newTeacher.reducedLessonsPerWeek * newTeacher.reducedWeeks);
        }
    }, [newTeacher.lessonsPerWeek, newTeacher.teachingWeeks, newTeacher.reducedLessonsPerWeek, newTeacher.reducedWeeks, newTeacher.type]);

    const validatePhoneNumber = (phone) => {
        if (!phone) return true;
        const phoneRegex = /^(0|\+84)(\s|\.)?((3[2-9])|(5[689])|(7[06-9])|(8[1-689])|(9[0-46-9]))(\d)(\s|\.)?(\d{3})(\s|\.)?(\d{3})$/;
        return phoneRegex.test(phone);
    };

    const handlePhoneChange = (e) => {
        const { name, value } = e.target;
        handleInputChange(e);
        if (value && !validatePhoneNumber(value)) {
            setPhoneError('Số điện thoại không hợp lệ');
        } else {
            setPhoneError('');
        }
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (newTeacher.phone && !validatePhoneNumber(newTeacher.phone)) {
            setPhoneError('Số điện thoại không hợp lệ');
            return;
        }
        handleSubmit(e);
    };

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onClose}
            contentLabel="Tạo Giáo Viên Mới"
            className={styles.modal}
            overlayClassName={styles.overlay}
        >
            <h2 className={styles.modalTitle}>Tạo Giáo Viên Mới</h2>
            <form onSubmit={handleFormSubmit} className={styles.form}>
                <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                        <label htmlFor="name">Họ và tên giáo viên:</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={newTeacher.name}
                            className={styles.inputName}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                </div>
                <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                        <label htmlFor="email">Email:</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={newTeacher.email}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="phone">Số điện thoại:</label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={newTeacher.phone}
                            onChange={handlePhoneChange}
                        />
                        {phoneError && <span className={styles.error}>{phoneError}</span>}
                    </div>
                </div>
                <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                        <label htmlFor="department">Tổ bộ môn:</label>
                        <select
                            id="department"
                            name="department"
                            value={newTeacher.department}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">Chọn Tổ bộ môn</option>
                            {departments
                                .filter(dept => dept.name !== "Tổ Giáo vụ – Đào tạo")
                                .map((dept) => (
                                    <option key={dept._id} value={dept._id}>
                                        {dept.name}
                                    </option>
                                ))}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="type">Loại giáo viên:</label>
                        <select
                            id="type"
                            name="type"
                            value={newTeacher.type}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">Chọn loại giáo viên</option>
                            <option value="Cơ hữu">Cơ hữu</option>
                            <option value="Thỉnh giảng">Thỉnh giảng</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="teachingSubjects">Môn học giảng dạy:</label>
                        <select
                            id="teachingSubjects"
                            name="teachingSubjects"
                            value={newTeacher.teachingSubjects || ''}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">Chọn môn học</option>
                            {nonSpecializedSubjects.map((subject) => (
                                <option key={subject._id} value={subject._id}>
                                    {subject.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                {newTeacher.type === 'Cơ hữu' && (
                    <>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="lessonsPerWeek">Số tiết dạy một tuần:</label>
                                <input
                                    type="number"
                                    id="lessonsPerWeek"
                                    name="lessonsPerWeek"
                                    value={newTeacher.lessonsPerWeek}
                                    onChange={handleInputChange}
                                    required
                                    min="1"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="teachingWeeks">Số tuần dạy:</label>
                                <input
                                    type="number"
                                    id="teachingWeeks"
                                    name="teachingWeeks"
                                    value={newTeacher.teachingWeeks}
                                    onChange={handleInputChange}
                                    required
                                    min="1"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="basicTeachingLessons">Số tiết chuẩn:</label>
                                <input
                                    type="number"
                                    id="basicTeachingLessons"
                                    value={basicTeachingLessons}
                                    readOnly
                                />
                            </div>
                        </div>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="reducedLessonsPerWeek">Số tiết giảm một tuần:</label>
                                <input
                                    type="number"
                                    id="reducedLessonsPerWeek"
                                    name="reducedLessonsPerWeek"
                                    value={newTeacher.reducedLessonsPerWeek}
                                    onChange={handleInputChange}
                                    min="0"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="reducedWeeks">Số tuần giảm:</label>
                                <input
                                    type="number"
                                    id="reducedWeeks"
                                    name="reducedWeeks"
                                    value={newTeacher.reducedWeeks}
                                    onChange={handleInputChange}
                                    min="0"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="totalReducedLessons">Tổng số tiết giảm:</label>
                                <input
                                    type="number"
                                    id="totalReducedLessons"
                                    value={totalReducedLessons}
                                    readOnly
                                />
                            </div>
                        </div>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="reductionReason">Nội dung giảm:</label>
                                <textarea
                                    id="reductionReason"
                                    name="reductionReason"
                                    value={newTeacher.reductionReason}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>
                    </>
                )}
                <div className={styles.formActions}>
                    <button type="submit" className={styles.submitButton}>Tạo Giáo Viên</button>
                    <button type="button" onClick={onClose} className={styles.cancelButton}>Hủy</button>
                </div>
            </form>
        </Modal>
    );
};

export default SingleTeacherModal;