// src/controllers/controllerRequests.js

const Request = require('../models/requests');

// Hàm trợ giúp để populate chỉ lấy tên và loại bỏ _id của tài liệu được populate
const populateRequestMinimal = (query) => {
    return query
        // Lấy tên Student/User và loại bỏ _id của nó
        .populate('studentId', 'name -_id')
        // Lấy tên Club và loại bỏ _id của nó
        .populate('clubId', 'name -_id');
};

// @desc    Lấy tất cả requests
// @route   GET /api/requests
exports.getAllRequests = async (req, res) => {
    try {
        const filter = {};
        if (req.query.clubId) {
            filter.clubId = req.query.clubId;
        }
        if (req.query.status) {
            filter.status = req.query.status;
        }

        let query = Request.find(filter);
        query = populateRequestMinimal(query);

        const requests = await query;

        res.status(200).json({
            success: true,
            count: requests.length,
            data: requests
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Tạo một request mới
// @route   POST /api/requests
exports.createRequest = async (req, res) => {
    try {
        const { studentId, clubId, message } = req.body;
        const existingRequest = await Request.findOne({
            studentId,
            clubId,
            status: { $in: ['pending', 'accepted'] }
        });

        if (existingRequest) {
            return res.status(400).json({
                success: false,
                error: 'Bạn đã có yêu cầu tham gia pending hoặc đã được chấp nhận cho câu lạc bộ này.'
            });
        }

        let request = await Request.create({ studentId, clubId, message });

        // Populate request vừa tạo trước khi trả về
        request = await populateRequestMinimal(Request.findById(request._id));

        res.status(201).json({ success: true, data: request });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};

// @desc    Cập nhật trạng thái của một request
// @route   PUT /api/requests/:id/status
exports.updateRequestStatus = async (req, res) => {
    try {
        const requestId = req.params.id;
        const newStatus = req.body.status;
        const validStatuses = ['pending', 'accepted', 'rejected'];

        if (!validStatuses.includes(newStatus)) {
            return res.status(400).json({
                success: false,
                error: `Trạng thái không hợp lệ. Phải là: ${validStatuses.join(', ')}`
            });
        }

        let request = await Request.findByIdAndUpdate(
            requestId,
            { status: newStatus },
            { new: true, runValidators: true }
        );

        if (!request) {
            return res.status(404).json({ success: false, error: 'Request không tồn tại' });
        }

        // Populate request sau khi cập nhật
        request = await populateRequestMinimal(Request.findById(request._id));

        res.status(200).json({ success: true, data: request });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Thống kê số lượng request theo Club ID và Status
// @route   GET /api/requests/stats
exports.getRequestsStats = async (req, res) => {
    try {
        const stats = await Request.aggregate([
            {
                $group: {
                    _id: { clubId: "$clubId", status: "$status" },
                    count: { $sum: 1 },
                },
            },
            { $sort: { "_id.clubId": 1, "_id.status": 1 } },

            // JOIN với collection clubs
            {
                $lookup: {
                    // Dùng tên collection Club đã được sửa trong Model clubs.js (ví dụ: 'Project.clubs')
                    from: 'Project.clubs',
                    localField: '_id.clubId',
                    foreignField: '_id',
                    as: 'clubInfo'
                }
            },
            { $unwind: "$clubInfo" },

            // CHỈ LẤY các trường cần thiết (Tên Club, Status, Count)
            {
                $project: {
                    _id: 0,
                    clubName: "$clubInfo.name",
                    status: "$_id.status",
                    count: 1
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};