// src/middleware/error.js
function errorHandler(err, req, res, next) {
    // Xətanı terminalda görək (yalnız development mühitində faydalıdır)
    console.error("Error Log:", err.stack);

    // Əgər bizim AppError-dursa statusCode gələcək, yoxsa 500 (Server Error)
    const status = err.statusCode || 500;
    
    // Müəllimin dediyi "Real API cavablarına əsaslanan" mesaj
    const message = err.message || "Daxili server xətası baş verdi";

    res.status(status).json({
        success: false, // Bütün xətalarda false qaytarırıq
        message: message,
        // Müəllim üçün: production-da stack trace gizlədirik ki, təhlükəsizlik pozulmasın
        stack: process.env.NODE_ENV === 'development' ? err.stack : {}
    });
}

module.exports = errorHandler;