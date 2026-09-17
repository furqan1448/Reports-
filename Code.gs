/**
 * نظام توثيق الأداء — جمعية فرقان
 * الخادم الخلفي (Google Apps Script) المرتبط بجدول Google Sheets
 *
 * طريقة الإعداد:
 * 1) أنشئي Google Sheet جديد فارغ.
 * 2) من القائمة: الإضافات > Apps Script، والصقي هذا الملف كاملاً بدل الكود الافتراضي.
 * 3) نفّذي الدالة setup() مرة واحدة فقط (من القائمة أعلى المحرر: اختاري setup ثم Run).
 *    هذا ينشئ الأوراق (Sheets) المطلوبة تلقائيًا.
 * 4) انشري المشروع: Deploy > New deployment > Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5) انسخي رابط الـ Web App والصقيه في ملف config.js بمكان API_URL.
 */

const SS = SpreadsheetApp.getActiveSpreadsheet;

function setup() {
  const ss = SS();

  // ورقة المستخدمين
  let users = ss.getSheetByName("المستخدمون");
  if (!users) {
    users = ss.insertSheet("المستخدمون");
    users.appendRow([
      "اسم المستخدم", "كلمة السر", "الاسم", "الدور",
      "القسم", "الوحدة", "المسمى الوظيفي", "اسم الرئيسة المباشرة",
    ]);
    // مستخدم تجريبي — عدّليه أو احذفيه بعد الإعداد
    users.appendRow([
      "unit1", "1234", "مستخدمة تجريبية", "وحدة",
      "قسم شؤون المكاتب", "وحدة المتابعة", "منسقة وحدة", "مديرة القسم",
    ]);
  }

  // ورقة البيانات الأساسية
  let basic = ss.getSheetByName("البيانات الأساسية");
  if (!basic) {
    basic = ss.insertSheet("البيانات الأساسية");
    basic.appendRow([
      "الطابع الزمني", "اسم المستخدم", "الوحدة", "الجهة الرئيسة",
      "نوع الجهة", "اسم القسم", "اسم قسم آخر", "اسم المكتب", "اسم الوحدة",
      "نوع الفترة", "الشهر", "الفصل", "العام الهجري", "تاريخ البداية", "تاريخ النهاية",
      "اسم معدة التقرير", "المسمى الوظيفي", "اسم الرئيسة المباشرة",
    ]);
  }

  SpreadsheetApp.flush();
}

// ================= أدوات مساعدة =================

function colIndex_(sheet, headerName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idx = headers.findIndex((h) => String(h).trim() === headerName.trim());
  return idx === -1 ? -1 : idx + 1;
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function ok_(data) {
  return jsonOut_(Object.assign({ ok: true }, data || {}));
}

function fail_(message) {
  return jsonOut_({ ok: false, error: message });
}

// ================= نقاط الدخول =================

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    const action = req.action;

    switch (action) {
      case "login":
        return login_(req);
      case "saveBasicData":
        return saveBasicData_(req);
      case "getBasicData":
        return getBasicData_(req);
      default:
        return fail_("إجراء غير معروف: " + action);
    }
  } catch (err) {
    return fail_("خطأ في الخادم: " + err.message);
  }
}

function doGet(e) {
  return jsonOut_({ ok: true, message: "نظام توثيق الأداء يعمل بنجاح" });
}

// ================= تسجيل الدخول =================

function login_(req) {
  const sheet = SS().getSheetByName("المستخدمون");
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];

  const iUser = headers.indexOf("اسم المستخدم");
  const iPass = headers.indexOf("كلمة السر");
  const iName = headers.indexOf("الاسم");
  const iRole = headers.indexOf("الدور");
  const iDept = headers.indexOf("القسم");
  const iUnit = headers.indexOf("الوحدة");
  const iTitle = headers.indexOf("المسمى الوظيفي");
  const iMgr = headers.indexOf("اسم الرئيسة المباشرة");

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (
      String(row[iUser]).trim() === String(req.username).trim() &&
      String(row[iPass]).trim() === String(req.password).trim()
    ) {
      return ok_({
        user: {
          username: row[iUser],
          name: row[iName],
          role: row[iRole],
          department: row[iDept],
          unit: row[iUnit],
          jobTitle: row[iTitle],
          directManager: row[iMgr],
        },
      });
    }
  }
  return fail_("اسم المستخدم أو كلمة السر غير صحيحة");
}

// ================= البيانات الأساسية =================

function saveBasicData_(req) {
  const sheet = SS().getSheetByName("البيانات الأساسية");
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const rows = sheet.getDataRange().getValues();
  const iUnitCol = headers.indexOf("الوحدة");
  const iUserCol = headers.indexOf("اسم المستخدم");

  let targetRow = -1;
  for (let r = 1; r < rows.length; r++) {
    if (
      String(rows[r][iUserCol]).trim() === String(req.username).trim() &&
      String(rows[r][iUnitCol]).trim() === String(req.unit).trim()
    ) {
      targetRow = r + 1; // 1-indexed sheet row
      break;
    }
  }

  const values = [
    new Date(),
    req.username || "",
    req.unit || "",
    req.mainEntity || "",
    req.reportingType || "",
    req.departmentName || "",
    req.otherDeptName || "",
    req.officeName || "",
    req.unitName || "",
    req.periodType || "",
    req.reportMonth || "",
    req.reportSemester || "",
    req.hijriYear || "",
    req.startDate || "",
    req.endDate || "",
    req.preparerName || "",
    req.preparerTitle || "",
    req.directManagerName || "",
  ];

  if (targetRow === -1) {
    sheet.appendRow(values);
  } else {
    sheet.getRange(targetRow, 1, 1, values.length).setValues([values]);
  }

  return ok_({});
}

function getBasicData_(req) {
  const sheet = SS().getSheetByName("البيانات الأساسية");
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];

  const iUnitCol = headers.indexOf("الوحدة");
  const iUserCol = headers.indexOf("اسم المستخدم");

  for (let r = rows.length - 1; r >= 1; r--) {
    if (
      String(rows[r][iUserCol]).trim() === String(req.username).trim() &&
      String(rows[r][iUnitCol]).trim() === String(req.unit).trim()
    ) {
      const row = rows[r];
      return ok_({
        record: {
          reportingType: row[headers.indexOf("نوع الجهة")],
          departmentName: row[headers.indexOf("اسم القسم")],
          otherDeptName: row[headers.indexOf("اسم قسم آخر")],
          officeName: row[headers.indexOf("اسم المكتب")],
          unitName: row[headers.indexOf("اسم الوحدة")],
          periodType: row[headers.indexOf("نوع الفترة")],
          reportMonth: row[headers.indexOf("الشهر")],
          reportSemester: row[headers.indexOf("الفصل")],
          hijriYear: row[headers.indexOf("العام الهجري")],
          startDate: row[headers.indexOf("تاريخ البداية")],
          endDate: row[headers.indexOf("تاريخ النهاية")],
          preparerName: row[headers.indexOf("اسم معدة التقرير")],
          preparerTitle: row[headers.indexOf("المسمى الوظيفي")],
          directManagerName: row[headers.indexOf("اسم الرئيسة المباشرة")],
        },
      });
    }
  }
  return ok_({ record: null });
}
