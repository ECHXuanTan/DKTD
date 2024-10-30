import React from 'react';
import { Button } from '@mui/material';
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { getSubjectsAssignments } from '../../../services/statisticsServices';
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

const ExportAllSubjectsButton = ({ user }) => {
    const formatAssignmentsDetails = (assignments) => {
        return assignments.map(assignment => 
            `${assignment.teacherName}: ${assignment.assignedLessons} tiết`
        ).join('\n');
    };

    const calculateTotalDeclaredLessons = (classes) => {
        return classes.reduce((sum, classItem) => sum + classItem.declaredLessons, 0);
    };

    const calculateTotalAssignedLessons = (classes) => {
        return classes.reduce((sum, classItem) => 
            sum + classItem.assignments.reduce((assignmentSum, assignment) => 
                assignmentSum + assignment.assignedLessons, 0), 0);
    };

    const calculateCompletionRate = (declared, assigned) => {
        return declared > 0 ? ((assigned / declared) * 100).toFixed(2) : '0.00';
    };

    const exportToPDF = async () => {
        try {
            await loadTimesNewRomanFonts();
            const subjectsData = await getSubjectsAssignments();
            const currentDate = new Date();
            
            const tableBody = [
                [
                    { text: 'STT', style: 'tableHeader', rowSpan: 2 },
                    { text: 'Môn học', style: 'tableHeader', rowSpan: 2 },
                    { text: 'Tổng số tiết được khai báo', style: 'tableHeader', rowSpan: 2 },
                    { text: 'Tổng số tiết đã phân công', style: 'tableHeader', rowSpan: 2 },
                    { text: 'Tỉ lệ hoàn thành (%)', style: 'tableHeader', rowSpan: 2 },
                    { text: 'Chi tiết theo lớp', style: 'tableHeader', colSpan: 3 },
                    {}, {}
                ],
                [
                    {}, {}, {}, {}, {},
                    { text: 'Lớp', style: 'tableHeader' },
                    { text: 'Số tiết của lớp', style: 'tableHeader' },
                    { text: 'Chi tiết khai báo', style: 'tableHeader' }
                ]
            ];

            subjectsData.forEach((subject, index) => {
                const totalDeclared = calculateTotalDeclaredLessons(subject.classes);
                const totalAssigned = calculateTotalAssignedLessons(subject.classes);
                const completionRate = calculateCompletionRate(totalDeclared, totalAssigned);

                const subjectRow = [
                    { text: (index + 1).toString(), style: 'tableCell', rowSpan: subject.classes.length },
                    { text: subject.subjectName, style: 'tableCell', rowSpan: subject.classes.length },
                    { text: totalDeclared.toString(), style: 'tableCell', rowSpan: subject.classes.length },
                    { text: totalAssigned.toString(), style: 'tableCell', rowSpan: subject.classes.length },
                    { text: `${completionRate}%`, style: 'tableCell', rowSpan: subject.classes.length },
                    { text: subject.classes[0].className, style: 'tableCell' },
                    { text: subject.classes[0].declaredLessons.toString(), style: 'tableCell' },
                    { text: formatAssignmentsDetails(subject.classes[0].assignments) || 'Chưa có khai báo', style: 'small' }
                ];

                tableBody.push(subjectRow);

                for (let i = 1; i < subject.classes.length; i++) {
                    const classItem = subject.classes[i];
                    const classRow = [
                        {}, {}, {}, {}, {},
                        { text: classItem.className, style: 'tableCell' },
                        { text: classItem.declaredLessons.toString(), style: 'tableCell' },
                        { text: formatAssignmentsDetails(classItem.assignments) || 'Chưa có khai báo', style: 'small' }
                    ];
                    tableBody.push(classRow);
                }
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
                    { text: 'TẤT CẢ CÁC MÔN HỌC', style: 'title' },
                    { text: '(Chức năng dành cho Tổ Giáo vụ - Đào tạo)', style: 'subtitle' },
                    { text: '---------------------------', style: 'subtitle' },
                    { text: '\n' },
                    { text: `Họ và tên người xuất báo cáo: ${user?.name || ''}`, style: 'normal' },
                    { text: `Học kì khai báo: Học kì 1 - Năm học: ${currentDate.getFullYear()} - ${currentDate.getFullYear() + 1}`, style: 'normal' },
                    { text: `Tháng: ${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`, style: 'normal' },
                    { text: '\n' },
                    {
                        table: {
                            headerRows: 2,
                            widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto', '*'],
                            body: tableBody
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
                    fontSize: 12,
                    lineHeight: 1.25
                },
                styles: {
                    header: { alignment: 'center', bold: true },
                    header2: { alignment: 'center' },
                    title: { alignment: 'center', bold: true },
                    subtitle: { alignment: 'center', italics: true, bold: true },
                    normal: { alignment: 'left' },
                    normalItalic: { alignment: 'left', italics: true },
                    normalItalic2: { alignment: 'center', italics: true },
                    signature: { alignment: 'center' },
                    signatureBold: { alignment: 'center', bold: true },
                    tableHeader: { bold: true },
                    tableCell: { },
                    small: { fontSize: 10 }
                }
            };

            pdfMake.createPdf(docDefinition).download('BaoCaoThongKeAllSubjects.pdf');
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
            Xuất báo cáo tất cả môn học
        </Button>
    );
};

export default ExportAllSubjectsButton;