// src/routes/requests.js

const express = require('express');
const {
    getAllRequests,
    createRequest,
    updateRequestStatus,
    getRequestsStats
} = require('../controllers/controllerRequests'); 

const router = express.Router();

// Route THỐNG KÊ (phải đặt trước route '/')
router.route('/stats').get(getRequestsStats);

router.route('/')
    .get(getAllRequests) // GET /api/requests
    .post(createRequest); // POST /api/requests

// Route cập nhật trạng thái
router.route('/:id/status')
    .put(updateRequestStatus); // PUT /api/requests/:id/status

module.exports = router;