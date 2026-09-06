// ==============================================
// studentReportTemplate.js
// بناء الـ HTML الخاص بتقرير الطالب الشهري (عربي - RTL)
// تصميم Modern مع هيدر جراديانت وصورة المدرس
// ==============================================

const formatDate = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatDateTime = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusBadge = (status, goodValues = ["Present", "Paid"]) => {
  const isGood = goodValues.includes(status);
  const color = isGood ? "#0f9d58" : "#e34133";
  const bg = isGood ? "#e5f7ec" : "#fdeceb";
  const label =
    {
      Present: "حاضر",
      Absent: "غائب",
      Paid: "مدفوع",
      Unpaid: "غير مدفوع",
    }[status] || status;

  return `<span style="
    display:inline-block;
    padding:3px 12px;
    border-radius:20px;
    font-size:11px;
    font-weight:700;
    color:${color};
    background:${bg};
  ">${label}</span>`;
};

// ==========================================
// أفاتار افتراضي (لو مفيش صورة مدرس)
// حروف اسم المدرس داخل دائرة ملونة
// ==========================================

const buildInitialsAvatar = (name = "") => {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  return `<div style="
    width:64px;
    height:64px;
    border-radius:50%;
    background:rgba(255,255,255,0.18);
    border:2px solid rgba(255,255,255,0.55);
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:22px;
    font-weight:700;
    color:#fff;
  ">${initials || "؟"}</div>`;
};

/**
 * buildStudentReportHTML
 * @param {Object} report   بيانات تقرير الطالب (زي ما هي من الكنترولر)
 * @param {Object} grade    بيانات الصف الدراسي
 * @param {Object} period   { month, year, monthName }
 * @param {Object} course   بيانات المادة/المدرس (اختياري)
 *   @param {string} course.subjectName  اسم المادة (مثال: "اللغة الإنجليزية")
 *   @param {string} course.teacherName  اسم المدرس (مثال: "أ. أحمد المصري")
 *   @param {string} course.teacherPhoto رابط صورة أو base64 data URI للمدرس
 */
