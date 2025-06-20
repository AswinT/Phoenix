const User = require("../../models/user.js");

// Display paginated customer list with search functionality
const customerList = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin");

        // Extract pagination and search parameters
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const searchQuery = req.query.search || "";

        // Build filter to exclude admin users
        let filter = { isAdmin: false };

        // Add search functionality for name and email
        if (searchQuery) {
            const regex = new RegExp(searchQuery, "i");
            filter.$or = [
                { fullname: regex }, 
                { email: regex }
            ];
        }

        // Get total count for pagination
        const totalUsers = await User.countDocuments(filter);
        
        // Fetch users with pagination
        const users = await User.find(filter)
            .sort({ createdAt: -1 }) // Newest users first
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(totalUsers / limit);

        res.render("admin/customerslist", {
            users,
            currentPage: page,
            totalPages,
            searchQuery,
        });
    } catch (error) {
        console.error("Error in customerList:", error);
        next(error);
    }
};

// Block or unblock customer account
const customerControll = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin");

        const { isBlocked } = req.body;
        const userId = req.params.id;

        // Update user's blocked status
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { isBlocked },
            { new: true }
        );

        if (!updatedUser) {
            return res.json({ 
                success: false, 
                message: "User not found" 
            });
        }

        return res.json({ 
            success: true, 
            isBlocked: updatedUser.isBlocked,
            message: isBlocked ? "User blocked successfully" : "User unblocked successfully"
        });
    } catch (error) {
        console.error("Error in customerControll:", error);
        next(error);
    }
};

module.exports = {
    customerList,
    customerControll,
};
