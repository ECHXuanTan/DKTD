import React from 'react';
import { Button } from '@mui/material';
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { getAllClasses } from '../../../services/statisticsServices';
import { toast } from 'react-toastify';

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

const ExportAllClassesButton = ({ user }) => {
    const formatSubjectsDetails = (subjects) => {
        return subjects.map(subject => {
            if (subject.subject.name === 'CCSHL') {
                return '';
            }
            const assignmentsDetails = subject.assignments && subject.assignments.length > 0
                ? subject.assignments.map(assignment => 
                    `${assignment.teacherName}: ${assignment.completedLessons} tiết`
                ).join('\n')
                : 'Chưa có khai báo';
            return `${subject.subject.name}: ${assignmentsDetails}`;
        }).join('\n\n');
    };

    const calculateCompletionRate = (subject) => {
        if (subject.subject.name === 'CCSHL') return '';
        const totalCompleted = subject.assignments
            ? subject.assignments.reduce((sum, assignment) => sum + assignment.completedLessons, 0)
            : 0;
        return subject.lessonCount > 0 ? ((totalCompleted / subject.lessonCount) * 100).toFixed(2) + '%' : '0.00%';
    };

    const exportToPDF = async () => {
        try {
            await loadTimesNewRomanFonts();
            const classesData = await getAllClasses();
            const currentDate = new Date();
            
            const tableBody = [];
            let currentSTT = 1;

            classesData.forEach((classItem) => {
                const rowSpan = classItem.subjects.length;
                classItem.subjects.forEach((subject, subjectIndex) => {
                    const row = [
                        subjectIndex === 0 ? { text: currentSTT.toString(), rowSpan: rowSpan } : {},
                        subjectIndex === 0 ? { text: classItem.name, rowSpan: rowSpan } : {},
                        subjectIndex === 0 ? { text: classItem.homeroomTeacher || 'Chưa phân công', rowSpan: rowSpan } : {},
                        subject.subject.name,
                        subject.lessonCount,
                        calculateCompletionRate(subject),
                        { text: formatSubjectsDetails([subject]), style: 'small' }
                    ];
                    tableBody.push(row);
                });
                currentSTT++;
            });

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
                    { text: 'TẤT CẢ CÁC LỚP', style: 'title' },
                    { text: '(Chức năng dành cho Tổ Giáo vụ - Đào tạo)', style: 'subtitle' },
                    { text: '---------------------------', style: 'subtitle' },
                    { text: '\n' },
                    { text: `Họ và tên người xuất báo cáo: ${user?.name || ''}`, style: 'normal' },
                    { text: `Học kì khai báo: Học kì 1 - Năm học: ${currentDate.getFullYear()} - ${currentDate.getFullYear() + 1}`, style: 'normal' },
                    { text: `Tháng: ${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`, style: 'normal' },
                    { text: '\n' },
                    {
                        table: {
                            headerRows: 1,
                            widths: ['auto', 'auto', 'auto', '*', 'auto', 'auto', '*'],
                            body: [
                                [
                                    { text: 'STT', style: 'tableHeader' },
                                    { text: 'Lớp', style: 'tableHeader' },
                                    { text: 'GVCN', style: 'tableHeader' },
                                    { text: 'Môn học', style: 'tableHeader' },
                                    { text: 'Số tiết được phân công', style: 'tableHeader' },
                                    { text: 'Tỉ lệ hoàn thành', style: 'tableHeader' },
                                    { text: 'Chi tiết khai báo', style: 'tableHeader' }
                                ],
                                ...tableBody
                            ]
                        }
                    },
                    { text: '\n' },
                    { text: '* Quý Thầy Cô kiểm tra phần nhập liệu của phiếu này và gửi cho Giáo viên trong Tổ để kiểm dò:', style: 'normal' },
                    { text: '- Nếu không có sai sót: Tổ Giáo vụ - Đào tạo in phiếu này và ký tên xác nhận để lưu trữ, đối chiếu khi cần và thực hiện các bước tiếp theo.', style: 'normal' },
                    { text: '- Nếu có sai sót: Tổ Giáo vụ - Đào tạo báo cáo lãnh đạo Tổ chuyên môn thực hiện điều chỉnh số liệu trực tiếp trên phần mềm và xuất báo cáo lại lần nữa.', style: 'normal' },
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
                    fontSize: 11,
                    lineHeight: 1.25
                },
                styles: {
                    header: { fontSize: 12, alignment: 'center', bold: true },
                    header2: { fontSize: 12, alignment: 'center' },
                    title: { fontSize: 12, alignment: 'center', bold: true },
                    subtitle: { fontSize: 12, alignment: 'center', italics: true , bold: true },
                    normal: { fontSize: 12, alignment: 'left' },
                    normalItalic: { fontSize: 11.5, alignment: 'left', italics: true },
                    normalItalic2: { fontSize: 12, alignment: 'center', italics: true },
                    signature: { fontSize: 12, alignment: 'center' },
                    signatureBold: { fontSize: 12, alignment: 'center', bold: true },
                    tableHeader: { fontSize: 11, bold: true },
                    small: { fontSize: 11 }
                }
            };

            pdfMake.createPdf(docDefinition).download('BaoCaoThongKeAllClasses.pdf');
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            toast.error('Có lỗi xảy ra khi xuất báo cáo');
        }
    };

    return (
        <Button 
            variant="contained" 
            onClick={exportToPDF}
            style={{ marginRight: '10px', backgroundColor: '#d98236', fontWeight: '600', borderRadius: '26px' }}
        >
            Xuất báo cáo tất cả lớp
        </Button>
    );
};

export default ExportAllClassesButton;