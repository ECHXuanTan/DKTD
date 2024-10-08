import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import styles from '../../../../css/Ministry/components/EditTeacherModalStyles.module.css';

const EditTeacherModal = ({ 
    isOpen, 
    onClose, 
    editingTeacher, 
    handleEditInputChange, 
    handleEditSubmit, 
    departments = [], 
    nonSpecializedSubjects = []
}) => {
    const [basicTeachingLessons, setBasicTeachingLessons] = useState(0);
    const [totalReducedLessons, setTotalReducedLessons] = useState(0);

    useEffect(() => {
        if (isOpen) {
            console.log('EditingTeacher when modal is opened:', editingTeacher);
        }
    }, [isOpen, editingTeacher]);

    useEffect(() => {
        setBasicTeachingLessons(editingTeacher.lessonsPerWeek * editingTeacher.teachingWeeks);
        setTotalReducedLessons(editingTeacher.reducedLessonsPerWeek * editingTeacher.reducedWeeks);
    }, [editingTeacher.lessonsPerWeek, editingTeacher.teachingWeeks, editingTeacher.reducedLessonsPerWeek, editingTeacher.reducedWeeks]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        handleEditInputChange(e);
        
        if (name === 'lessonsPerWeek' || name === 'teachingWeeks') {
            const newLessonsPerWeek = name === 'lessonsPerWeek' ? parseInt(value) : editingTeacher.lessonsPerWeek;
            const newTeachingWeeks = name === 'teachingWeeks' ? parseInt(value) : editingTeacher.teachingWeeks;
            setBasicTeachingLessons(newLessonsPerWeek * newTeachingWeeks);
        }
        if (name === 'reducedLessonsPerWeek' || name === 'reducedWeeks') {
            const newReducedLessonsPerWeek = name === 'reducedLessonsPerWeek' ? parseInt(value) : editingTeacher.reducedLessonsPerWeek;
            const newReducedWeeks = name === 'reducedWeeks' ? parseInt(value) : editingTeacher.reducedWeeks;
            setTotalReducedLessons(newReducedLessonsPerWeek * newReducedWeeks);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onClose}
            contentLabel="Cập Nhật Giáo Viên"
            className={styles.modal}
            overlayClassName={styles.overlay}
        >
            <h2 className={styles.modalTitle}>Cập Nhật Giáo Viên</h2>
            <form onSubmit={handleEditSubmit} className={styles.form}>
                <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                        <label htmlFor="name">Tên giáo viên:</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={editingTeacher.name}
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
                            value={editingTeacher.email}
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
                            value={editingTeacher.phone}
                            onChange={handleInputChange}
                        />
                    </div>
                </div>
                <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                        <label htmlFor="position">Chức vụ:</label>
                        <input
                            type="text"
                            id="position"
                            name="position"
                            value={editingTeacher.position}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="department">Khoa:</label>
                        <select
                            id="department"
                            name="department"
                            value={editingTeacher.department}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">Chọn khoa</option>
                            {departments.map((dept) => (
                                <option key={dept._id} value={dept._id}>
                                    {dept.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                        <label htmlFor="teachingSubjects">Môn giảng dạy:</label>
                        <select
                            id="teachingSubjects"
                            name="teachingSubjects"
                            value={editingTeacher.teachingSubjects}
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
                    <div className={styles.formGroup}>
                        <label htmlFor="type">Loại giáo viên:</label>
                        <select
                            id="type"
                            name="type"
                            value={editingTeacher.type}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">Chọn loại giáo viên</option>
                            <option value="Cơ hữu">Cơ hữu</option>
                            <option value="Thỉnh giảng">Thỉnh giảng</option>
                        </select>
                    </div>
                </div>
                {editingTeacher.type === 'Cơ hữu' && (
                    <>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="lessonsPerWeek">Số tiết dạy một tuần:</label>
                                <input
                                    type="number"
                                    id="lessonsPerWeek"
                                    name="lessonsPerWeek"
                                    value={editingTeacher.lessonsPerWeek}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="teachingWeeks">Số tuần dạy:</label>
                                <input
                                    type="number"
                                    id="teachingWeeks"
                                    name="teachingWeeks"
                                    value={editingTeacher.teachingWeeks}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="basicTeachingLessons">Số tiết chuẩn:</label>
                                <input
                                    type="number"
                                    id="basicTeachingLessons"
                                    name="basicTeachingLessons"
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
                                    value={editingTeacher.reducedLessonsPerWeek}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="reducedWeeks">Số tuần giảm:</label>
                                <input
                                    type="number"
                                    id="reducedWeeks"
                                    name="reducedWeeks"
                                    value={editingTeacher.reducedWeeks}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="totalReducedLessons">Tổng số tiết giảm:</label>
                                <input
                                    type="number"
                                    id="totalReducedLessons"
                                    name="totalReducedLessons"
                                    value={totalReducedLessons}
                                    readOnly
                                />
                            </div>
                        </div>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="reductionReason">Nội dung giảm tiết:</label>
                                <textarea
                                    id="reductionReason"
                                    name="reductionReason"
                                    value={editingTeacher.reductionReason}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>
                    </>
                )}
                <div className={styles.formActions}>
                    <button type="submit" className={styles.submitButton}>Cập Nhật Giáo Viên</button>
                    <button type="button" onClick={onClose} className={styles.cancelButton}>Hủy</button>
                </div>
            </form>
        </Modal>
    );
};

export default EditTeacherModal;