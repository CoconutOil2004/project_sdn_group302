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
        const {
            page: pageParam,
            limit: limitParam,
            sortBy: sortByParam,
            sortOrder: sortOrderParam,
            clubId,
            title,
            dateFrom,
            dateTo
        } = req.query;

        const filter = {};

        if (clubId) {
            const clubIds = Array.isArray(clubId)
                ? clubId
                : clubId.split(",").map(id => id.trim()).filter(Boolean);
            const validClubIds = clubIds.filter(id => mongoose.Types.ObjectId.isValid(id));
            if (validClubIds.length > 0) {
                filter.clubId = validClubIds.length === 1 ? validClubIds[0] : { $in: validClubIds };
            }
        }

        if (title) {
            filter.title = { $regex: title, $options: "i" };
        }

        if (dateFrom || dateTo) {
            const dateFilter = {};

            if (dateFrom) {
                const from = new Date(dateFrom);
                if (!Number.isNaN(from.getTime())) {
                    dateFilter.$gte = from;
                }
            }

            if (dateTo) {
                const to = new Date(dateTo);
                if (!Number.isNaN(to.getTime())) {
                    dateFilter.$lte = to;
                }
            }

            if (Object.keys(dateFilter).length > 0) {
                filter.date = dateFilter;
            }
        }

        const allowedSortFields = ["createdAt", "date", "title", "location"];
        const sortField = allowedSortFields.includes(sortByParam) ? sortByParam : "createdAt";
        const sortDirection = sortOrderParam === "asc" ? 1 : -1;
        const sort = { [sortField]: sortDirection };

        const page = Number.parseInt(pageParam, 10);
        const limit = Number.parseInt(limitParam, 10);
        const shouldPaginate = Number.isInteger(page) && page > 0 && Number.isInteger(limit) && limit > 0;

        const eventQuery = Event.find(filter).sort(sort);

        if (shouldPaginate) {
            eventQuery.skip((page - 1) * limit).limit(limit);
        }

        const eventsPromise = eventQuery.lean();
        const countPromise = shouldPaginate ? Event.countDocuments(filter) : Promise.resolve(null);

        const [events, totalItems] = await Promise.all([
            eventsPromise,
            countPromise
        ]);

        const formattedEvents = events.map(event => ({
            ...event,
            date: formatDate(event.date),
            createdAt: formatDate(event.createdAt),
            participants: event.participants.map(p => ({
                ...p,
                joinedAt: formatDate(p.joinedAt),
            })),
        }));

        if (shouldPaginate && typeof totalItems === "number") {
            const totalPages = Math.max(Math.ceil(totalItems / limit), 1);
            res.set("X-Total-Count", totalItems.toString());
            res.set("X-Total-Pages", totalPages.toString());
            res.set("X-Page", page.toString());
            res.set("X-Limit", limit.toString());
        }

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
