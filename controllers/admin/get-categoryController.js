const Category = require("../../models/category-schema");
const mongoose = require("mongoose");

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Helper function to check if category name exists
const checkCategoryNameExists = async (name, excludeId = null) => {
  const query = {
    name: new RegExp(`^${name}$`, "i"),
    $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const existingCategory = await Category.findOne(query);
  return !!existingCategory;
};

// Helper function to format category for response
const formatCategoryResponse = (category) => {
  return {
    _id: category._id,
    name: category.name,
    description: category.description,
    isListed: category.isListed,
    date: category.createdAt.toISOString().split("T")[0],
  };
};

// Helper function to handle duplicate key errors
const handleDuplicateKeyError = (error) => {
  if (error.code === 11000 || error.message.includes("A category with this name already exists")) {
    return {
      status: 409,
      message: "A category with this name already exists."
    };
  }
  return {
    status: 500,
    message: "Internal server error"
  };
};

// Page Rendering Controller
const renderCategoryManagementPage = async (req, res) => {
  try {
    res.render("get-category", {});
  } catch (error) {
    console.error("Error rendering category page:", error);
    res.status(500).send("Error loading the page.");
  }
};

// Category CRUD API Controllers
const getAllCategoriesAPI = async (req, res) => {
  try {
    const categories = await Category.find({
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    }).sort({ createdAt: -1 });

    const formattedCategories = categories.map(formatCategoryResponse);
    
    res.status(200).json(formattedCategories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ 
      message: "Error fetching categories", 
      error: error.message 
    });
  }
};

const addCategoryAPI = async (req, res) => {
  try {
    const { name, description, status } = req.body;

    if (!name) {
      return res.status(400).json({ 
        message: "Category name is required." 
      });
    }

    // Check if category name already exists
    const nameExists = await checkCategoryNameExists(name);
    if (nameExists) {
      return res.status(409).json({ 
        message: "A category with this name already exists." 
      });
    }

    const newCategory = new Category({
      name,
      description,
      isListed: status !== undefined ? status : true,
    });

    await newCategory.save();
    
    res.status(201).json(formatCategoryResponse(newCategory));
  } catch (error) {
    console.error("Error adding category:", error);
    const errorResponse = handleDuplicateKeyError(error);
    res.status(errorResponse.status).json({ 
      message: errorResponse.message, 
      error: error.message 
    });
  }
};

const updateCategoryAPI = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ 
        message: "Invalid category ID." 
      });
    }

    if (!name) {
      return res.status(400).json({ 
        message: "Category name is required." 
      });
    }

    // Check if name already exists (excluding current category)
    const nameExists = await checkCategoryNameExists(name, id);
    if (nameExists) {
      return res.status(409).json({ 
        message: "Another category with this name already exists." 
      });
    }

    const updateData = { name, description };
    if (status !== undefined) {
      updateData.isListed = status;
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id, 
      updateData, 
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedCategory) {
      return res.status(404).json({ 
        message: "Category not found." 
      });
    }

    res.status(200).json(formatCategoryResponse(updatedCategory));
  } catch (error) {
    console.error("Error updating category:", error);
    const errorResponse = handleDuplicateKeyError(error);
    res.status(errorResponse.status).json({ 
      message: errorResponse.message, 
      error: error.message 
    });
  }
};

const toggleCategoryStatusAPI = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ 
        message: "Invalid category ID." 
      });
    }

    if (typeof status !== "boolean") {
      return res.status(400).json({ 
        message: "Invalid status value. Must be true or false." 
      });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ 
        message: "Category not found." 
      });
    }

    category.isListed = status;
    await category.save();

    res.status(200).json({
      message: `Category "${category.name}" status updated.`,
      category: {
        _id: category._id,
        isListed: category.isListed,
      },
    });
  } catch (error) {
    console.error("Error toggling category status:", error);
    res.status(500).json({
      message: "Error toggling category status",
      error: error.message,
    });
  }
};

const deleteCategoryAPI = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ 
        message: "Invalid category ID." 
      });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ 
        message: "Category not found." 
      });
    }

    if (category.isDeleted) {
      return res.status(400).json({ 
        message: "Category is already deleted." 
      });
    }

    // Soft delete the category
    category.isDeleted = true;
    category.isListed = false;
    await category.save();

    res.status(200).json({
      message: `Category "${category.name}" has been deleted successfully.`,
      category: {
        _id: category._id,
        name: category.name,
        isDeleted: category.isDeleted,
      },
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ 
      message: "Error deleting category", 
      error: error.message 
    });
  }
};

module.exports = {
  renderCategoryManagementPage,
  getAllCategoriesAPI,
  addCategoryAPI,
  updateCategoryAPI,
  toggleCategoryStatusAPI,
  deleteCategoryAPI,
};
