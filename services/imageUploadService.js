const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const path = require("path");

class ImageUploadService {
    static isCloudinaryConfigured() {
        return process.env.CLOUDINARY_CLOUD_NAME &&
               process.env.CLOUDINARY_API_KEY &&
               process.env.CLOUDINARY_API_SECRET &&
               process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name_here';
    }

    static async uploadToCloudinary(fileBuffer, uploadOptions) {
        return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(uploadOptions, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
            stream.end(fileBuffer);
        });
    }

    static async uploadToLocal(fileBuffer, fileName) {
        const localImagePath = path.join('public', 'uploads', 'headphones');
        
        if (!fs.existsSync(localImagePath)) {
            fs.mkdirSync(localImagePath, { recursive: true });
        }

        const filePath = path.join(localImagePath, fileName);
        
        return new Promise((resolve, reject) => {
            try {
                fs.writeFileSync(filePath, fileBuffer);
                resolve({
                    secure_url: `/uploads/headphones/${fileName}`,
                    public_id: fileName
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    static getFileBuffer(file) {
        if (file.buffer) {
            return file.buffer;
        } else if (file.path) {
            try {
                return fs.readFileSync(file.path);
            } catch (err) {
                throw new Error(`Failed to read file: ${err.message}`);
            }
        }
        throw new Error('No valid file buffer or path found');
    }

    static cleanupTempFile(filePath) {
        if (filePath) {
            try {
                fs.unlinkSync(filePath);
            } catch (unlinkErr) {
            }
        }
    }

    static async uploadSingleImage(file, index) {
        const fileBuffer = this.getFileBuffer(file);
        const isCloudinaryConfigured = this.isCloudinaryConfigured();

        let result;
        
        if (isCloudinaryConfigured) {
            const uploadOptions = {
                folder: "headphones",
                transformation: [
                    { width: 800, height: 600, crop: "limit" },
                    { quality: "auto", fetch_format: "auto" },
                ],
            };
            result = await this.uploadToCloudinary(fileBuffer, uploadOptions);
        } else {
            const fileName = `${Date.now()}-${index}-${file.originalname || 'image.jpg'}`;
            result = await this.uploadToLocal(fileBuffer, fileName);
        }

        this.cleanupTempFile(file.path);

        return {
            url: result.secure_url,
            isMain: index === 0,
        };
    }

    static async uploadProductImages(files) {
        const fileFields = ["images[0].file", "images[1].file", "images[2].file", "images[3].file", "images[4].file"];
        const images = [];
        const uploadPromises = [];
        const uploadErrors = [];

        for (let i = 0; i < 5; i++) {
            const fieldName = fileFields[i];
            const fileArray = files?.[fieldName];

            if (!fileArray || !fileArray[0]) {
                if (i < 3) {
                    uploadErrors.push(`Image ${i + 1} is required (minimum 3 images needed)`);
                }
                continue;
            }

            const file = fileArray[0];
            
            if (!file.buffer && !file.path) {
                continue;
            }

            const uploadPromise = this.uploadSingleImage(file, i)
                .then((imageData) => {
                    images.push(imageData);
                })
                .catch((err) => {
                    uploadErrors.push(`Failed to upload image ${i + 1}: ${err.message}`);
                });

            uploadPromises.push(uploadPromise);
        }

        await Promise.all(uploadPromises);

        const errors = {};
        if (images.length < 3) {
            errors.images = "At least 3 images are required";
        }

        if (uploadErrors.length > 0) {
            errors.imageUpload = uploadErrors.join("; ");
        }

        if (images.length > 0) {
            images[0].isMain = true;
            for (let i = 1; i < images.length; i++) {
                images[i].isMain = false;
            }
        }

        return { images, errors };
    }

    static async updateProductImages(files, existingImages) {
        const fileFields = ["images[0].file", "images[1].file", "images[2].file", "images[3].file", "images[4].file"];
        const images = [...existingImages.map(img => ({ url: img.url, isMain: img.isMain }))];

        if (!files || Object.keys(files).length === 0) {
            return images;
        }

        for (let i = 0; i < fileFields.length; i++) {
            const field = fileFields[i];
            if (files[field] && files[field][0]) {
                const file = files[field][0];
                const imageData = await this.uploadSingleImage(file, i);
                images[i] = imageData;
            }
        }

        if (images.length > 0 && !images.some(img => img.isMain)) {
            images[0].isMain = true;
        }

        return images;
    }
}

module.exports = ImageUploadService;