const buildStudentReportHTML = (report, grade, period, course = {}) => {
  const { student, attendance, books, subscription, exams, payments } = report;

  const { subjectName = "", teacherName = "", teacherPhoto = "" } = course;

  // ==========================================
  // Attendance Rows
  // ==========================================

  const attendanceRows = attendance.sessions
    .map(
      (s, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${formatDate(s.sessionDate)}</td>
        <td>${statusBadge(s.status)}</td>
        <td>${formatDateTime(s.scannedAt)}</td>
      </tr>`,
    )
    .join("");

  // ==========================================
  // Books Rows
  // ==========================================

  const booksRows = books.items
    .map(
      (b, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${b.name || "-"}</td>
        <td>${b.price ?? "-"}</td>
        <td>${formatDate(b.assignedAt)}</td>
        <td>${statusBadge(b.paymentStatus)}</td>
        <td>${formatDate(b.paymentDate)}</td>
      </tr>`,
    )
    .join("");

  // ==========================================
  // Exams Rows
  // ==========================================

  const examsRows = exams.items
    .map(
      (e, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${e.examName || "-"}</td>
        <td>${formatDate(e.examDate)}</td>
        <td>${e.degree ?? "-"} / ${e.totalDegree ?? "-"}</td>
        <td>${e.percentage ?? 0}%</td>
        <td>${statusBadge(e.status)}</td>
      </tr>`,
    )
    .join("");

  // ==========================================
  // Payments Rows
  // ==========================================

  const paymentsRows = payments.items
    .map(
      (p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${p.type ? (p.type == "Subscription" ? "اشتراك شهري" : "مذكرة") : "-"}</td>
        <td>${p.book?.name || "-"}</td>
        <td>${p.amount ?? 0}</td>
        <td>${statusBadge(p.status)}</td>
        <td>${formatDate(p.paymentDate)}</td>
      </tr>`,
    )
    .join("");

  // ==========================================
  // Teacher Photo / Avatar Block
  // ==========================================

  const teacherPhotoBlock = teacherPhoto
    ? `<img src="${teacherPhoto}" style="
        width:64px;
        height:64px;
        border-radius:50%;
        object-fit:cover;
        border:2px solid rgba(255,255,255,0.55);
      " />`
    : buildInitialsAvatar(teacherName);

  // ==========================================
  // Final HTML
  // ==========================================

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4; margin: 0; }

  * { box-sizing: border-box; }

  body {
    font-family: "Cairo", "Amiri", "Segoe UI", Tahoma, sans-serif;
    direction: rtl;
    color: #1e2430;
    font-size: 12px;
    margin: 0;
    background: #f4f5f9;
  }

  .page {
    padding: 0 0 28px;
  }

  /* ============ HEADER ============ */

  .header {
    background: linear-gradient(120deg, #4338ca 0%, #6d28d9 55%, #9333ea 100%);
    color: #fff;
    padding: 26px 32px 22px;
    position: relative;
    overflow: hidden;
  }

  @font-face {
  font-family: 'Cairo';
  src: url('${process.env.SERVER_DOMAIN}/Cairo-VariableFont_slnt,wght.ttf') format('truetype-variations');
  font-weight: 100 900; /* لأن الخط Variable فيدعم كل الأوزان */
  font-style: normal;$
}


  .header::after {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 85% -20%, rgba(255,255,255,0.18), transparent 55%);
  }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    z-index: 1;
  }

  .teacher-block {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .teacher-info .subject {
    font-size: 16px;
    font-weight: 800;
    margin: 0 0 2px;
  }

  .teacher-info .teacher {
    font-size: 12px;
    opacity: 0.9;
    font-weight: 600;
  }

  .report-title {
    text-align: left;
  }

  .report-title .title {
    font-size: 15px;
    font-weight: 800;
    margin: 0 0 3px;
  }

  .report-title .sub {
    font-size: 11px;
    opacity: 0.85;
  }

  .header-bottom {
    margin-top: 18px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    position: relative;
    z-index: 1;
  }

  .student-name {
    font-size: 20px;
    font-weight: 800;
  }

  .grade-chip {
    display: inline-block;
    margin-top: 6px;
    background: rgba(255,255,255,0.16);
    border: 1px solid rgba(255,255,255,0.35);
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
  }

  .month-chip {
    background: #fff;
    color: #4338ca;
    padding: 8px 16px;
    border-radius: 12px;
    font-weight: 800;
    font-size: 13px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
  }

  /* ============ CONTENT ============ */

  .content {
    padding: 22px 32px 0;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 22px;
  }

  .info-item {
    background: #fff;
    border-radius: 10px;
    padding: 10px 14px;
    border: 1px solid #ecebf5;
  }

  .info-item .label {
    font-size: 10px;
    color: #8b8fa3;
    font-weight: 600;
    display: block;
    margin-bottom: 3px;
  }

  .info-item .value {
    font-size: 12.5px;
    font-weight: 700;
    color: #1e2430;
  }

  .section {
    background: #fff;
    border-radius: 14px;
    padding: 18px 20px 20px;
    margin-bottom: 18px;
    border: 1px solid #ecebf5;
  }

  .section-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
  }

  .section-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #7c3aed;
  }

  .section-title {
    font-size: 14px;
    font-weight: 800;
    color: #1e2430;
  }

  .summary-cards {
    display: flex;
    gap: 10px;
    margin-bottom: 14px;
  }

  .card {
    flex: 1;
    background: #f7f6fd;
    border-radius: 10px;
    padding: 12px 8px;
    text-align: center;
  }

  .card .num {
    font-size: 19px;
    font-weight: 800;
    color: #4338ca;
  }

  .card .lbl {
    font-size: 9.5px;
    color: #6b6f80;
    margin-top: 3px;
    font-weight: 600;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th {
    background: #f3f1fb;
    color: #4c4a6a;
    font-size: 10.5px;
    font-weight: 700;
    padding: 8px 6px;
    border-bottom: 2px solid #e6e3f7;
  }

  td {
    padding: 7px 6px;
    text-align: center;
    font-size: 11px;
    border-bottom: 1px solid #f0f0f5;
  }

  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: #fbfafe; }

  .empty-note {
    text-align: center;
    color: #a3a6b5;
    padding: 16px;
    font-size: 11px;
    font-style: italic;
  }

  .footer {
    margin-top: 6px;
    text-align: center;
    font-size: 9.5px;
    color: #a3a6b5;
  }

    .section,
  .info-grid,
  .summary-cards,
  table,
  tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .header {
    break-after: avoid;
    page-break-after: avoid;
  }
</style>
</head>
<body>
<div class="page">

  <!-- ================= HEADER ================= -->
  <div class="header">
    <div class="header-top">
      <div class="teacher-block">
        ${teacherPhotoBlock}
        <div class="teacher-info">
          <p class="subject">${subjectName || "درس اللغة الانجليزية"}</p>
          <p class="teacher">${teacherName || ""}</p>
        </div>
      </div>
      <div class="report-title">
        <p class="title">تقرير الطالب الشهري</p>
        <p class="sub">تاريخ الإصدار: ${formatDate(new Date())}</p>
      </div>
    </div>

    <div class="header-bottom">
      <div>
        <div class="student-name">${student.fullName || "-"}</div>
        <span class="grade-chip">${grade?.name || "-"} ${student.group?.name ? "• " + student.group.name : ""}</span>
      </div>
      <div class="month-chip">${period.monthName} ${period.year}</div>
    </div>
  </div>

  <!-- ================= CONTENT ================= -->
  <div class="content">

    <div class="info-grid">
      <div class="info-item">
        <span class="label">الباركود</span>
        <span class="value">${student.barcode || "-"}</span>
      </div>
      <div class="info-item">
        <span class="label">هاتف الطالب</span>
        <span class="value">${student.studentPhone || "-"}</span>
      </div>
      <div class="info-item">
        <span class="label">هاتف ولي الأمر</span>
        <span class="value">${student.parentPhone || "-"}</span>
      </div>
      <div class="info-item">
        <span class="label">تاريخ التسجيل</span>
        <span class="value">${formatDate(student.registrationDate)}</span>
      </div>
      <div class="info-item">
        <span class="label">الاشتراك الشهري</span>
        <span class="value">${subscription.amount ?? 0} ج.م</span>
      </div>
      <div class="info-item">
        <span class="label">حالة الاشتراك</span>
        <span class="value">${statusBadge(subscription.status)}</span>
      </div>
    </div>

    <!-- Attendance -->
    <div class="section">
      <div class="section-head">
        <span class="section-dot"></span>
        <span class="section-title">الحضور والغياب</span>
      </div>
      <div class="summary-cards">
        <div class="card"><div class="num">${attendance.totalSessions}</div><div class="lbl">إجمالي الحصص</div></div>
        <div class="card"><div class="num">${attendance.presentCount}</div><div class="lbl">حاضر</div></div>
        <div class="card"><div class="num">${attendance.absentCount}</div><div class="lbl">غائب</div></div>
        <div class="card"><div class="num">${attendance.attendancePercentage}%</div><div class="lbl">نسبة الحضور</div></div>
      </div>
      ${
        attendanceRows
          ? `<table>
              <thead><tr><th>#</th><th>التاريخ</th><th>الحالة</th><th>وقت التسجيل</th></tr></thead>
              <tbody>${attendanceRows}</tbody>
            </table>`
          : `<div class="empty-note">لا يوجد حصص مسجلة خلال هذا الشهر</div>`
      }
    </div>

    <!-- Exams -->
    <div class="section">
      <div class="section-head">
        <span class="section-dot"></span>
        <span class="section-title">الاختبارات</span>
      </div>
      <div class="summary-cards">
        <div class="card"><div class="num">${exams.totalExams}</div><div class="lbl">إجمالي الاختبارات</div></div>
        <div class="card"><div class="num">${exams.attendedExamsCount}</div><div class="lbl">حضر</div></div>
        <div class="card"><div class="num">${exams.absentExamsCount}</div><div class="lbl">غاب</div></div>
        <div class="card"><div class="num">${exams.averagePercentage}%</div><div class="lbl">متوسط الدرجات</div></div>
      </div>
      ${
        examsRows
          ? `<table>
              <thead><tr><th>#</th><th>اسم الاختبار</th><th>التاريخ</th><th>الدرجة</th><th>النسبة</th><th>الحالة</th></tr></thead>
              <tbody>${examsRows}</tbody>
            </table>`
          : `<div class="empty-note">لا توجد اختبارات مسجلة خلال هذا الشهر</div>`
      }
    </div>

    <!-- Payments -->
    <div class="section">
      <div class="section-head">
        <span class="section-dot"></span>
        <span class="section-title">المدفوعات خلال الشهر</span>
      </div>
      <div class="summary-cards">
        <div class="card"><div class="num">${payments.totalPayments}</div><div class="lbl">عدد المدفوعات</div></div>
        <div class="card"><div class="num">${payments.totalPaidAmount}</div><div class="lbl">إجمالي المبلغ المدفوع</div></div>
      </div>
      ${
        paymentsRows
          ? `<table>
              <thead><tr><th>#</th><th>النوع</th><th>الكتاب</th><th>المبلغ</th><th>الحالة</th><th>التاريخ</th></tr></thead>
              <tbody>${paymentsRows}</tbody>
            </table>`
          : `<div class="empty-note">لا توجد مدفوعات مسجلة خلال هذا الشهر</div>`
      }
    </div>

  </div>
</div>
</body>
</html>`;
};

module.exports = { buildStudentReportHTML };
