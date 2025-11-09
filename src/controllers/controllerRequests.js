// src/controllers/controllerRequests.js

const Request = require('../models/requests');
const Club = require('../models/clubs');
const User = require('../models/users');

// Hàm trợ giúp để populate đầy đủ thông tin
const populateRequestFull = (query) => {
    return query
        .populate('studentId', 'name email _id')
        .populate({
            path: 'clubId',
            select: 'name description managerId _id',
            populate: {
                path: 'managerId',
                select: 'name email _id'
            }
        });
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
        if (req.query.studentId) {
            filter.studentId = req.query.studentId;
        }

        let query = Request.find(filter).sort({ createdAt: -1 });
        query = populateRequestFull(query);

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

// @desc    Lấy requests của các clubs mà user là manager
// @route   GET /api/requests/my-clubs
exports.getMyClubRequests = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;

        // Nếu là admin, trả về tất cả requests
        if (userRole === 'admin') {
            const filter = {};
            if (req.query.status) {
                filter.status = req.query.status;
            }
            if (req.query.clubId) {
                filter.clubId = req.query.clubId;
            }

            let query = Request.find(filter).sort({ createdAt: -1 });
            query = populateRequestFull(query);
            const requests = await query;

            return res.status(200).json({
                success: true,
                count: requests.length,
                data: requests
            });
        }

        // Lấy các clubs mà user là manager (bao gồm cả pending và approved)
        const managedClubs = await Club.find({ managerId: userId }).select('_id status');
        const managedClubIds = managedClubs.map(club => club._id);

        if (managedClubIds.length === 0) {
            return res.status(200).json({
                success: true,
                count: 0,
                data: [],
                message: 'Bạn chưa có CLB nào để quản lý'
            });
        }

        // Lọc requests của các clubs này
        const filter = { clubId: { $in: managedClubIds } };
        if (req.query.status) {
            filter.status = req.query.status;
        }
        if (req.query.clubId && managedClubIds.some(id => id.toString() === req.query.clubId)) {
            filter.clubId = req.query.clubId;
        }

        let query = Request.find(filter).sort({ createdAt: -1 });
        query = populateRequestFull(query);

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
        request = await populateRequestFull(Request.findById(request._id)); 

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
        const managerId = req.user._id; // Lấy từ middleware protect

        if (!validStatuses.includes(newStatus)) {
            return res.status(400).json({
                success: false,
                error: `Trạng thái không hợp lệ. Phải là: ${validStatuses.join(', ')}`
            });
        }

        // Lấy request (chưa populate)
        let request = await Request.findById(requestId);
        
        if (!request) {
            return res.status(404).json({ success: false, error: 'Request không tồn tại' });
        }

        // Lấy club để kiểm tra quyền
        const club = await Club.findById(request.clubId);
        if (!club) {
            return res.status(404).json({ success: false, error: 'Club không tồn tại' });
        }

        // Kiểm tra user có phải là manager của club không
        if (club.managerId.toString() !== managerId.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                error: 'Bạn không có quyền xử lý request này. Chỉ manager của club hoặc admin mới được phép.' 
            });
        }

        // Cập nhật trạng thái request
        request.status = newStatus;
        await request.save();

        // Nếu được chấp nhận, tự động thêm member vào club
        if (newStatus === 'accepted') {
            const user = await User.findById(request.studentId);

            if (!club || !user) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Club hoặc User không tồn tại' 
                });
            }

            // Kiểm tra đã là thành viên chưa
            const isAlreadyMember = club.members.some(
                (m) => m.userId.toString() === request.studentId.toString()
            );

            if (!isAlreadyMember) {
                // Thêm user vào danh sách thành viên CLB
                club.members.push({ 
                    userId: request.studentId, 
                    joinedAt: new Date() 
                });

                // Thêm club vào danh sách CLB đã tham gia của user
                const isClubInUserList = user.joinedClubs.some(
                    (c) => c.clubId.toString() === request.clubId.toString()
                );
                
                if (!isClubInUserList) {
                    user.joinedClubs.push({ 
                        clubId: request.clubId, 
                        joinedAt: new Date() 
                    });
                }

                // Lưu thay đổi
                await club.save();
                await user.save();
            }
        }
        
        // Populate request sau khi cập nhật
        request = await populateRequestFull(Request.findById(request._id));

        res.status(200).json({ 
            success: true, 
            data: request,
            message: newStatus === 'accepted' 
                ? 'Đã chấp nhận request và thêm thành viên vào club' 
                : 'Đã cập nhật trạng thái request'
        });
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