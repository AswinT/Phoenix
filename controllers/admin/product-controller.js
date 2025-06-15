const Product = require("../../models/product-schema");
const Category = require("../../models/category-schema");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const { uploadDir } = require("../../config/multer-config");

// Helper function to save base64 image
const saveBase64Image = async (base64Data, filename) => {
  try {
    const base64Image = base64Data.replace(/^data:image\/[a-z]+;base64,/, "");
    const imageBuffer = Buffer.from(base64Image, "base64");
    const outputPath = path.join(uploadDir, filename);

    await sharp(imageBuffer)
      .resize(800, 800, {
        fit: "cover",
        position: "center",
      })
      .jpeg({ quality: 90 })
      .toFile(outputPath);

    return filename;
  } catch (error) {
    console.error("Error saving base64 image:", error);
    throw new Error("Failed to process image");
  }
};

// Helper function to delete image file
const deleteImageFile = (filename) => {
  try {
    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error("Error deleting image file:", error);
  }
};

// Helper function to build search query
const buildSearchQuery = (search, selectedCategory) => {
  const searchQuery = { isDeleted: false };

  if (search) {
    searchQuery.$or = [
      { productName: { $regex: search, $options: "i" } },
      { brand: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  if (selectedCategory) {
    searchQuery.category = selectedCategory;
  }

  return searchQuery;
};

// Helper function to calculate pagination data
const calculatePagination = (page, totalProducts, limit) => {
  const totalPages = Math.ceil(totalProducts / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  const nextPage = hasNextPage ? page + 1 : null;
  const prevPage = hasPrevPage ? page - 1 : null;
  const skip = (page - 1) * limit;

  // Calculate page range for pagination display
  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(totalPages, page + 2);
  const pageNumbers = [];
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  // Calculate result range
  const startResult = totalProducts > 0 ? skip + 1 : 0;
  const endResult = Math.min(skip + limit, totalProducts);

  return {
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    pageNumbers,
    startResult,
    endResult,
    skip,
  };
};

// Helper function to process product images
const processProductImages = async (imageData, mainImageIndex) => {
  if (imageData.length < 3) {
    throw new Error("Minimum 3 images are required");
  }

  const processedImages = [];
  for (let i = 0; i < imageData.length; i++) {
    const timestamp = Date.now();
    const filename = `product-${timestamp}-${i + 1}.jpg`;

    try {
      await saveBase64Image(imageData[i], filename);
      processedImages.push(filename);
    } catch (error) {
      // Clean up any already saved images
      processedImages.forEach(deleteImageFile);
      throw new Error(`Failed to process image ${i + 1}`);
    }
  }

  // Determine main image based on mainImageIndex
  const selectedMainIndex = parseInt(mainImageIndex) || 0;
  const validMainIndex = selectedMainIndex < processedImages.length ? selectedMainIndex : 0;

  // Arrange images with main image first
  const mainImageFile = processedImages[validMainIndex];
  const subImageFiles = processedImages.filter((_, index) => index !== validMainIndex);

  return { mainImageFile, subImageFiles };
};

// Helper function to validate product data
const validateProductData = (data) => {
  const { productName, description, brand, category, regularPrice, salePrice, features } = data;

  if (!productName || !description || !brand || !category || !regularPrice || !salePrice || !features) {
    throw new Error("All required fields must be filled");
  }

  // Validate description word count
  if (description) {
    const wordCount = description.trim().split(/\s+/).filter(word => word.length > 0).length;
    if (wordCount < 10) {
      throw new Error(`Description must contain at least 10 words (currently ${wordCount} words)`);
    }
    if (description.length > 1000) {
      throw new Error("Description must not exceed 1000 characters");
    }
  }

  // Validate other fields
  if (productName && productName.length < 3) {
    throw new Error("Product name must be at least 3 characters");
  }
  if (brand && brand.length < 2) {
    throw new Error("Brand name must be at least 2 characters");
  }
  if (features && features.length < 10) {
    throw new Error("Features must be at least 10 characters");
  }
};

// Page Rendering Controllers
const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const selectedCategory = req.query.category || "";

    const searchQuery = buildSearchQuery(search, selectedCategory);

    // Fetch products and categories in parallel
    const [products, totalProducts, categories] = await Promise.all([
      Product.find(searchQuery)
        .populate("category", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Product.countDocuments(searchQuery),
      Category.find({ isListed: true }).sort({ name: 1 }),
    ]);

    const pagination = calculatePagination(page, totalProducts, limit);

    // Build query string for pagination links
    const queryParams = new URLSearchParams();
    if (search) queryParams.set("search", search);
    if (selectedCategory) queryParams.set("category", selectedCategory);
    if (req.query.limit && req.query.limit !== "10") queryParams.set("limit", req.query.limit);
    const baseQuery = queryParams.toString();

    res.render("product", {
      products,
      categories,
      currentPage: page,
      totalPages: pagination.totalPages,
      totalProducts,
      hasNextPage: pagination.hasNextPage,
      hasPrevPage: pagination.hasPrevPage,
      nextPage: pagination.nextPage,
      prevPage: pagination.prevPage,
      pageNumbers: pagination.pageNumbers,
      startResult: pagination.startResult,
      endResult: pagination.endResult,
      limit,
      baseQuery,
      search,
      selectedCategory,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).render("product", {
      products: [],
      categories: [],
      error: "Failed to load products",
      currentPage: 1,
      totalPages: 1,
      totalProducts: 0,
      hasNextPage: false,
      hasPrevPage: false,
      nextPage: null,
      prevPage: null,
      pageNumbers: [1],
      startResult: 0,
      endResult: 0,
      limit: 10,
      baseQuery: "",
      search: "",
      selectedCategory: "",
    });
  }
};

const getAddProduct = async (req, res) => {
  try {
    const categories = await Category.find({ isListed: true });
    res.render("new-product", { categories, product: null });
  } catch (error) {
    console.error("Error loading add product page:", error);
    res.status(500).send("Server Error");
  }
};

const getEditProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId).populate("category");
    const categories = await Category.find({ isListed: true });

    if (!product || product.isDeleted) {
      return res.status(404).send("Product not found");
    }

    res.render("edit-product", { product, categories });
  } catch (error) {
    console.error("Error loading edit product page:", error);
    res.status(500).send("Server Error");
  }
};

// Product CRUD API Controllers
const addProduct = async (req, res) => {
  try {
    const {
      productName,
      description,
      brand,
      category,
      regularPrice,
      salePrice,
      productOffer,
      quantity,
      features,
      croppedImages,
      mainImageIndex,
    } = req.body;

    // Validate product data
    validateProductData(req.body);

    // Parse and validate images
    let imageData = [];
    try {
      imageData = JSON.parse(croppedImages || "[]");
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid image data format",
      });
    }

    // Process images
    const { mainImageFile, subImageFiles } = await processProductImages(imageData, mainImageIndex);

    // Create product
    const newProduct = new Product({
      productName,
      description,
      brand,
      category,
      regularPrice: parseFloat(regularPrice),
      salePrice: parseFloat(salePrice),
      productOffer: parseFloat(productOffer) || 0,
      quantity: parseInt(quantity) || 1,
      features,
      mainImage: mainImageFile,
      subImages: subImageFiles,
      isDeleted: false,
      isBlocked: false,
      isListed: true,
    });

    const savedProduct = await newProduct.save();

    res.status(201).json({
      success: true,
      message: "Product added successfully",
      product: savedProduct,
    });
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add product: " + error.message,
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category");
    if (!product || product.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }
    res.json({ success: true, product });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch product",
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const {
      productName,
      description,
      brand,
      category,
      regularPrice,
      salePrice,
      productOffer,
      quantity,
      features,
      croppedImages,
      removedImages,
      mainImage,
    } = req.body;

    // Find existing product
    const existingProduct = await Product.findById(productId);
    if (!existingProduct || existingProduct.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Prepare update data
    const updateData = {
      productName,
      description,
      brand,
      category,
      regularPrice: parseFloat(regularPrice),
      salePrice: parseFloat(salePrice),
      productOffer: parseFloat(productOffer) || 0,
      quantity: parseInt(quantity) || 1,
      features,
    };

    // Handle image updates
    let currentImages = [existingProduct.mainImage, ...existingProduct.subImages];

    // Remove deleted images
    if (removedImages) {
      const toRemove = JSON.parse(removedImages);
      toRemove.forEach((filename) => {
        deleteImageFile(filename);
        currentImages = currentImages.filter((img) => img !== filename);
      });
    }

    // Add new cropped images
    let newImageFilenames = [];
    if (croppedImages) {
      const newImageData = JSON.parse(croppedImages);
      for (let i = 0; i < newImageData.length; i++) {
        const timestamp = Date.now();
        const filename = `product-${timestamp}-${i + 1}.jpg`;

        try {
          await saveBase64Image(newImageData[i], filename);
          newImageFilenames.push(filename);
          currentImages.push(filename);
        } catch (error) {
          console.error(`Failed to process new image ${i + 1}:`, error);
        }
      }
    }

    // Ensure minimum 3 images
    if (currentImages.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Product must have at least 3 images",
      });
    }

    // Handle main image selection
    let selectedMainImage;
    if (mainImage) {
      if (!isNaN(mainImage)) {
        const newImageIndex = parseInt(mainImage);
        if (newImageIndex >= 0 && newImageIndex < newImageFilenames.length) {
          selectedMainImage = newImageFilenames[newImageIndex];
        }
      } else {
        if (currentImages.includes(mainImage)) {
          selectedMainImage = mainImage;
        }
      }
    }

    // If no valid main image selected, use the first image
    if (!selectedMainImage) {
      selectedMainImage = currentImages[0];
    }

    // Arrange images with selected main image first
    const subImages = currentImages.filter((img) => img !== selectedMainImage);

    // Update image fields
    updateData.mainImage = selectedMainImage;
    updateData.subImages = subImages;

    const updatedProduct = await Product.findByIdAndUpdate(productId, updateData, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update product: " + error.message,
    });
  }
};

// Product Management Controllers
const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findByIdAndUpdate(
      productId,
      {
        isDeleted: true,
        isListed: false,
      },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete product",
    });
  }
};

const toggleProductStatus = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);

    if (!product || product.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.isBlocked = !product.isBlocked;
    product.isListed = !product.isBlocked;
    await product.save();

    res.json({
      success: true,
      message: `Product ${product.isBlocked ? "blocked" : "unblocked"} successfully`,
      isBlocked: product.isBlocked,
    });
  } catch (error) {
    console.error("Error toggling product status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update product status",
    });
  }
};

// User-facing API Controller
const getProductsForUser = async (req, res) => {
  try {
    const products = await Product.find({
      isDeleted: false,
      isBlocked: false,
      isListed: true,
    })
      .populate({
        path: "category",
        match: { isListed: true },
        select: "name",
      })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();

    // Filter out products with unlisted categories
    const filteredProducts = products.filter((product) => product.category !== null);

    res.json({ success: true, products: filteredProducts });
  } catch (error) {
    console.error("Error fetching products for user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
  }
};

module.exports = {
  getProducts,
  getAddProduct,
  getEditProduct,
  addProduct,
  getProductById,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
  getProductsForUser,
};
