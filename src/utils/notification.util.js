const Notification = require('../models/notifications');
const User = require('../models/users');
const { sendMail } = require('./mail.util'); 

/**
 * Tạo và lưu một thông báo mới vào DB.
 */
const createNotification = async (userId, content, type, metadata = {}) => {
    try {
        const newNotification = new Notification({
            userId,
            content,
            type,
            metadata,
        });
        await newNotification.save();
        return newNotification;
    } catch (error) {
        console.error("Lỗi khi tạo notification:", error);
    }
};

/**
 * Gửi email thông báo kết quả request.
 */
const sendRequestStatusEmail = async (studentId, clubName, status) => {
    try {
        const student = await User.findById(studentId).select('email name');
        if (!student) return;

        const subject = status === 'accepted' 
            ? ` Chúc mừng! Yêu cầu tham gia ${clubName} đã được chấp nhận.`
            : ` Rất tiếc: Yêu cầu tham gia ${clubName} đã bị từ chối.`;

        const body = status === 'accepted' 
            ? `<p>Xin chào ${student.name},</p><p>Yêu cầu tham gia Câu lạc bộ <b>${clubName}</b> của bạn đã được <b>CHẤP NHẬN</b>.</p>`
            : `<p>Xin chào ${student.name},</p><p>Yêu cầu tham gia Câu lạc bộ <b>${clubName}</b> của bạn đã bị <b>TỪ CHỐI</b>.</p><p>Cảm ơn bạn đã quan tâm.</p>`;
        
        await sendMail(student.email, subject, body); 

    } catch (error) {
        console.error("Lỗi khi gửi mail:", error);
    }
};

module.exports = {
    createNotification,
    sendRequestStatusEmail
};