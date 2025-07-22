const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');
const cloudinary = require('../../config/cloudinary');
const fs = require('fs');
const { HttpStatus } = require('../../helpers/statusCode');
const getCategory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;
    const query = {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    };
    const totalCategories = await Category.countDocuments(query);
    const categories = await Category.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    res.render('categories', {
      categories,
      currentPage: page,
      totalPages: Math.ceil(totalCategories / limit),
      search
    });
  } catch (error) {
    console.error('Error in rendering Categories Page:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Server Error');
  }
};
const addCategory = async (req, res) => {
  try {
    const { name, description, isListed } = req.body;
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });
    if (existingCategory) {
      return res.status(HttpStatus.OK).json({
        warning: true,
        message: 'This category already exists in the database.'
      });
    }
    let imageUrl = '';
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'categories',
        quality: 'auto:best',
        fetch_format: 'auto',
        flags: 'preserve_transparency'
      });
      imageUrl = result.secure_url;
      fs.unlinkSync(req.file.path);
    }
    const category = new Category({
      name,
      description,
      image: imageUrl,
      isListed: isListed === 'on'
    });
    await category.save();
    res.status(HttpStatus.CREATED).json({ message: 'Category added successfully' });
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Server Error' });
  }
};
const editCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isListed } = req.body;
    const category = await Category.findById(id);
    if (!category) {
      return res.status(HttpStatus.NOT_FOUND).json({ error: 'Category not found' });
    }
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      _id: { $ne: id }
    });
    if (existingCategory) {
      return res.status(HttpStatus.OK).json({
        warning: true,
        message: 'Another category with this name already exists.'
      });
    }
    let imageUrl = category.image;
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'categories',
        quality: 'auto:best',
        fetch_format: 'auto',
        flags: 'preserve_transparency'
      });
      imageUrl = result.secure_url;
      fs.unlinkSync(req.file.path);
    }
    const newIsListed = isListed === 'on';
    const isListedStatusChanged = category.isListed !== newIsListed;
    category.name = name;
    category.description = description;
    category.image = imageUrl;
    category.isListed = newIsListed;
    await category.save();
    if (isListedStatusChanged) {
      const updateResult = await Product.updateMany(
        {
          category: id,
          isDeleted: false
        },
        {
          isListed: newIsListed
        }
      );
      console.log(`Category ${category.name} ${newIsListed ? 'listed' : 'unlisted'}. Updated ${updateResult.modifiedCount} products.`);
      res.json({
        message: `Category updated successfully. ${updateResult.modifiedCount} products were ${newIsListed ? 'listed' : 'unlisted'} automatically.`
      });
    } else {
      res.json({ message: 'Category updated successfully' });
    }
  } catch (error) {
    console.error('Error editing category:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Server Error' });
  }
};
const toggleCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) {
      return res.status(HttpStatus.NOT_FOUND).json({ error: 'Category not found' });
    }
    const oldIsListed = category.isListed;
    category.isListed = !category.isListed;
    await category.save();
    const updateResult = await Product.updateMany(
      {
        category: id,
        isDeleted: false
      },
      {
        isListed: category.isListed
      }
    );
    console.log(`Category ${category.name} ${category.isListed ? 'listed' : 'unlisted'}. Updated ${updateResult.modifiedCount} products.`);
    res.json({
      message: `Category ${category.isListed ? 'listed' : 'unlisted'} successfully. ${updateResult.modifiedCount} products were ${category.isListed ? 'listed' : 'unlisted'} automatically.`,
      productsUpdated: updateResult.modifiedCount
    });
  } catch (error) {
    console.error('Error toggling category status:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Server Error' });
  }
};
module.exports = {
  getCategory,
  addCategory,
  editCategory,
  toggleCategoryStatus
};
