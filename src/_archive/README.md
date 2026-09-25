# `_archive` — Unmounted / In-Progress Modules

These files are **not loaded by the running server**:
nothing in `src/` requires them and they are not mounted
in `src/routes/index.js`. They were moved here (with fixed
relative paths, still syntax-checked) to keep the live
folders clean.

To reactivate a module: move it back to `src/routes/` or
`src/controllers/`, restore its original relative requires
(`../../x` → `../x`), mount it in `src/routes/index.js`,
and add it to `src/docs/` (Swagger).

## Contents

| File | Status |
|---|---|
| `routes/attendanceFlag.routes.js` + `controllers/attendanceFlag.controller.js` | Unmounted draft (flag generation/resolution) |
| `routes/audit.routes.js` + `controllers/audit.controller.js` | Unmounted draft (audit log reads) |
| `routes/chatbot.routes.js` + `controllers/chatbot.controller.js` | Unmounted draft (assistant endpoint) |
| `routes/correctionApproval/Rejection/Request/Review.routes.js` | Unmounted variants; live flow is `routes/correction.routes.js` + `controllers/corrections.controller.js` |
| `routes/lecturerDashboard.routes.js` | Unmounted; lecturer stats live in `routes/lecturer.routes.js` |
| `routes/lecturerSection.routes.js` | Empty/unmounted; lecturer sections live in `routes/lecturer.routes.js` |
| `routes/studentDashboard.routes.js` | Unmounted; student summary lives in `routes/studentAttendance.routes.js` |
| `controllers/enrollments.controller.js` | Unreferenced; enrollment ops live in `controllers/students.controller.js` + `lecturerEnrollment.controller.js` |
| `controllers/notifications.controller.js` | Unreferenced (no route) |
| `controllers/staff.controller.js` | Unreferenced (no route) |
