// ==============================================
// studentReportPdf.js
// توليد وحفظ ملفات PDF لتقارير الطلاب الشهرية
// ==============================================

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const { buildStudentReportHTML } = require("./studentReportTemplate");

// ==========================================
// مسار حفظ التقارير على السيرفر
// عدّل هذا المسار حسب هيكلة مشروعك
// ==========================================

const REPORTS_BASE_DIR = path.join(__dirname, "..", "..", "storage", "reports");

// ==========================================
// اسم ملف آمن (يشيل أي حروف ممكن تكسر اسم الملف)
// ==========================================

const sanitizeFileName = (name = "") =>
  name
    .toString()
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, "_");

// ==========================================
// توليد PDF لطالب واحد باستخدام صفحة puppeteer جاهزة
// (بيتم تمرير browser instance من بره عشان منفتحش
// متصفح جديد لكل طالب)
// ==========================================

const generateSingleStudentPdf = async ({
  browser,
  report,
  grade,
  period,
  gradeId,
}) => {
  const html = buildStudentReportHTML(report, grade, period, {
    subjectName: "اللغة الانجليزية",
    teacherName: "مستر هشام عبيد",
    teacherPhoto: `${process.env.SERVER_DOMAIN}/mr-image.png`,
  });

  const page = await browser.newPage();

  try {
    await page.setContent(html, { waitUntil: "networkidle0" });

    // ========================================
    // مجلد الحفظ: storage/reports/{gradeId}/{year}-{month}
    // ========================================

    const folderPath = path.join(
      REPORTS_BASE_DIR,
      gradeId.toString(),
      `${period.year}-${String(period.month).padStart(2, "0")}`,
    );

    fs.mkdirSync(folderPath, { recursive: true });

    // ========================================
    // اسم الملف: {barcode أو الاسم}-{studentId}.pdf
    // ========================================

    const fileNameBase = sanitizeFileName(
      report.student.barcode || report.student.fullName || report.student._id,
    );

    const fileName = `${fileNameBase}-${report.student._id}.pdf`;

    const filePath = path.join(folderPath, fileName);

    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
      margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
    });

    // ========================================
    // مسار نسبي يفيد لو هتخزنه في قاعدة البيانات
    // أو ترجعه في الريسبونس / تعمله رابط تحميل
    // ========================================

    const relativePath = path.relative(
      path.join(__dirname, "..", ".."),
      filePath,
    );

    return {
      filePath,
      relativePath,
      fileName,
    };
  } finally {
    await page.close();
  }
};

// ==========================================
// توليد PDF لعدة طلاب دفعة واحدة (بمتصفح واحد مشترك)
// ==========================================

const generateStudentsPdfs = async ({ reports, grade, period, gradeId }) => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const results = [];

    for (const report of reports) {
      const pdfInfo = await generateSingleStudentPdf({
        browser,
        report,
        grade,
        period,
        gradeId,
      });

      results.push({
        studentId: report.student._id,
        ...pdfInfo,
      });
    }

    return results;
  } finally {
    await browser.close();
  }
};

module.exports = {
  generateStudentsPdfs,
  generateSingleStudentPdf,
  REPORTS_BASE_DIR,
};
