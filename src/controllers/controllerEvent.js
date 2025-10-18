const mongoose = require("mongoose");
const Event = require("../models/events");


function formatDate(date) {
    if (!date) return null;
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

// 1. Lấy tất cả sự kiện
// const getAllEvents = async (req, res) => {
//     try {
//         const events = await Event.find();
//         res.status(200).json(events);
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };
const getAllEvents = async (req, res) => {
    try {
        const events = await Event.find().lean();

        const formattedEvents = events.map(event => ({
            ...event,
            date: formatDate(event.date),
            createdAt: formatDate(event.createdAt),
            participants: event.participants.map(p => ({
                ...p,
                joinedAt: formatDate(p.joinedAt),
            })),
        }));

        res.status(200).json(formattedEvents);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// 2. Lấy sự kiện theo clubId
const getEventById = async (req, res) => {
    try {
        const eventId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({ message: "Invalid ID format" });
        }

        const event = await Event.findById(eventId).lean();

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        // Format các trường ngày tháng
        event.date = formatDate(event.date);
        event.createdAt = formatDate(event.createdAt);

        if (event.participants && event.participants.length > 0) {
            event.participants = event.participants.map(p => ({
                ...p,
                joinedAt: formatDate(p.joinedAt),
            }));
        }

        res.status(200).json(event);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// 3. Tạo mới sự kiện
const createEvent = async (req, res) => {
    try {
        const { clubId, title, date, location } = req.body;

        if (!clubId || !title || !date) {
            return res.status(400).json({ message: "clubId, title and date are required" });
        }

        // Kiểm tra event đã tồn tại chưa
        const existingEvent = await Event.findOne({ clubId, title });

        if (existingEvent) {
            return res.status(400).json({ message: "Event with this title already exists in this club." });
        }
        const newEvent = new Event(req.body);
        await newEvent.save();

        res.status(201).json(newEvent);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};


// 4. Thêm participant
const addParticipant = async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid eventId or userId format" });
    }

    try {
        const event = await Event.findByIdAndUpdate(
            id,
            {
                $push: {
                    participants: {
                        userId,
                        joinedAt: new Date()
                    }
                }
            },
            { new: true }
        );

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        res.status(200).json(event);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// 5. Xóa sự kiện
const deleteEvent = async (req, res) => {
    const { id } = req.params;
    console.log("Delete event ID:", id);  // debug

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid id format" });
    }

    try {
        const deletedEvent = await Event.findByIdAndDelete(id);

        if (!deletedEvent) {
            return res.status(404).json({ message: "Event not found" });
        }

        res.status(200).json({ message: "Event deleted successfully.", event: deletedEvent });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};



module.exports = {
    getAllEvents,
    getEventById,
    createEvent,
    addParticipant,
    deleteEvent
};
