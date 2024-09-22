import React, { useState, useEffect } from 'react';
import { Button, CircularProgress } from '@mui/material';
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { toast } from 'react-toastify';
import { getClassData } from '../../../services/statisticsServices';

pdfMake.vfs = pdfFonts.pdfMake.vfs;

const loadTimesNewRomanFonts = async () => {
    const fontFiles = [
        { name: 'timesnewromanpsmt', style: 'normal' },
        { name: 'timesnewromanpsmtb', style: 'bold' },
        { name: 'timesnewromanpsmti', style: 'italics' },
        { name: 'timesnewromanpsmtbi', style: 'bolditalics' }
    ];

    for (const font of fontFiles) {
        try {
            console.log(`Attempting to load font: ${font.name}`);
            const fontResponse = await fetch(`/assets/times/${font.name}.ttf`);
            if (!fontResponse.ok) {
                throw new Error(`HTTP error! status: ${fontResponse.status}`);
            }
            const fontBlob = await fontResponse.blob();
            const fontBase64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.onerror = (error) => {
                    console.error(`Error reading font ${font.name}:`, error);
                    resolve(null);
                };
                reader.readAsDataURL(fontBlob);
            });

            if (fontBase64) {
                pdfMake.vfs[`${font.name}.ttf`] = fontBase64;
                console.log(`Font loaded successfully: ${font.name}`);
            } else {
                console.error(`Failed to load font: ${font.name}`);
            }
        } catch (error) {
            console.error(`Error loading font ${font.name}:`, error);
        }
    }

    pdfMake.fonts = {
        TimesNewRoman: {
            normal: 'timesnewromanpsmt.ttf',
            bold: 'timesnewromanpsmtb.ttf',
            italics: 'timesnewromanpsmti.ttf',
            bolditalics: 'timesnewromanpsmtbi.ttf'
        }
    };
};

