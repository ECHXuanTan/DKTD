import React from 'react';
import { Button } from '@mui/material';
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { getAllTeachers } from '../../../services/statisticsServices';
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

const ExportAllTeachersButton = ({ user }) => {
    const formatTeachingDetails = (details) => {
        const groupedByGrade = details.reduce((acc, d) => {
            if (!acc[d.grade]) {
                acc[d.grade] = [];
            }
            acc[d.grade].push(d);
            return acc;
        }, {});

        return Object.entries(groupedByGrade).map(([grade, gradeDetails]) => {
            const gradeHeader = `Khối ${grade}:`;
            const classDetails = gradeDetails.map(d => 
                `* ${d.className}: ${d.subjectName} - ${d.completedLessons} tiết`
            ).join('\n');
            return `${gradeHeader}\n${classDetails}`;
        }).join('\n\n');
    };

    const calculateCompletionPercentage = (totalAssignment, basicTeachingLessons) => {
        if (basicTeachingLessons === 0) return 0;
        const percentage = (totalAssignment / basicTeachingLessons) * 100;
        return Math.min(percentage, 100).toFixed(2);
    };

    const calculateExcessLessons = (totalAssignment, basicTeachingLessons) => {
        return Math.max(0, totalAssignment - basicTeachingLessons);
    };

    const exportToPDF = async () => {
        try {
            await loadTimesNewRomanFonts();
            const teachersData = await getAllTeachers();
            const currentDate = new Date();
            
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
                    { text: 'TOÀN TRƯỜNG', style: 'title' },
                    { text: '(Chức năng dành cho Tổ Giáo vụ - Đào tạo)', style: 'subtitle' },
                    { text: '---------------------------', style: 'subtitle' },
                    { text: '\n' },
                    { text: `Họ và tên người xuất báo cáo: ${user?.name || ''}`, style: 'normal' },
                    { text: `Học kì khai báo: Học kì 1 - Năm học: ${currentDate.getFullYear()} - ${currentDate.getFullYear() + 1}`, style: 'normal' },
                    { text: `Tháng: ${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`, style: 'normal' },
                    { text: '\n' },
                    { text: `Bảng thống kê số tiết giảng dạy của giáo viên toàn Trường Phổ thông Năng khiếu – Tháng ${currentDate.getMonth() + 1}, năm học ${currentDate.getFullYear()} - ${currentDate.getFullYear() + 1}:`, style: 'normal' },
                    { text: '\n' },
                    {
                        table: {
                            headerRows: 1,
                            widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', '*'],
                            body: [
                                [
                                    { text: 'STT', style: 'tableHeader' },
                                    { text: 'Tên giáo viên', style: 'tableHeader' },
                                    { text: 'Tổ bộ môn', style: 'tableHeader' },
                                    { text: 'Số tiết cơ bản', style: 'tableHeader' },
                                    { text: 'Số tiết giảm trừ', style: 'tableHeader' },
                                    { text: 'Tổng số tiết', style: 'tableHeader' },
                                    { text: 'Số tiết dư', style: 'tableHeader' },
                                    { text: 'Tỉ lệ hoàn thành', style: 'tableHeader' },
                                    { text: 'Chi tiết khai báo', style: 'tableHeader' }
                                ],
                                ...teachersData.map((teacher, index) => {
                                    const totalReductionLessons = teacher.teacherReduction.totalReducedLessons + (teacher.homeroomReduction ? teacher.homeroomReduction.totalReducedLessons : 0);
                                    return [
                                        { text: index + 1, style: 'tableCell' },
                                        { text: teacher.name, style: 'tableCell' },
                                        { text: teacher.departmentName, style: 'tableCell' },
                                        { text: teacher.basicTeachingLessons || 'Chưa khai báo', style: 'tableCell' },
                                        { text: totalReductionLessons, style: 'tableCell' },
                                        { text: teacher.totalAssignment || 'Chưa khai báo', style: 'tableCell' },
                                        { text: calculateExcessLessons(teacher.totalAssignment, teacher.finalBasicTeachingLessons), style: 'tableCell' },
                                        { text: `${calculateCompletionPercentage(teacher.totalAssignment, teacher.finalBasicTeachingLessons)}%`, style: 'tableCell' },
                                        { text: formatTeachingDetails(teacher.teachingDetails || []), style: 'tableCell' }
                                    ];
                                })
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
                    tableHeader: { fontSize: 11, bold: true },
                    tableCell: { fontSize: 11 },
                    small: { fontSize: 11 }
                }
            };

            pdfMake.createPdf(docDefinition).download('BaoCaoThongKe.pdf');
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            toast.error('Có lỗi xảy ra khi xuất báo cáo');
        }
    };

    return (
        <Button 
            variant="contained" 
            onClick={exportToPDF}
            style={{ marginRight: '10px', backgroundColor: '#d98236', borderRadius: '26px', fontWeight: 'bold', color: 'white' }}
        >
            Xuất báo cáo
        </Button>
    );
};

export default ExportAllTeachersButton;