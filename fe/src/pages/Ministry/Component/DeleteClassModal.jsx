import React from 'react';
import Modal from 'react-modal';
import styles from '../../../css/Ministry/components/ModalStyles.module.css';

const DeleteClassModal = ({ isOpen, onClose, onDeleteClass, classItem }) => {
    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onClose}
            contentLabel="Delete Class"
            className={styles.modal}
            overlayClassName={styles.overlay}
        >
            <h2>Xóa lớp học</h2>
            <p>Bạn có chắc muốn xóa lớp {classItem?.name}?</p>
            <p>Lưu ý: Lớp học không thể được xóa nếu đã có môn học được phân công giảng dạy.</p>
            <div className={styles.buttonGroup}>
                <button onClick={onDeleteClass}>Xóa</button>
                <button onClick={onClose}>Hủy</button>
            </div>
        </Modal>
    );
};

export default DeleteClassModal;