const SingleClassReport = ({ user, classId }) => {
    const [classData, setClassData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchClassData = async () => {
            setLoading(true);
            try {
                const data = await getClassData(classId);
                setClassData(data);
            } catch (error) {
                console.error('Error fetching class data:', error);
                toast.error('Không thể tải dữ liệu lớp học');
            } finally {
                setLoading(false);
            }
        };

        fetchClassData();
    }, [classId]);

    const formatSubjectsDetails = (subjects) => {
        return subjects.map(subject => {
            const assignmentsDetails = subject.assignments.map(assignment => 
                `${assignment.teacherName}: ${assignment.completedLessons} tiết`
            ).join('\n');
            return assignmentsDetails || 'Chưa có khai báo';
        }).join('\n\n');
    };

    const calculateCompletionRate = (subject) => {
        const totalCompleted = subject.assignments.reduce((sum, assignment) => sum + assignment.completedLessons, 0);
        return subject.lessonCount > 0 ? ((totalCompleted / subject.lessonCount) * 100).toFixed(2) : '0.00';
    };

    const exportToPDF = async () => {
        if (!classData) {
            toast.error('Dữ liệu lớp học chưa sẵn sàng');
            return;
        }

        try {
            await loadTimesNewRomanFonts();
            const currentDate = new Date();
            
            const tableBody = classData.subjects.map((subject, index) => [
                (index + 1).toString(),
                subject.name,
                subject.lessonCount,
                subject.assignments.reduce((sum, assignment) => sum + assignment.completedLessons, 0),
                `${calculateCompletionRate(subject)}%`,
                { text: formatSubjectsDetails([subject]), style: 'small' }
            ]);

            const docDefinition = {
                content: [
                    {
                        columns: [
                            [
                                { text: 'ĐẠI HỌC QUỐC GIA TP. HỒ CHÍ MINH', style: 'header2' },
                                { text: 'TRƯỜNG PHỔ THÔNG NĂNG KHIẾU', style: 'header' },
                                { text: '------------------------', style: 'header' },
                            ],
                            [
                                { text: 'CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM', style: 'header' },
                                { text: 'Độc lập - Tự do - Hạnh phúc', style: 'header' },
                                { text: '----------------------------', style: 'header' },
                            ]
                        ]
                    },
                    { text: '\n' },
                    { text: 'BẢNG THỐNG KÊ KHAI BÁO SỐ TIẾT GIẢNG DẠY', style: 'title' },
                    { text: `TẤT CẢ CÁC MÔN THEO LỚP ${classData.className}`, style: 'title' },
                    { text: '(Chức năng dành cho Tổ Giáo vụ - Đào tạo)', style: 'subtitle' },
                    { text: '---------------------------', style: 'subtitle' },
                    { text: '\n' },
                    { text: `Họ và tên người xuất báo cáo: ${user?.name || ''}`, style: 'normal' },
                    { text: `Học kì khai báo: Học kì 1 - Năm học: ${currentDate.getFullYear()} - ${currentDate.getFullYear() + 1}`, style: 'normal' },
                    { text: `Tháng: ${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`, style: 'normal' },
                    { text: '\n' },
                    { text: `Bảng thống kê số tiết giảng dạy của lớp ${classData.className}:`, style: 'normal' },
                    {
                        table: {
                            headerRows: 1,
                            widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto'],
                            body: [
                                [
                                    { text: 'STT', style: 'tableHeader' },
                                    { text: 'Môn học', style: 'tableHeader' },
                                    { text: 'Số tiết được phân công', style: 'tableHeader' },
                                    { text: 'Tổng số tiết', style: 'tableHeader' },
                                    { text: 'Tỉ lệ hoàn thành', style: 'tableHeader' },
                                    { text: 'Chi tiết khai báo', style: 'tableHeader' }
                                ],
                                ...tableBody
                            ]
                        }
                    },
                    { text: '\n' },
                    { text: '* Quý Thầy Cô kiểm tra phần nhập liệu của phiếu này:', style: 'normal' },
                    { text: '- Nếu không có sai sót: Giáo viên in phiếu này và ký tên xác nhận để lưu trữ, đối chiếu khi cần.', style: 'normal' },
                    { text: '- Nếu có sai sót: Giáo viên báo cáo số liệu sai về lãnh đạo Tổ chuyên môn (Tổ trưởng, Tổ phó) để được điều chỉnh kịp thời.', style: 'normal' },
                    { text: '\n' },
                    { text: `Được in vào lúc: ${currentDate.toLocaleString()}`, style: 'normalItalic' },
                    { text: '\n\n' },
                    {
                        columns: [
                            { text: 'DUYỆT CỦA BAN GIÁM HIỆU', style: 'signatureBold' },
                            { 
                                text: [
                                    { text: `Thành phố Hồ Chí Minh, ngày ${currentDate.getDate()} tháng ${currentDate.getMonth() + 1} năm ${currentDate.getFullYear()}\n`, style: 'normalItalic' },
                                    { text: 'NGƯỜI XUẤT BÁO CÁO\n', style: 'signatureBold' },
                                    { text: '(Ký tên và ghi rõ họ và tên)', style: 'normalItalic2' }
                                ], 
                                style: 'signature' 
                            }
                        ]
                    }
                ],
                defaultStyle: {
                    font: 'TimesNewRoman',
                    lineHeight: 1.25
                },
                styles: {
                    header: { fontSize: 12, alignment: 'center', bold: true },
                    header2: { fontSize: 12, alignment: 'center' },
                    title: { fontSize: 12, alignment: 'center', bold: true },
                    subtitle: { fontSize: 12, alignment: 'center', italics: true , bold: true },
                    normal: { fontSize: 12, alignment: 'left' },
                    normalItalic: { fontSize: 12, alignment: 'left', italics: true },
                    normalItalic2: { fontSize: 12, alignment: 'center', italics: true },
                    signature: { fontSize: 12, alignment: 'center' },
                    signatureBold: { fontSize: 12, alignment: 'center', bold: true },
                    tableHeader: { fontSize: 12, bold: true },
                    small: { fontSize: 12 }
                }
            };

            pdfMake.createPdf(docDefinition).download(`BaoCaoThongKe_${classData.className}.pdf`);
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            toast.error('Có lỗi xảy ra khi xuất báo cáo');
        }
    };

    return (
        <Button 
            variant="contained" 
            onClick={exportToPDF}
            style={{ backgroundColor: '#d98236', color: 'white', padding: '4px 8px', fontSize: '13px', fontWeight: '600' }}
            disabled={loading || !classData}
        >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Xuất báo cáo'}
        </Button>
    );
};

export default SingleClassReport;