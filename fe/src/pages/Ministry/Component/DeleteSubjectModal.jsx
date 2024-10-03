import React from 'react';
import Modal from 'react-modal';
import styles from '../../../css/Ministry/components/ModalStyles.module.css';

const DeleteSubjectModal = ({ isOpen, onClose, onDeleteSubject, subject }) => {
    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onClose}
            contentLabel="Delete Subject"
            className={styles.modal}
            overlayClassName={styles.overlay}
        >
            <h2>Xóa môn học</h2>
            <p>Bạn có chắc muốn xóa {subject?.subject.name} khỏi lớp?</p>
            <div className={styles.buttonGroup}>
                <button onClick={onDeleteSubject}>Xóa</button>
                <button onClick={onClose}>Hủy</button>
            </div>
        </Modal>
    );
};

export default DeleteSubjectModal;