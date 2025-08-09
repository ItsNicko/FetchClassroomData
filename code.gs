function exportClassroomAssignmentsToSheet() {
  // ---- CONFIGURATION ----
  const targetSpreadsheetId = '1tNGH90IDMUWxT_QLQCQtRTYcKGZI-_etk4tk6oq4PmQ'; // Target Google Sheet ID
  const sheetName = "Sheet1"; // Name of the target sheet
  const header = ["Class Teacher", "Assignment", "Due Date", "Status", "Synced"]; // Column headers

  // ---- GET OR CREATE SHEET ----
  const ss = SpreadsheetApp.openById(targetSpreadsheetId);
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    // If sheet doesn't exist, create it and add headers
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(header);
  }

  // ---- VALIDATE HEADERS ----
  const currentHeader = sheet.getRange(1, 1, 1, header.length).getValues()[0];
  if (JSON.stringify(currentHeader) !== JSON.stringify(header)) {
    // If headers don't match, clear old data (except headers)
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).clearContent();
    }
    // Set correct headers
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
  }

  // ---- LOAD EXISTING SHEET DATA ----
  const data = sheet.getDataRange().getValues(); // All rows (headers included)
  const existingData = data.slice(1); // Skip header row

  // Map to quickly find existing rows by "Class Teacher|Assignment" key
  const rowMap = new Map();
  existingData.forEach((row, i) => {
    const key = `${row[0]}|${row[1]}`;
    const syncedValue = row[4]; 
    rowMap.set(key, { rowIndex: i + 2, syncedValue }); // Store row index & Synced value
  });

  // ---- GOOGLE CLASSROOM API AUTH ----
  const token = ScriptApp.getOAuthToken();
  const fetchHeaders = { Authorization: "Bearer " + token };

  const coursesUrl = "https://classroom.googleapis.com/v1/courses?studentId=me&courseStates=ACTIVE";

  try {
    // ---- FETCH ACTIVE COURSES ----
    const coursesResponse = UrlFetchApp.fetch(coursesUrl, { headers: fetchHeaders });
    const courses = JSON.parse(coursesResponse.getContentText()).courses || [];

    // Store active assignments for deletion check
    const activeKeys = new Set();

    courses.forEach(course => {
      const classTeacher = course.name;

      // Fetch coursework for each course
      const courseworkUrl = `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork`;
      const courseworkResponse = UrlFetchApp.fetch(courseworkUrl, { headers: fetchHeaders });
      const coursework = JSON.parse(courseworkResponse.getContentText()).courseWork || [];

      // Record each active assignment
      coursework.forEach(work => {
        const key = `${classTeacher}|${work.title}`;
        activeKeys.add(key);
      });
    });

    // ---- REMOVE INACTIVE ASSIGNMENTS ----
    const rowsToDelete = [];
    existingData.forEach((row, i) => {
      const key = `${row[0]}|${row[1]}`;
      if (!activeKeys.has(key)) {
        rowsToDelete.push(i + 2); // Store row index for deletion
      }
    });

    // Delete rows in reverse order (to avoid shifting issues)
    rowsToDelete.sort((a, b) => b - a);
    rowsToDelete.forEach(rowNum => {
      sheet.deleteRow(rowNum);
      Logger.log(`Deleted row ${rowNum} as assignment no longer active`);
    });

    // ---- ADD OR UPDATE ASSIGNMENTS ----
    courses.forEach(course => {
      const classTeacher = course.name;

      const courseworkUrl = `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork`;
      const courseworkResponse = UrlFetchApp.fetch(courseworkUrl, { headers: fetchHeaders });
      const coursework = JSON.parse(courseworkResponse.getContentText()).courseWork || [];

      coursework.forEach(work => {
        const key = `${classTeacher}|${work.title}`;

        // Format due date or set default text
        const dueDate = work.dueDate
          ? `${work.dueDate.year}-${work.dueDate.month}-${work.dueDate.day}`
          : "No due date";

        // ---- GET SUBMISSION STATUS ----
        const submissionUrl = `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork/${work.id}/studentSubmissions?userId=me`;
        let status = "No submission";

        try {
          const submissionResponse = UrlFetchApp.fetch(submissionUrl, { headers: fetchHeaders });
          const submissions = JSON.parse(submissionResponse.getContentText()).studentSubmissions || [];
          if (submissions.length > 0) {
            status = submissions[0].state;
          }
        } catch (e) {
          Logger.log(`Error fetching submission for "${work.title}": ${e}`);
        }

        // Skip assignments already turned in
        if (status === "TURNED_IN") return;

        // Preserve the existing Synced value if it exists
        const syncedValue = rowMap.has(key) ? rowMap.get(key).syncedValue : "";

        // Row structure for insertion/update
        const rowValues = [classTeacher, work.title, dueDate, status, syncedValue];

        if (rowMap.has(key)) {
          // Update existing row
          const { rowIndex } = rowMap.get(key);
          sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
          Logger.log(`Updated row ${rowIndex} for "${key}" with Synced: "${syncedValue}"`);
        } else {
          // Append new assignment row
          sheet.appendRow(rowValues);
          Logger.log(`Appended new row for "${key}"`);
        }
      });
    });

    // ---- FINALIZE ----
    SpreadsheetApp.flush();
    Logger.log("Sync complete.");

  } catch (e) {
    Logger.log("Error: " + e.toString());
  }
}
