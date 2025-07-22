/**
 * Main Routes Index
 * Central routing configuration that combines all application routes
 *
 * @description Main router that organizes all user and admin routes
 * @routes /*
 */

const express = require('express');
const mainRouter = express.Router();

// Import main route modules
const userRoutes = require('./user');
const adminRoutes = require('./admin');

/**
 * Mount main route modules
 */
mainRouter.use('/', userRoutes);
mainRouter.use('/admin', adminRoutes);

/**
 * @route GET /health
 * @description Health check endpoint
 * @access Public
 */
mainRouter.get('/health', (request, response) => {
  response.status(200).json({
    status: 'OK',
    message: 'Phoenix Store API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * @route GET /api/status
 * @description API status endpoint
 * @access Public
 */
mainRouter.get('/api/status', (request, response) => {
  response.status(200).json({
    api: 'Phoenix Store API',
    version: '1.0.0',
    status: 'active',
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * Handle 404 - Route not found
 */
mainRouter.use((request, response) => {
  response.status(404).render('error/404', {
    title: 'Page Not Found - Phoenix Store',
    message: 'The page you are looking for does not exist.',
    user: response.locals.user
  });
});

module.exports = mainRouter;
