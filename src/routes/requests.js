// src/routes/requests.js

const express = require('express');
const {
    getAllRequests,
    createRequest,
    updateRequestStatus,
    getRequestsStats
} = require('../controllers/controllerRequests'); 

const requestRouter = express.Router();

// Route THỐNG KÊ (phải đặt trước route '/')
requestRouter.route('/stats').get(getRequestsStats);

requestRouter.route('/')
    .get(getAllRequests) // GET /api/requests
    .post(createRequest); // POST /api/requests

// Route cập nhật trạng thái
requestRouter.route('/:id/status')
    .put(updateRequestStatus); // PUT /api/requests/:id/status

module.exports = requestRouter;