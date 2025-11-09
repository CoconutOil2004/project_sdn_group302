// src/routes/requests.js

const express = require('express');
const {
    getAllRequests,
    createRequest,
    updateRequestStatus,
    getRequestsStats,
    getMyClubRequests
} = require('../controllers/controllerRequests'); 
const { protect } = require('../middleware/authMiddleware');

const requestRouter = express.Router();

// Route THỐNG KÊ (phải đặt trước route '/')
requestRouter.route('/stats').get(protect, getRequestsStats);

// Route lấy requests của manager (phải đặt trước route '/')
requestRouter.route('/my-clubs').get(protect, getMyClubRequests);

// Tạo request mới (cần đăng nhập)
requestRouter.route('/')
    .get(protect, getAllRequests) // GET /api/requests
    .post(protect, createRequest); // POST /api/requests

// Route cập nhật trạng thái (cần đăng nhập và là manager/admin)
requestRouter.route('/:id/status')
    .put(protect, updateRequestStatus); // PUT /api/requests/:id/status

module.exports = requestRouter;