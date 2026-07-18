const StudentSchema = require("../../models/student");
const PaymentSchema = require("../../models/payment");
const BookSchema = require("../../models/book");

const getPaymentsReport = async (req, res) => {
  try {
    const {
      searchWord,
      grade,
      group,
      type,
      status,
      month,
      year,
      fromDate,
      toDate,
      page = 1,
      limit = 10,
    } = req.query;

    // ==========================================
    // Students Query
    // ==========================================

    const studentQuery = {
      isActive: true,
    };

    if (grade) {
      studentQuery.grade = grade;
    }

    if (group) {
      studentQuery.group = group;
    }

    if (searchWord) {
      studentQuery.$or = [
        {
          fullName: {
            $regex: searchWord,
            $options: "i",
          },
        },
        {
          studentPhone: {
            $regex: searchWord,
            $options: "i",
          },
        },
        {
          parentPhone: {
            $regex: searchWord,
            $options: "i",
          },
        },
        {
          barcode: {
            $regex: searchWord,
            $options: "i",
          },
        },
      ];
    }

    // ==========================================
    // Load All Needed Data
    // ==========================================

    const [students, books, payments] = await Promise.all([
      StudentSchema.find(studentQuery)
        .populate("grade")
        .populate("group", "name monthlyPrice startDate endDate")
        .lean(),

      BookSchema.find({
        isActive: true,
      })
        .select("name price grade group")
        .lean(),

      PaymentSchema.find({}).populate("book", "name").lean(),
    ]);

    // ==========================================
    // Payment Maps
    // ==========================================

    const paymentMap = {};

    payments.forEach((payment) => {
      if (payment.type === "Book") {
        paymentMap[
          `book_${payment.student}_${payment.book?._id || payment.book}`
        ] = payment;
      }

      if (payment.type === "Subscription") {
        paymentMap[`sub_${payment.student}_${payment.month}_${payment.year}`] =
          payment;
      }
    });

    // ==========================================
    // Arabic Months
    // ==========================================

    const monthNames = {
      1: "يناير",
      2: "فبراير",
      3: "مارس",
      4: "إبريل",
      5: "مايو",
      6: "يونيو",
      7: "يوليو",
      8: "أغسطس",
      9: "سبتمبر",
      10: "أكتوبر",
      11: "نوفمبر",
      12: "ديسمبر",
    };

    // ==========================================
    // Final Transactions Array
    // ==========================================

    const transactions = [];

    const today = new Date();

    for (const student of students) {
      // ==========================================
      // Books
      // ==========================================

      const studentBooks = books.filter(
        (book) => book.grade.toString() === student.grade._id.toString(),
      );

      for (const book of studentBooks) {
        const payment = paymentMap[`book_${student._id}_${book._id}`];

        const row = {
          _id: payment?._id || `${student._id}_${book._id}`,

          student,

          grade: student.grade,

          group: student.group,

          type: "Book",

          itemName: book.name,

          itemId: book._id,

          amount: payment?.amount || student.group.monthlyPrice || book.price,

          status: payment ? payment.status : "Unpaid",

          paymentDate: payment?.paymentDate || null,

          month: null,

          year: null,

          payment,
        };

        // -----------------------
        // Filters
        // -----------------------

        if (type && row.type !== type) continue;

        if (status && row.status !== status) continue;

        if (fromDate && row.paymentDate) {
          if (new Date(row.paymentDate) < new Date(fromDate)) continue;
        }

        if (toDate && row.paymentDate) {
          const end = new Date(toDate);
          end.setHours(23, 59, 59, 999);

          if (new Date(row.paymentDate) > end) continue;
        }

        transactions.push(row);
      }

      // ==========================================
      // Subscriptions
      // ==========================================

      // بداية الاستحقاق = الأكبر بين بداية المجموعة وتاريخ تسجيل الطالب
      const groupStartDate = new Date(student.group.startDate);

      const registrationDate = student.registrationDate
        ? new Date(student.registrationDate)
        : groupStartDate;

      const startDate =
        registrationDate > groupStartDate ? registrationDate : groupStartDate;

      // نهاية الاستحقاق = الأصغر بين نهاية المجموعة واليوم الحالي
      const groupEndDate = new Date(student.group.endDate);

      const maxDate = groupEndDate > today ? today : groupEndDate;

      // نبدأ من أول شهر الاستحقاق
      let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

      while (current <= maxDate) {
        const currentMonth = current.getMonth() + 1;

        const currentYear = current.getFullYear();

        const payment =
          paymentMap[`sub_${student._id}_${currentMonth}_${currentYear}`];

        const row = {
          _id: payment?._id || `${student._id}_${currentMonth}_${currentYear}`,

          student,

          grade: student.grade,

          group: student.group,

          type: "Subscription",

          itemName: `${monthNames[currentMonth]} ${currentYear}`,

          itemId: null,

          amount: payment?.amount ?? student.group.monthlyPrice,

          status: payment ? payment.status : "Unpaid",

          paymentDate: payment?.paymentDate || null,

          month: currentMonth,

          year: currentYear,

          payment,
        };

        // -----------------------
        // Filters
        // -----------------------

        if (type && row.type !== type) {
          current.setMonth(current.getMonth() + 1);
          continue;
        }

        if (status && row.status !== status) {
          current.setMonth(current.getMonth() + 1);
          continue;
        }

        if (month && row.month !== Number(month)) {
          current.setMonth(current.getMonth() + 1);
          continue;
        }

        if (year && row.year !== Number(year)) {
          current.setMonth(current.getMonth() + 1);
          continue;
        }

        if (fromDate && row.paymentDate) {
          if (new Date(row.paymentDate) < new Date(fromDate)) {
            current.setMonth(current.getMonth() + 1);
            continue;
          }
        }

        if (toDate && row.paymentDate) {
          const end = new Date(toDate);
          end.setHours(23, 59, 59, 999);

          if (new Date(row.paymentDate) > end) {
            current.setMonth(current.getMonth() + 1);
            continue;
          }
        }

        transactions.push(row);

        current.setMonth(current.getMonth() + 1);
      }
    }

    // ==========================================
    // Summary
    // ==========================================

    const summary = {
      totalPayments: transactions.length,

      totalAmount: transactions.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
      ),

      paidAmount: transactions
        .filter((item) => item.status === "Paid")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),

      unpaidAmount: transactions
        .filter((item) => item.status !== "Paid")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),

      subscriptionAmount: transactions
        .filter((item) => item.type === "Subscription")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),

      booksAmount: transactions
        .filter((item) => item.type === "Book")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    };

    // ==========================================
    // Sort
    // ==========================================

    transactions.sort((a, b) => {
      const dateA = a.paymentDate || new Date(0);
      const dateB = b.paymentDate || new Date(0);

      return new Date(dateB) - new Date(dateA);
    });

    // ==========================================
    // Manual Pagination
    // ==========================================

    const currentPage = Number(page);
    const perPage = Number(limit);

    const totalDocs = transactions.length;

    const totalPages = Math.ceil(totalDocs / perPage);

    const docs = transactions.slice(
      (currentPage - 1) * perPage,
      currentPage * perPage,
    );

    // ==========================================
    // Response
    // ==========================================

    return res.status(200).json({
      docs,

      totalDocs,

      limit: perPage,

      totalPages,

      page: currentPage,

      pagingCounter: (currentPage - 1) * perPage + 1,

      hasPrevPage: currentPage > 1,

      hasNextPage: currentPage < totalPages,

      prevPage: currentPage > 1 ? currentPage - 1 : null,

      nextPage: currentPage < totalPages ? currentPage + 1 : null,

      summary,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "حدث خطأ أثناء استخراج تقرير المدفوعات",
    });
  }
};

module.exports = {
  getPaymentsReport,
};
