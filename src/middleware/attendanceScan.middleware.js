/*
|--------------------------------------------------------------------------
| Attendance Scan Middleware
|--------------------------------------------------------------------------
|
| This middleware makes sure that the authenticated user
| is a student before allowing QR attendance scanning.
|
|--------------------------------------------------------------------------
*/

function requireStudentForScan(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Check User Role
  |--------------------------------------------------------------------------
  */

  const role = String(req.user.role || "")
    .toLowerCase()
    .trim();

  if (role !== "student") {
    return res.status(403).json({
      message: "Only students can scan attendance QR codes",
    });
  }

  next();
}

module.exports = {
  requireStudentForScan,
};