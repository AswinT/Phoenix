const Product = require("../../models/product")
const Category = require("../../models/category")
const mongoose = require("mongoose")

// Display paginated list of categories with search functionality
const categoryListing = async (req, res, next) => {
    try {
        // Check admin authentication
        if (!req.session.admin)
            return res.redirect("/admin/login")

        // Extract search and pagination parameters
        const searchQuery = req.query.search ? req.query.search.trim() : '';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const query = {};

        // Add search filter if provided
        if (searchQuery) {
            query.name = { $regex: searchQuery, $options: 'i' };
        }

        // Calculate pagination
        const totalCount = await Category.countDocuments(query);
        const totalPages = Math.ceil(totalCount / limit);
        const skip = (page - 1) * limit;

        query.isExisting = true // Only show existing categories

        // Redirect to page 1 if invalid page number
        if (page < 1 || (totalPages > 0 && page > totalPages)) {
            return res.redirect(`/admin/category?search=${encodeURIComponent(searchQuery)}&page=1`);
        }

        // Fetch categories with pagination
        const category = await Category.find(query)
            .sort({ addedDate: -1 })
            .skip(skip)
            .limit(limit);

        // Get product count per category for display
        const categoryStock = await Product.aggregate([{
            $group: { _id: "$category", count: { $max: 1 } }
        }])

        res.render("admin/categoryListing", {
            category, 
            searchQuery, 
            currentPage: page,
            totalPages,
            limit,
            categoryStock
        })
    } catch (error) {
        console.error('Error fetching categories:', error);
        next(error);
    }
}

// Display add category form
const addCategory = (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin");
        res.render("admin/addCategory", { error: null, category: null })
    } catch (error) {
        console.error('Error fetching categories:', error);
        next(error);
    }
}

// Create new category with validation
const newCategory = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin");
        
        const { name, description, isListed } = req.body
        const error = {}

        // Validate required fields
        if (!name)
            error['name'] = "Name cannot be Empty"
        if (!description)
            error['description'] = "Description cannot be Empty"

        if (Object.keys(error).length > 0)
            return res.render("admin/addCategory", { error, category: null })

        // Check for duplicate category names (case-insensitive)
        const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        const existcategory = await Category.findOne({
            name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' }
        });

        if (existcategory) {
            error['name'] = "Category Already Exist"
            return res.render("admin/addCategory", { error, category: null })
        }

        // Create and save new category
        const category = new Category({
            name: name,
            description: description,
            isListed: isListed
        })

        await category.save() 
        res.redirect("/admin/category")
    } catch (error) {
        console.error('Error creating category:', error);
        next(error);
    }
}

// Toggle category listing status and update related products
const categoryListUnlist = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin");
        
        const categoryId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).redirect('/admin/category?error=Invalid+category+ID');
        }

        const isListed = req.body.isListed === 'true' || req.body.isListed === true;

        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            { isListed },
            { new: true }
        );

        if (!updatedCategory) {
            return res.status(404).redirect('/admin/category?error=Category+not+found');
        }

        // Update all products in this category to match listing status
        await Product.updateMany(
            { category: updatedCategory.name },
            { isActive: isListed }
        )

        res.redirect('/admin/category?success=Category+updated');
    } catch (error) {
        console.error('Error updating category:', error);
        next(error);
    }
};

// Display edit category form
const editCategory = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin");
        
        const categoryId = req.params.id
        const category = await Category.findOne({ _id: categoryId })
        
        if (!category)
            return res.redirect("/admin/category")

        const categories = await Category.find().sort({ name: 1 });
        res.render("admin/editCategory", { category: category, categories, error: null })
    } catch (error) {
        console.error('Error fetching category:', error);
        next(error);
    }
}

// Update existing category with validation
const updateCategory = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin");
        
        const categoryId = req.params.id
        const categoryData = req.body
        let error = {}

        // Check for duplicate category names (excluding current category)
        const categoryNameExist = await Category.findOne({
            name: { $regex: new RegExp(`^${categoryData.name.trim()}$`, 'i') },
            _id: { $ne: categoryId }
        })

        categoryData._id = categoryId

        if (categoryNameExist) {
            error['name'] = "Category Name Already Exist"
            return res.render("admin/editCategory", { category: categoryData, error })
        }

        // Update category data
        const updateData = {
            name: categoryData.name,
            description: categoryData.description || '',
            isListed: categoryData.isListed === 'true'
        }

        await Category.updateOne({ _id: categoryId }, { $set: updateData })
        res.redirect("/admin/category")
    } catch (error) {
        console.error('Error updating category:', error);
        next(error);
    }
}

// Soft delete category (mark as non-existing)
const softdeleteCategory = async (req, res, next) => {
    try {
        if (!req.session.admin) return res.redirect("/admin");
        
        const categoryId = req.params.id
        const category = await Category.findById(categoryId)
        
        if (!category)
            return res.json({ success: false, message: "Category not Found" })

        // Mark category as non-existing instead of hard delete
        category.isExisting = false
        await category.save()
        
        return res.json({ success: true, message: "Category Deleted Successfully" })
    } catch (error) {
        console.error('Error deleting category:', error);
        next(error);
    }
}

module.exports = {
    categoryListing,
    addCategory,
    newCategory,
    categoryListUnlist,
    editCategory,
    updateCategory,
    softdeleteCategory,
}