import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { toast } from 'react-toastify';
import { updateTeacher } from '../../../../services/teacherService';
import { deleteHomeroom } from '../../../../services/homeroomService';
import styles from '../../../../css/Ministry/components/EditTeacherModalStyles.module.css';

const EditTeacherModal = ({ 
    isOpen, 
    onClose, 
    editingTeacher, 
    departments = [], 
    nonSpecializedSubjects = [],
    onTeacherUpdated
}) => {
    const [teacher, setTeacher] = useState(editingTeacher);
    const [basicTeachingLessons, setBasicTeachingLessons] = useState(0);
    const [totalReducedLessons, setTotalReducedLessons] = useState(0);
    const [phoneError, setPhoneError] = useState('');
    const [isHomeroom, setIsHomeroom] = useState(false);

    useEffect(() => {
        if (isOpen && editingTeacher) {
            setTeacher(editingTeacher);
            const lessonsPerWeek = parseInt(editingTeacher.lessonsPerWeek) || 0;
            const teachingWeeks = parseInt(editingTeacher.teachingWeeks) || 0;
            const reducedLessonsPerWeek = parseInt(editingTeacher.reducedLessonsPerWeek) || 0;
            const reducedWeeks = parseInt(editingTeacher.reducedWeeks) || 0;

            setBasicTeachingLessons(lessonsPerWeek * teachingWeeks);
            setTotalReducedLessons(reducedLessonsPerWeek * reducedWeeks);
            setIsHomeroom(!!editingTeacher.homeroom);
        }
    }, [isOpen, editingTeacher]);

    const validatePhoneNumber = (phone) => {
        if (!phone) return true;
        const phoneRegex = /^(0|\+84)(\s|\.)?((3[2-9])|(5[689])|(7[06-9])|(8[1-689])|(9[0-46-9]))(\d)(\s|\.)?(\d{3})(\s|\.)?(\d{3})$/;
        return phoneRegex.test(phone);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setTeacher(prev => ({ ...prev, [name]: value }));
        
        if (name === 'phone') {
            if (value && !validatePhoneNumber(value)) {
                setPhoneError('Số điện thoại không hợp lệ');
            } else {
                setPhoneError('');
            }
        }

        if (name === 'lessonsPerWeek' || name === 'teachingWeeks') {
            const newLessonsPerWeek = name === 'lessonsPerWeek' ? parseInt(value) || 0 : parseInt(teacher.lessonsPerWeek) || 0;
            const newTeachingWeeks = name === 'teachingWeeks' ? parseInt(value) || 0 : parseInt(teacher.teachingWeeks) || 0;
            setBasicTeachingLessons(newLessonsPerWeek * newTeachingWeeks);
        }
        if (name === 'reducedLessonsPerWeek' || name === 'reducedWeeks') {
            const newReducedLessonsPerWeek = name === 'reducedLessonsPerWeek' ? parseInt(value) || 0 : parseInt(teacher.reducedLessonsPerWeek) || 0;
            const newReducedWeeks = name === 'reducedWeeks' ? parseInt(value) || 0 : parseInt(teacher.reducedWeeks) || 0;
            setTotalReducedLessons(newReducedLessonsPerWeek * newReducedWeeks);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (teacher.phone && !validatePhoneNumber(teacher.phone)) {
            setPhoneError('Số điện thoại không hợp lệ');
            return;
        }
        try {
            await updateTeacher(teacher._id, teacher);
            
            if (!isHomeroom && teacher.homeroom) {
                await deleteHomeroom(teacher._id);
            }
            
            onClose();
            toast.success('Cập nhật giáo viên thành công!');
            if (onTeacherUpdated) {
                onTeacherUpdated();
            }
        } catch (error) {
            console.error('Error updating teacher:', error);
            toast.error('Có lỗi xảy ra khi cập nhật giáo viên.');
        }
    };

    if (!teacher) {
        return null;
    }

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onClose}
            contentLabel="Cập Nhật Giáo Viên"
            className={styles.modal}
            overlayClassName={styles.overlay}
        >
            <h2 className={styles.modalTitle}>Cập Nhật Giáo Viên</h2>
            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                        <label htmlFor="name">Tên giáo viên:</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={teacher.name || ''}
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
                            value={teacher.email || ''}
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
                            value={teacher.phone || ''}
                            onChange={handleInputChange}
                        />
                        {phoneError && <span className={styles.error}>{phoneError}</span>}
                    </div>
                </div>
                <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                        <label htmlFor="department">Khoa:</label>
                        <select
                            id="department"
                            name="department"
                            value={teacher.department?._id || ''}
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
                    <div className={styles.formGroup}>
                        <label htmlFor="teachingSubjects">Môn giảng dạy:</label>
                        <select
                            id="teachingSubjects"
                            name="teachingSubjects"
                            value={teacher.teachingSubjects?._id || ''}
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
                            value={teacher.type || ''}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">Chọn loại giáo viên</option>
                            <option value="Cơ hữu">Cơ hữu</option>
                            <option value="Thỉnh giảng">Thỉnh giảng</option>
                        </select>
                    </div>
                </div>
                {teacher.type === 'Cơ hữu' && (
                    <>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="lessonsPerWeek">Số tiết dạy một tuần:</label>
                                <input
                                    type="number"
                                    id="lessonsPerWeek"
                                    name="lessonsPerWeek"
                                    value={teacher.lessonsPerWeek || ''}
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
                                    value={teacher.teachingWeeks || ''}
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
                                    value={teacher.reducedLessonsPerWeek || ''}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="reducedWeeks">Số tuần giảm:</label>
                                <input
                                    type="number"
                                    id="reducedWeeks"
                                    name="reducedWeeks"
                                    value={teacher.reducedWeeks || ''}
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
                                    value={teacher.reductionReason || ''}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>
                    </>
                )}
                <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                        <label>
                            <input
                                type="checkbox"
                                checked={isHomeroom}
                                onChange={(e) => setIsHomeroom(e.target.checked)}
                            />
                            Giáo viên chủ nhiệm
                        </label>
                    </div>
                    {isHomeroom && teacher.homeroom && (
                        <div className={styles.formGroup}>
                            <label>Lớp chủ nhiệm: {teacher.homeroom.class}</label>
                        </div>
                    )}
                </div>
                <div className={styles.formActions}>
                    <button type="submit" className={styles.submitButton}>Cập Nhật Giáo Viên</button>
                    <button type="button" onClick={onClose} className={styles.cancelButton}>Hủy</button>
                </div>
            </form>
        </Modal>
    );
};

export default EditTeacherModal;