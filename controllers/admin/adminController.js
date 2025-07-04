const User = require("../../models/user.js")
const bcrypt = require("bcrypt")
const Product = require("../../models/product")

const getadminLogin = (req, res, next) => {
    try {
        // Redirect if admin is already logged in
        if (req.session.admin) return res.redirect("/admin/dashboard")
        res.render("admin/adminlogin", { error: null })
    } catch (err) {
        console.error("Error in getadminLogin:", err);
        next(err);
    }
}

const login = async (req, res, next) => {
    try {
        if (req.session.admin) return res.redirect("/admin/dashboard")

        const { email, password } = req.body

        // Basic field validation
        if (!email || !password)
            return res.render("admin/adminlogin", { error: "All Fields are Required" })

        const user = await User.findOne({ email })

        if (!user)
            return res.render("admin/adminlogin", { error: "Account not Found" })

        // Check if user has admin privileges
        if (!user.isAdmin)
            return res.render("admin/adminlogin", { error: "Unauthorized Access" })

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password)

        if (!isMatch)
            return res.render("admin/adminlogin", { error: "Invalid Credentials" })

        // Set admin session and redirect to dashboard
        req.session.admin = email
        res.redirect("/admin/dashboard")
    } catch (error) {
        console.error("Error in login:", error);
        next(error);
    }
}

const adminLogout = (req, res, next) => {
    try {
        req.session.destroy(err => {
            if (err) {
                return res.status(500).send("Account Logout Failed")
            }
            res.clearCookie('session-id')
            return res.redirect("/admin/login")
        })
    } catch (error) {
        console.error("Error in adminLogout:", error);
        next(error);
    }
}

const adminDashboard = async (req, res, next) => {
    try {
        // Check if admin is logged in
        if (!req.session.admin)
            return res.redirect("/admin/login")

        // Fetch dashboard statistics
        const productCount = await Product.countDocuments()
        const userCount = await User.countDocuments({ isAdmin: false })

        return res.render("admin/adminDashboard", {
            productCount,
            userCount
        })
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        next(error);
    }
}

module.exports = {
    getadminLogin,
    login,
    adminLogout,
    adminDashboard 
}