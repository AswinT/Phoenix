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

    const existingProduct = await Product.findOne({
      model: { $regex: new RegExp(`^${model.trim()}$`, 'i') },
      isDeleted: false
    });
    if (existingProduct) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Validation failed',
        errors: { model: 'A product with this model name already exists' }
      });
    }

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid category',
        errors: { category: 'Invalid category selected' }
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
        errors: { mainImage: 'Main image is required' }
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
    if (error.message.includes('ENOENT')) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'File upload failed: File not found on server',
        errors: { general: 'File upload failed: File not found on server' }
      });
    } else if (error.name === 'TimeoutError') {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Upload timed out. Please try again with a smaller file or check your network.',
        errors: { general: 'Upload timed out. Please try again with a smaller file or check your network.' }
      });
    } else {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Server Error',
        errors: { general: 'An unexpected error occurred while adding the product' }
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
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Server Error' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'No form data received',
        errors: { general: 'Form data is missing or not properly parsed by multer' }
      });
    }

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

    if (!model || !brand || !description || !category || !regularPrice || !salePrice || !stock || !connectivity || !manufacturer) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Missing required fields',
        errors: { general: 'All fields are required' }
      });
    }

    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'Product not found',
        errors: { general: 'Product not found' }
      });
    }

    const existingProduct = await Product.findOne({
      model: { $regex: new RegExp(`^${model.trim()}$`, 'i') },
      isDeleted: false,
      _id: { $ne: productId }
    });
    if (existingProduct) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Validation failed',
        errors: { model: 'A product with this model name already exists' }
      });
    }

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid category',
        errors: { category: 'Invalid category selected' }
      });
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

    product.model = model.trim();
    product.brand = brand.trim();
    product.description = description;
    product.category = category;
    product.regularPrice = parseFloat(regularPrice);
    product.salePrice = parseFloat(salePrice);
    product.stock = parseInt(stock);
    product.connectivity = connectivity;
    product.manufacturer = manufacturer.trim();
    product.mainImage = mainImageUrl;
    product.subImages = subImages;
    product.isListed = isListed === 'on';

    await product.save();

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Product updated successfully!'
    });
  } catch (error) {
    if (error.message.includes('ENOENT')) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'File upload failed: File not found on server',
        errors: { general: 'File upload failed: File not found on server' }
      });
    } else if (error.name === 'TimeoutError') {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Upload timed out. Please try again with a smaller file or check your network.',
        errors: { general: 'Upload timed out. Please try again with a smaller file or check your network.' }
      });
    } else {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Server Error',
        errors: { general: 'An unexpected error occurred while updating the product: ' + error.message }
      });
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