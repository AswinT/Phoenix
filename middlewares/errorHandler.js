// Global error handler middleware - handles all unhandled errors
const errorHandler = (err, req, res, next) => {
    let status = err.status || err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Handle specific error types
    if (err.name === 'ValidationError') {
        status = 400;
        message = 'Validation Error';
    } else if (err.name === 'CastError') {
        status = 400;
        message = 'Invalid ID format';
    } else if (err.code === 11000) {
        status = 400;
        message = 'Duplicate entry';
    }

    // Send JSON response for AJAX requests
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        res.status(status).json({
            error: true,
            message: message,
            stack: err.stack,
            url: req.url,
            method: req.method
        });
    } else {
        // Render error page for regular requests
        try {
            res.status(status).render('user/errorPage', {
                status: status,
                message: message,
                error: {
                    message: err.message,
                    stack: err.stack,
                    url: req.url,
                    method: req.method
                }
            });
        } catch (renderError) {
            // Fallback if error page rendering fails
            res.status(500).send(`
                <h1>Internal Server Error</h1>
                <p>Original Error: ${err.message}</p>
                <p>Render Error: ${renderError.message}</p>
                <pre>${err.stack}</pre>
            `);
        }
    }
};

module.exports = errorHandler;