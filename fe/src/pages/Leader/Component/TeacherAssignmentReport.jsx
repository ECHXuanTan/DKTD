import React, { useState, useEffect } from 'react';
import { Button } from '@mui/material';
import { getTeacherAssignments } from '../../../services/statisticsServices';
import { toast } from 'react-toastify';
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

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

const TeacherAssignmentReport = ({ teacherId }) => {
    const [reportData, setReportData] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getTeacherAssignments(teacherId);
                setReportData(data);
            } catch (error) {
                toast.error('Lỗi khi tải dữ liệu báo cáo');
            }
        };
        fetchData();
    }, [teacherId]);

    const exportToPDF = async () => {
        if (!reportData) return;

        try {
            await loadTimesNewRomanFonts();
            const currentDate = new Date();
            
            const completionRate = Math.min(((reportData.totalAssignment / reportData.basicTeachingLessons) * 100), 100).toFixed(2);
            const excessLessons = Math.max(0, reportData.totalAssignment - reportData.basicTeachingLessons);

            const docDefinition = {
                content: [
                    {
                        columns: [
                            [
                                { text: 'ĐẠI HỌC QUỐC GIA TP. HỒ CHÍ MINH', style: 'header' },
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
                    { text: 'THEO GIÁO VIÊN BỘ MÔN', style: 'title' },
                    { text: '(Chức năng dành cho Giáo viên bộ môn)', style: 'subtitle' },
                    { text: '---------------------------', style: 'subtitle' },
                    { text: '\n' },
                    { text: `Họ và tên Giáo viên giảng dạy: ${reportData.teacherName}`, style: 'normal' },
                    { text: `Tổ bộ môn: ${reportData.departmentName}`, style: 'normal' },
                    { text: `Học kì khai báo: Học kì 1 - Năm học: ${currentDate.getFullYear()} - ${currentDate.getFullYear() + 1}`, style: 'normal' },
                    { text: `Tháng: ${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`, style: 'normal' },
                    { text: `Số tiết dạy mỗi tuần: ${reportData.lessonsPerWeek}`, style: 'normal' },
                    { text: `Số tuần dạy: ${reportData.teachingWeeks}`, style: 'normal' },
                    { text: `Số tiết cơ bản: ${reportData.basicTeachingLessons}`, style: 'normal' },
                    { text: `Tổng số tiết được khai báo: ${reportData.totalAssignment}`, style: 'normal' },
                    { text: `Tỉ lệ hoàn thành: ${completionRate}%`, style: 'normal' },
                    { text: `Số tiết dư: ${excessLessons}`, style: 'normal' },
                    { text: '\n' },
                    { text: `Bảng thống kê số tiết giảng dạy của Giáo viên ${reportData.teacherName}:`, style: 'normal' },
                    {
                        table: {
                            headerRows: 1,
                            widths: ['auto', 'auto', '*', '*', 'auto'],
                            body: [
                                [
                                    { text: 'STT', style: 'tableHeader' },
                                    { text: 'Khối', style: 'tableHeader' },
                                    { text: 'Tên lớp', style: 'tableHeader' },
                                    { text: 'Môn học', style: 'tableHeader' },
                                    { text: 'Số tiết được phân công', style: 'tableHeader' }
                                ],
                                ...reportData.assignments.map((assignment, index) => [
                                    index + 1,
                                    assignment.grade,
                                    assignment.className,
                                    assignment.subjectName,
                                    assignment.assignedLessons
                                ])
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
                            { text: 'DUYỆT CỦA LÃNH ĐẠO\nTỔ CHUYÊN MÔN', style: 'signatureBold' },
                            { 
                                text: [
                                    { text: `Thành phố Hồ Chí Minh, ngày ${currentDate.getDate()} tháng ${currentDate.getMonth() + 1} năm ${currentDate.getFullYear()}\n`, style: 'normalItalic' },
                                    { text: 'GIÁO VIÊN BỘ MÔN\n', style: 'signatureBold' },
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
                    title: { fontSize: 12, alignment: 'center', bold: true },
                    subtitle: { fontSize: 12, alignment: 'center', italics: true, bold: true },
                    normal: { fontSize: 12, alignment: 'left' },
                    normalItalic: { fontSize: 12, alignment: 'left', italics: true },
                    normalItalic1: { fontSize: 12, alignment: 'center', italics: true },
                    signature: { fontSize: 12, alignment: 'center' },
                    signatureBold: { fontSize: 12, alignment: 'center', bold: true },
                    tableHeader: { fontSize: 12, bold: true },
                }
            };

            pdfMake.createPdf(docDefinition).download('BaoCaoGiangDayGiaoVien.pdf');
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            toast.error('Có lỗi xảy ra khi xuất báo cáo');
        }
    };

    return (
        <Button 
            variant="contained" 
            onClick={exportToPDF}
            style={{ marginTop: 20, backgroundColor: '#d98236' }}
        >
            Xuất báo cáo
        </Button>
    );
};

export default TeacherAssignmentReport;