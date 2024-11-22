import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { toast } from 'react-toastify';
import { createTeacher } from '../../../../services/teacherService';
import styles from '../../../../css/Ministry/components/TeacherModalStyles.module.css';

const SingleTeacherModal = ({ isOpen, onClose, departments, nonSpecializedSubjects, onTeacherAdded }) => {
    const [newTeacher, setNewTeacher] = useState({
        name: '',
        email: '',
        phone: '',
        position: 'Giáo viên',
        department: '',
        teachingSubjects: '',
        type: '',
        lessonsPerWeek: '',
        teachingWeeks: '',
    });

    const [reductions, setReductions] = useState([]);
    const [basicTeachingLessons, setBasicTeachingLessons] = useState(0);
    const [totalReducedLessons, setTotalReducedLessons] = useState(0);
    const [phoneError, setPhoneError] = useState('');

    useEffect(() => {
        if (newTeacher.type === 'Cơ hữu') {
            const lessonsPerWeek = parseInt(newTeacher.lessonsPerWeek) || 0;
            const teachingWeeks = parseInt(newTeacher.teachingWeeks) || 0;
            setBasicTeachingLessons(lessonsPerWeek * teachingWeeks);

            const total = reductions.reduce((sum, reduction) => 
                sum + (reduction.reducedLessonsPerWeek * reduction.reducedWeeks), 0);
            setTotalReducedLessons(total);
        }
    }, [newTeacher, reductions]);

    const validatePhoneNumber = (phone) => {
        if (!phone) return true;
        const phoneRegex = /^(0|\+84)(\s|\.)?((3[2-9])|(5[689])|(7[06-9])|(8[1-689])|(9[0-46-9]))(\d)(\s|\.)?(\d{3})(\s|\.)?(\d{3})$/;
        return phoneRegex.test(phone);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewTeacher(prev => ({ ...prev, [name]: value }));
        
        if (name === 'phone') {
            if (value && !validatePhoneNumber(value)) {
                setPhoneError('Số điện thoại không hợp lệ');
            } else {
                setPhoneError('');
            }
        }
    };

    const handleAddReduction = () => {
        setReductions([...reductions, {
            reducedLessonsPerWeek: 0,
            reducedWeeks: 0,
            reductionReason: '',
            reducedLessons: 0
        }]);
    };

    const handleRemoveReduction = (index) => {
        setReductions(reductions.filter((_, i) => i !== index));
    };

    const handleReductionChange = (index, field, value) => {
        const updatedReductions = [...reductions];
        updatedReductions[index] = {
            ...updatedReductions[index],
            [field]: value
        };

        if (field === 'reducedLessonsPerWeek' || field === 'reducedWeeks') {
            const reducedLessonsPerWeek = field === 'reducedLessonsPerWeek' 
                ? parseInt(value) || 0 
                : parseInt(updatedReductions[index].reducedLessonsPerWeek) || 0;
            const reducedWeeks = field === 'reducedWeeks'
                ? parseInt(value) || 0
                : parseInt(updatedReductions[index].reducedWeeks) || 0;
            updatedReductions[index].reducedLessons = reducedLessonsPerWeek * reducedWeeks;
        }

        setReductions(updatedReductions);
    };

    const validateReductions = () => {
        return reductions.every(reduction => 
            reduction.reducedLessonsPerWeek > 0 && 
            reduction.reducedWeeks > 0 && 
            reduction.reductionReason.trim() !== ''
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newTeacher.phone && !validatePhoneNumber(newTeacher.phone)) {
            setPhoneError('Số điện thoại không hợp lệ');
            return;
        }

        if (newTeacher.type === 'Cơ hữu' && reductions.length > 0) {
            if (!validateReductions()) {
                toast.error('Vui lòng điền đầy đủ thông tin cho tất cả các mục giảm trừ');
                return;
            }
        }

        try {
            const teacherData = {
                ...newTeacher,
                position: 'Giáo viên',
            };
    
            if (newTeacher.type === 'Cơ hữu') {
                teacherData.basicTeachingLessons = basicTeachingLessons;
                if (reductions.length > 0) {
                    teacherData.reductions = reductions;
                    teacherData.totalReducedLessons = totalReducedLessons;
                }
            }
    
            await createTeacher(teacherData);
            onClose();
            toast.success('Tạo giáo viên mới thành công!');
            if (onTeacherAdded) {
                onTeacherAdded();
            }
        } catch (error) {
            console.error('Error creating teacher:', error);
            if (error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error('Có lỗi xảy ra khi tạo giáo viên mới.');
            }
        }
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
            <form onSubmit={handleSubmit} className={styles.form}>
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
                            onChange={handleInputChange}
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
                        <label htmlFor="teachingSubjects">Môn học giảng dạy:</label>
                        <select
                            id="teachingSubjects"
                            name="teachingSubjects"
                            value={newTeacher.teachingSubjects}
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
                            value={newTeacher.type}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">Chọn hình thức giáo viên</option>
                            <option value="Cơ hữu">Cơ hữu</option>
                            <option value="Thỉnh giảng">Thỉnh giảng</option>
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

                        <div className={styles.reductionsSection}>
                            <h3>Thông tin giảm trừ</h3>
                            <button 
                                type="button" 
                                onClick={handleAddReduction}
                                className={styles.addReductionButton}
                            >
                                Thêm mục giảm trừ
                            </button>

                            {reductions.map((reduction, index) => (
                                <div key={index} className={styles.reductionItem}>
                                    <h4>Mục giảm trừ {index + 1}</h4>
                                    <div className={styles.formRow}>
                                        <div className={styles.formGroup}>
                                            <label>Số tiết giảm một tuần:</label>
                                            <input
                                                type="number"
                                                value={reduction.reducedLessonsPerWeek}
                                                onChange={(e) => handleReductionChange(index, 'reducedLessonsPerWeek', e.target.value)}
                                                min="0"
                                                required
                                            />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>Số tuần giảm:</label>
                                            <input
                                                type="number"
                                                value={reduction.reducedWeeks}
                                                onChange={(e) => handleReductionChange(index, 'reducedWeeks', e.target.value)}
                                                min="0"
                                                required
                                            />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>Tổng số tiết giảm:</label>
                                            <input
                                                type="number"
                                                value={reduction.reducedLessons}
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.formRow}>
                                        <div className={styles.formGroup}>
                                            <label>Lý do giảm trừ:</label>
                                            <textarea
                                                value={reduction.reductionReason}
                                                onChange={(e) => handleReductionChange(index, 'reductionReason', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => handleRemoveReduction(index)}
                                            className={styles.removeReductionButton}
                                        >
                                            Xóa
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Tổng số tiết giảm trừ:</label>
                                    <input
                                        type="number"
                                        value={totalReducedLessons}
                                        readOnly
                                    />
                                </div>
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