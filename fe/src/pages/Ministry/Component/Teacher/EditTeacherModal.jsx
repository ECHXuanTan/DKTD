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
    const [reductions, setReductions] = useState([]);
    const [basicTeachingLessons, setBasicTeachingLessons] = useState(0);
    const [totalReducedLessons, setTotalReducedLessons] = useState(0);
    const [phoneError, setPhoneError] = useState('');
    const [isHomeroom, setIsHomeroom] = useState(false);

    useEffect(() => {
        if (isOpen && editingTeacher) {
            setTeacher(editingTeacher);
            const lessonsPerWeek = parseInt(editingTeacher.lessonsPerWeek) || 0;
            const teachingWeeks = parseInt(editingTeacher.teachingWeeks) || 0;
            setBasicTeachingLessons(lessonsPerWeek * teachingWeeks);
            
            // Initialize reductions from teacher data
            setReductions(editingTeacher.reductions || []);
            
            // Calculate total reduced lessons
            const total = (editingTeacher.reductions || []).reduce(
                (sum, reduction) => sum + (reduction.reducedLessons || 0), 
                0
            );
            setTotalReducedLessons(total);
            
            setIsHomeroom(!!editingTeacher.homeroom);
        }
    }, [isOpen, editingTeacher]);

    const validatePhoneNumber = (phone) => {
        if (!phone) return true;
        const phoneRegex = /^(0|\+84)(\s|\.)?((3[2-9])|(5[689])|(7[06-9])|(8[1-689])|(9[0-46-9]))(\d)(\s|\.)?(\d{3})(\s|\.)?(\d{3})$/;
        return phoneRegex.test(phone);
    };

    const validateReductions = () => {
        for (const reduction of reductions) {
            if (!reduction.reducedLessonsPerWeek || !reduction.reducedWeeks || !reduction.reductionReason) {
                toast.error('Vui lòng điền đầy đủ thông tin cho tất cả các giảm trừ');
                return false;
            }
        }
        return true;
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
    };

    const handleReductionChange = (index, field, value) => {
        const newReductions = [...reductions];
        newReductions[index] = {
            ...newReductions[index],
            [field]: value
        };

        // Recalculate reducedLessons for this reduction
        if (field === 'reducedLessonsPerWeek' || field === 'reducedWeeks') {
            const lessonsPerWeek = parseInt(newReductions[index].reducedLessonsPerWeek) || 0;
            const weeks = parseInt(newReductions[index].reducedWeeks) || 0;
            newReductions[index].reducedLessons = lessonsPerWeek * weeks;
        }

        setReductions(newReductions);

        // Update total reduced lessons
        const total = newReductions.reduce(
            (sum, reduction) => sum + (reduction.reducedLessons || 0), 
            0
        );
        setTotalReducedLessons(total);
    };

    const addReduction = () => {
        if (reductions.length < 3) {
            setReductions([
                ...reductions,
                {
                    reducedLessonsPerWeek: 0,
                    reducedWeeks: 0,
                    reductionReason: '',
                    reducedLessons: 0
                }
            ]);
        } else {
            toast.warning('Không thể thêm quá 3 giảm trừ');
        }
    };

    const removeReduction = (index) => {
        const newReductions = reductions.filter((_, i) => i !== index);
        setReductions(newReductions);
        
        // Update total reduced lessons
        const total = newReductions.reduce(
            (sum, reduction) => sum + (reduction.reducedLessons || 0), 
            0
        );
        setTotalReducedLessons(total);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (teacher.phone && !validatePhoneNumber(teacher.phone)) {
            setPhoneError('Số điện thoại không hợp lệ');
            return;
        }
        if (!validateReductions()) {
            return;
        }

        try {
            const updatedTeacherData = {
                ...teacher,
                reductions: reductions
            };

            await updateTeacher(teacher._id, updatedTeacherData);
            
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
                        <label htmlFor="department">Tổ chuyên môn:</label>
                        <select
                            id="department"
                            name="department"
                            value={teacher.department?._id || ''}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">Chọn tổ chuyên môn</option>
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
                        <label htmlFor="type">Hình thức giáo viên:</label>
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
                                    min="0"
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
                                    min="0"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Số tiết chuẩn:</label>
                                <input
                                    type="number"
                                    value={basicTeachingLessons}
                                    readOnly
                                />
                            </div>
                        </div>

                        <div className={styles.reductionsSection}>
                            <div className={styles.sectionHeader}>
                                <h3>Danh sách giảm trừ</h3>
                                <button 
                                    type="button" 
                                    onClick={addReduction} 
                                    className={styles.addButton}
                                    disabled={reductions.length >= 3}
                                >
                                    Thêm giảm trừ
                                </button>
                            </div>

                            {reductions.map((reduction, index) => (
                                <div key={index} className={styles.reductionItem}>
                                    <div className={styles.formRow}>
                                        <div className={styles.formGroup}>
                                            <label>Số tiết giảm một tuần:</label>
                                            <input
                                                type="number"
                                                value={reduction.reducedLessonsPerWeek || ''}
                                                onChange={(e) => handleReductionChange(index, 'reducedLessonsPerWeek', e.target.value)}
                                                required
                                                min="0"
                                            />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>Số tuần giảm:</label>
                                            <input
                                                type="number"
                                                value={reduction.reducedWeeks || ''}
                                                onChange={(e) => handleReductionChange(index, 'reducedWeeks', e.target.value)}
                                                required
                                                min="0"
                                            />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>Tổng số tiết giảm:</label>
                                            <input
                                                type="number"
                                                value={reduction.reducedLessons || 0}
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.formRow}>
                                        <div className={styles.formGroup}>
                                            <label>Nội dung giảm:</label>
                                            <input
                                                type="text"
                                                value={reduction.reductionReason || ''}
                                                onChange={(e) => handleReductionChange(index, 'reductionReason', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => removeReduction(index)}
                                            className={styles.removeButton}
                                        >
                                            Xóa giảm trừ
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <div className={styles.totalReduction}>
                                <label>Tổng số tiết giảm:</label>
                                <input
                                    type="number"
                                    value={totalReducedLessons}
                                    readOnly
                                />
                            </div>
                        </div>
                    </>
                )}

                {teacher.homeroom && (
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
                        {isHomeroom && (
                            <div className={styles.formGroup}>
                                <label>Lớp chủ nhiệm: {teacher.homeroom.class}</label>
                                <div className={styles.homeroomInfo}>
                                    <label>Số tiết giảm/tuần:</label>
                                    <input
                                        type="number"
                                        value={teacher.homeroom.reducedLessonsPerWeek || 0}
                                        readOnly
                                    />
                                    <label>Số tuần giảm:</label>
                                    <input
                                        type="number"
                                        value={teacher.homeroom.reducedWeeks || 0}
                                        readOnly
                                    />
                                    <label>Tổng số tiết giảm GVCN:</label>
                                    <input
                                        type="number"
                                        value={teacher.homeroom.totalReducedLessons || 0}
                                        readOnly
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className={styles.formActions}>
                    <button type="submit" className={styles.submitButton}>
                        Cập Nhật
                    </button>
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

export default EditTeacherModal;