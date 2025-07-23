const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const cloudinary = require('../../config/cloudinary');
const fs = require('fs');
const { HttpStatus } = require('../../helpers/statusCode');
const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const categoryFilter = req.query.category || '';
    const sortBy = req.query.sort || 'newest';
    const skip = (page - 1) * limit;
    const query = { isDeleted: false };
    if (search) {
      query.$or = [
        { model: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
      ];
    }
    if (categoryFilter) {
      query.category = categoryFilter;
    }
    let sortOption = { createdAt: -1 };
    if (sortBy === 'oldest') sortOption = { createdAt: 1 };
    else if (sortBy === 'price-low') sortOption = { salePrice: 1 };
    else if (sortBy === 'price-high') sortOption = { salePrice: -1 };
    else if (sortBy === 'stock-high') sortOption = { stock: -1 };
    const totalProducts = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category')
      .sort(sortOption)
      .skip(skip)
      .limit(limit);
    const categories = await Category.find({ isListed: true });
    res.render('getProducts', {
      products,
      categories,
      currentPage: page,
      totalPages: Math.ceil(totalProducts / limit),
      totalProducts,
      search,
      categoryFilter,
      sortBy,
      limit,
      successMessage: req.session.successMessage,
      errorMessage: req.session.errorMessage
    });
    delete req.session.successMessage;
    delete req.session.errorMessage;
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
  }
};
const addProduct = async (req, res) => {
  try {
    const {
      model,
      brand,
      description,
      category,
      regularPrice,
      salePrice,
      stock,
      connectivity,
      manufacturer,
      isListed,
    } = req.body;
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid category',
        errors: ['Invalid category selected']
      });
    }
    let mainImageUrl = '';
    if (req.files && req.files.mainImage && req.files.mainImage.length > 0) {
      const file = req.files.mainImage[0];
      if (!fs.existsSync(file.path)) {
        throw new Error(`Main image not found at ${file.path}`);
      }
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'products',
        quality: 'auto:best',
        fetch_format: 'auto',
        flags: 'preserve_transparency'
      });
      mainImageUrl = result.secure_url;
      fs.unlinkSync(file.path);
    } else {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Main image is required',
        errors: ['Main image is required']
      });
    }
    const subImages = [];
    const processedPaths = new Set();
    for (let i = 1; i <= 3; i++) {
      const fieldName = `subImage${i}`;
      if (req.files && req.files[fieldName] && req.files[fieldName].length > 0) {
        const file = req.files[fieldName][0];
        if (processedPaths.has(file.path)) {
          continue;
        }
        if (!fs.existsSync(file.path)) {
          continue;
        }
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'products/sub',
          quality: 'auto:best',
          fetch_format: 'auto',
          flags: 'preserve_transparency'
        });
        subImages.push(result.secure_url);
        processedPaths.add(file.path);
        fs.unlinkSync(file.path);
      }
    }
    const product = new Product({
      model: model.trim(),
      brand: brand.trim(),
      description,
      category,
      regularPrice: parseFloat(regularPrice),
      salePrice: parseFloat(salePrice),
      stock: parseInt(stock),
      connectivity,
      manufacturer,
      mainImage: mainImageUrl,
      subImages,
      isListed: isListed === 'on',
      isDeleted: false,
    });
    await product.save();
    res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Product added successfully!'
    });
  } catch (error) {
    console.error('Error adding product:', error);
    if (error.message.includes('ENOENT')) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'File upload failed: File not found on server',
        errors: ['File upload failed: File not found on server']
      });
    } else if (error.name === 'TimeoutError') {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Upload timed out. Please try again with a smaller file or check your network.',
        errors: ['Upload timed out. Please try again with a smaller file or check your network.']
      });
    } else {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Server Error',
        errors: ['An unexpected error occurred while adding the product']
      });
    }
  }
};
const toggleProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(HttpStatus.NOT_FOUND).json({ error: 'Product not found' });
    }
    product.isListed = !product.isListed;
    await product.save();
    res.json({
      message: `Product ${product.isListed ? 'listed' : 'unlisted'} successfully`,
    });
  } catch (error) {
    console.error('Error toggling product status:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Server Error' });
  }
};
const getEditProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId).populate('category');
    const categories = await Category.find({ isListed: true });
    if (!product || product.isDeleted) {
      return res.status(HttpStatus.NOT_FOUND).json({ error: 'Product not found' });
    }
    res.render('editProduct', { product, categories });
  } catch (error) {
    console.error('Error fetching product for edit:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Server Error' });
  }
};
const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const {
      model,
      brand,
      description,
      category,
      regularPrice,
      salePrice,
      stock,
      connectivity,
      manufacturer,
      isListed,
    } = req.body;
    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      return res.status(HttpStatus.NOT_FOUND).json({ error: 'Product not found' });
    }
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Invalid category' });
    }
    let mainImageUrl = product.mainImage;
    if (req.files && req.files.mainImage && req.files.mainImage.length > 0) {
      const file = req.files.mainImage[0];

      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'products',
        quality: 'auto:best',
        fetch_format: 'auto',
        flags: 'preserve_transparency'
      });
      mainImageUrl = result.secure_url;
      fs.unlinkSync(file.path);
      if (product.mainImage) {
        const publicId = product.mainImage.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`products/${publicId}`);
      }
    }
    const subImages = product.subImages ? [...product.subImages] : [];
    for (let i = 1; i <= 3; i++) {
      const fieldName = `subImage${i}`;
      if (req.files && req.files[fieldName] && req.files[fieldName].length > 0) {
        const file = req.files[fieldName][0];
        if (!fs.existsSync(file.path)) {
          continue;
        }
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'products/sub',
          quality: 'auto:best',
          fetch_format: 'auto',
          flags: 'preserve_transparency'
        });
        const index = i - 1;
        if (index < subImages.length && subImages[index]) {
          const publicId = subImages[index].split('/').pop().split('.')[0];
          try {
            await cloudinary.uploader.destroy(`products/sub/${publicId}`);
          } catch {
            // Failed to delete old image, continue
          }
        }
        if (index < subImages.length) {
          subImages[index] = result.secure_url;
        } else {
          subImages.push(result.secure_url);
        }
        fs.unlinkSync(file.path);
      }
    }
    product.model = model;
    product.brand = brand;
    product.description = description;
    product.category = category;
    product.regularPrice = parseFloat(regularPrice);
    product.salePrice = parseFloat(salePrice);
    product.stock = parseInt(stock);
    product.connectivity = connectivity;
    product.manufacturer = manufacturer;
    product.mainImage = mainImageUrl;
    product.subImages = subImages;
    product.isListed = isListed === 'on';
    await product.save();
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Error updating product:', error);
    if (error.message.includes('ENOENT')) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'File upload failed: File not found on server' });
    } else {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Server Error' });
    }
  }
};
const softDeleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(HttpStatus.NOT_FOUND).json({ error: 'Product not found' });
    }
    product.isDeleted = true;
    await product.save();
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Product soft deleted successfully'
    });
  } catch {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Server Error' });
  }
};
module.exports = { getProducts, addProduct, toggleProductStatus, getEditProduct, updateProduct, softDeleteProduct };