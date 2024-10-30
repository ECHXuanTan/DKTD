import React from 'react';
import { Button } from '@mui/material';
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { getSubjectStatistics } from '../../../services/statisticsServices';
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

const ExportSingleSubjectButton = ({ user, subjectId, subjectName, grade }) => {
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
            const subjectData = await getSubjectStatistics(subjectId, grade || null);
            const currentDate = new Date();
            
            const tableBody = [
                [
                    { text: 'STT', style: 'tableHeader' },
                    { text: 'Lớp', style: 'tableHeader' },
                    { text: 'Số tiết được khai báo', style: 'tableHeader' },
                    { text: 'Giáo viên', style: 'tableHeader' },
                    { text: 'Số tiết đã khai báo', style: 'tableHeader' }
                ]
            ];

            const totalDeclared = calculateTotalDeclaredLessons(subjectData.classes);
            const totalAssigned = calculateTotalAssignedLessons(subjectData.classes);
            const completionRate = calculateCompletionRate(totalDeclared, totalAssigned);

            subjectData.classes.forEach((classItem, index) => {
                const classRow = [
                    { text: (index + 1).toString(), style: 'tableCell' },
                    { text: classItem.className, style: 'tableCell' },
                    { text: classItem.declaredLessons.toString(), style: 'tableCell' },
                    { 
                        text: classItem.assignments.map(a => a.teacherName).join('\n') || '-', 
                        style: 'tableCell' 
                    },
                    { 
                        text: classItem.assignments.map(a => a.assignedLessons).join('\n') || '0', 
                        style: 'tableCell' 
                    }
                ];
                tableBody.push(classRow);
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
                    { text: `MÔN HỌC: ${subjectName.toUpperCase()}`, style: 'title' },
                    { text: '(Chức năng dành cho Tổ Giáo vụ - Đào tạo)', style: 'subtitle' },
                    { text: '---------------------------', style: 'subtitle' },
                    { text: '\n' },
                    { text: `Họ và tên người xuất báo cáo: ${user?.name || ''}`, style: 'normal' },
                    { text: `Học kì khai báo: Học kì 1 - Năm học: ${currentDate.getFullYear()} - ${currentDate.getFullYear() + 1}`, style: 'normal' },
                    { text: `Tháng: ${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`, style: 'normal' },
                    { text: `Khối lớp: ${grade ? grade : 'Tất cả'}`, style: 'normal' },
                    { text: '\n' },
                    { text: `Tổng số tiết được khai báo: ${totalDeclared}`, style: 'normal' },
                    { text: `Tổng số tiết đã phân công: ${totalAssigned}`, style: 'normal' },
                    { text: `Tỉ lệ hoàn thành: ${completionRate}%`, style: 'normal' },
                    { text: '\n' },
                    {
                        table: {
                            headerRows: 1,
                            widths: ['auto', '*', 'auto', '*', 'auto'],
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

            pdfMake.createPdf(docDefinition).download(`BaoCaoThongKe_${subjectName}.pdf`);
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            toast.error('Có lỗi xảy ra khi xuất báo cáo');
        }
    };

    return (
        <Button 
            variant="contained" 
            onClick={exportToPDF}
            size="small"
            style={{ backgroundColor: '#4caf50', color: 'white', fontSize: '12px', fontWeight: '600', borderRadius: '26px' }}
        >
            Xuất báo cáo
        </Button>
    );
};

export default ExportSingleSubjectButton;