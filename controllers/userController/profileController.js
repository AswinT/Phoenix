const User = require('../../models/userSchema');
const OTP = require('../../models/otpSchema');
const { sendOtpEmail } = require('../../helpers/sendMail');
const upload = require('../../config/multer');
const cloudinary = require('../../config/cloudinary');
const path = require('path');
const fs = require('fs');
const {
  validateBasicOtp,
  validateOtpSession,
} = require('../../validators/user/basicOtpValidator');
const { createOtpMessage } = require('../../helpers/emailMask');
const { HttpStatus } = require('../../helpers/statusCode');
const getProfile = async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Please Login',
      });
    }
    const user = await User.findOne({ _id: req.session.user_id }).lean();
    if (!user) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ success: false, message: 'User Not Found' });
    }
    res.render('profile', { user });
  } catch (error) {
    console.error('Error in rendering profile page:', error);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: 'Something went wrong' });
  }
};
const updateProfile = async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Please login to update profile',
      });
    }
    const { fullName, phone } = req.body;
    // Use the enhanced full name validation from validator
    const { validateProfileFullName } = require('../../validators/user/profileValidator');
    const nameValidation = validateProfileFullName(fullName);

    if (!nameValidation.isValid) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: nameValidation.message,
        field: 'fullName'
      });
    }

    // Prepare update data with sanitized values
    const updateData = {
      fullName: nameValidation.sanitized,
    };

    // Handle phone number update (now mandatory)
    if (!phone || !phone.trim()) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Phone number is required',
        field: 'phone'
      });
    }

    // Use the enhanced phone validation from validator
    const { validateProfilePhone } = require('../../validators/user/profileValidator');
    const phoneValidation = validateProfilePhone(phone);

    if (!phoneValidation.isValid) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: phoneValidation.message,
        field: 'phone'
      });
    }

    // Check if phone number is already in use by another user
    const existingPhone = await User.findOne({
      phone: phoneValidation.sanitized,
      _id: { $ne: req.session.user_id },
    });

    if (existingPhone) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'This phone number is already registered with another account',
        field: 'phone'
      });
    }

    updateData.phone = phoneValidation.sanitized;

    const updatedUser = await User.findByIdAndUpdate(
      req.session.user_id,
      updateData,
      { new: true, runValidators: true }
    ).lean();
    if (!updatedUser) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
    }
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        fullName: updatedUser.fullName,
        phone: updatedUser.phone,
        email: updatedUser.email,
      },
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    if (error.code === 11000) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Phone number already in use',
      });
    }
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to update profile',
    });
  }
};
const uploadProfileImage = async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Please login to upload image',
      });
    }
    upload.single('profileImage')(req, res, async (err) => {
      if (err) {
        console.error('Multer upload error:', err);
        let errorMessage = 'Failed to upload image';

        // Provide specific error messages based on error type
        if (err.code === 'LIMIT_FILE_SIZE') {
          errorMessage = 'File size too large. Please choose an image smaller than 5MB.';
        } else if (err.message && err.message.includes('Images only')) {
          errorMessage = 'Invalid file type. Please upload a JPEG, JPG, or PNG image.';
        } else if (err.message) {
          errorMessage = err.message;
        }

        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: errorMessage,
          errorType: 'UPLOAD_ERROR'
        });
      }

      if (!req.file) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'No image file provided. Please select an image to upload.',
          errorType: 'NO_FILE'
        });
      }

      const tempFilePath = path.join(
        __dirname,
        '../../uploads',
        req.file.filename
      );

      // Verify file exists before attempting upload
      if (!fs.existsSync(tempFilePath)) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Uploaded file not found. Please try again.',
          errorType: 'FILE_NOT_FOUND'
        });
      }

      let cloudinaryResult;
      try {
        // Enhanced Cloudinary upload with better error handling
        cloudinaryResult = await cloudinary.uploader.upload(tempFilePath, {
          folder: 'profile_images',
          transformation: [
            { width: 300, height: 300, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
          resource_type: 'image',
          timeout: 60000, // 60 second timeout
        });

        // Verify upload was successful
        if (!cloudinaryResult || !cloudinaryResult.secure_url) {
          throw new Error('Cloudinary upload completed but no URL returned');
        }

      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);

        // Clean up temp file
        if (fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath);
          } catch (cleanupError) {
            console.error('Error cleaning up temp file:', cleanupError);
          }
        }

        // Provide specific error messages based on Cloudinary error
        let errorMessage = 'Failed to upload image to cloud storage';
        let errorType = 'CLOUDINARY_ERROR';

        if (uploadError.message) {
          if (uploadError.message.includes('timeout')) {
            errorMessage = 'Upload timeout. Please check your internet connection and try again.';
            errorType = 'TIMEOUT_ERROR';
          } else if (uploadError.message.includes('Invalid image')) {
            errorMessage = 'Invalid image format. Please upload a valid JPEG, JPG, or PNG image.';
            errorType = 'INVALID_FORMAT';
          } else if (uploadError.message.includes('File size')) {
            errorMessage = 'Image file is too large. Please compress your image and try again.';
            errorType = 'SIZE_ERROR';
          } else if (uploadError.http_code === 401) {
            errorMessage = 'Image upload service configuration error. Please contact support.';
            errorType = 'CONFIG_ERROR';
          }
        }

        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: errorMessage,
          errorType: errorType,
          details: process.env.NODE_ENV === 'development' ? uploadError.message : undefined
        });
      }
      // Clean up temp file after successful upload
      if (fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          console.error('Error cleaning up temp file after upload:', cleanupError);
        }
      }

      // Get user and handle previous image deletion
      const user = await User.findById(req.session.user_id);
      if (!user) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: 'User not found',
          errorType: 'USER_NOT_FOUND'
        });
      }

      // Delete previous profile image from Cloudinary if exists
      if (user.profileImage) {
        try {
          // Extract public ID from Cloudinary URL
          const urlParts = user.profileImage.split('/');
          const publicIdWithExtension = urlParts[urlParts.length - 1];
          const publicId = publicIdWithExtension.split('.')[0];

          if (publicId && publicId !== 'default') {
            await cloudinary.uploader.destroy(`profile_images/${publicId}`);
          }
        } catch (deleteError) {
          console.error('Error deleting previous Cloudinary image:', deleteError);
          // Don't fail the upload if we can't delete the old image
        }
      }

      const imageUrl = cloudinaryResult.secure_url;

      // Update user with new profile image
      try {
        const updatedUser = await User.findByIdAndUpdate(
          req.session.user_id,
          { profileImage: imageUrl },
          { new: true }
        ).lean();

        if (!updatedUser) {
          return res.status(HttpStatus.NOT_FOUND).json({
            success: false,
            message: 'User not found during update',
            errorType: 'UPDATE_FAILED'
          });
        }

        res.status(HttpStatus.OK).json({
          success: true,
          message: 'Profile image uploaded successfully',
          profileImage: imageUrl,
        });

      } catch (updateError) {
        console.error('Error updating user profile image:', updateError);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Failed to save profile image. Please try again.',
          errorType: 'DATABASE_ERROR'
        });
      }
    });
  } catch (error) {
    console.error('Error uploading profile image:', error);

    // Clean up temp file if it exists
    const tempFilePath = req.file
      ? path.join(__dirname, '../../uploads', req.file.filename)
      : null;
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file in catch block:', cleanupError);
      }
    }

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'An unexpected error occurred while uploading your profile image. Please try again.',
      errorType: 'UNEXPECTED_ERROR'
    });
  }
};
const requestEmailUpdate = async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Please login to update email',
      });
    }
    const { email } = req.body;
    if (
      !email ||
      !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)
    ) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }
    const disposableDomains = [
      'mailinator.com',
      'tempmail.com',
      'temp-mail.org',
      'guerrillamail.com',
      'yopmail.com',
      'sharklasers.com',
    ];
    const domain = email.split('@')[1];
    if (disposableDomains.includes(domain)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Please use a non-disposable email address',
      });
    }
    const user = await User.findById(req.session.user_id);
    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
    }
    if (email.toLowerCase() === user.email.toLowerCase()) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'New email must be different from current email',
      });
    }
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Email address already in use',
      });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("Generated OTP:", otp);
    await OTP.deleteMany({
      email: email.toLowerCase(),
      purpose: 'email-update',
    });
    await OTP.create({
      email: email.toLowerCase(),
      otp,
      purpose: 'email-update',
    });
    try {
      await sendOtpEmail(
        email,
        user.fullName,
        otp,
        'Email Update Verification',
        'email-update'
      );
    } catch (emailError) {
      console.error('Email delivery failed:', emailError);
      await OTP.deleteMany({
        email: email.toLowerCase(),
        purpose: 'email-update',
      });
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message:
          'Email failed to send. Please check your email service configuration or try again later.',
      });
    }
    req.session.newEmail = email.toLowerCase();
    const otpMessage = createOtpMessage(email, 'email-update');
    res.status(HttpStatus.OK).json({
      success: true,
      message: otpMessage.message,
    });
  } catch (error) {
    console.error('Error requesting email update:', error);
    await OTP.deleteMany({
      email: req.body.email?.toLowerCase(),
      purpose: 'email-update',
    });
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to process email update request. Please try again.',
    });
  }
};
const verifyEmailOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const otpValidation = validateBasicOtp(otp);
    if (!otpValidation.isValid) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: otpValidation.message,
      });
    }
    const sessionValidation = validateOtpSession(req, 'email-update');
    if (!sessionValidation.isValid) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: sessionValidation.message,
        sessionExpired: sessionValidation.sessionExpired,
      });
    }
    const otpRecord = await OTP.findOne({
      email: req.session.newEmail,
      otp,
      purpose: 'email-update',
    });
    if (!otpRecord) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }
    const updatedUser = await User.findByIdAndUpdate(
      req.session.user_id,
      { email: req.session.newEmail, isVerified: true },
      { new: true, runValidators: true }
    );
    if (!updatedUser) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
    }
    await OTP.deleteMany({
      email: req.session.newEmail,
      purpose: 'email-update',
    });
    delete req.session.newEmail;
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Email updated successfully',
      email: updatedUser.email,
    });
  } catch (error) {
    console.error('Error verifying email OTP:', error);
    if (error.code === 11000) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Email address already in use',
      });
    }
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to verify OTP',
    });
  }
};
const resendEmailOtp = async (req, res) => {
  try {
    if (!req.session.user_id || !req.session.newEmail) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Unauthorized or invalid session',
      });
    }
    const user = await User.findById(req.session.user_id);
    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("Generated OTP:", otp);
    await OTP.deleteMany({
      email: req.session.newEmail,
      purpose: 'email-update',
    });
    await OTP.create({
      email: req.session.newEmail,
      otp,
      purpose: 'email-update',
    });
    try {
      await sendOtpEmail(
        req.session.newEmail,
        user.fullName,
        otp,
        'Email Update Verification',
        'email-update'
      );
    } catch (emailError) {
      console.error('Email delivery failed for resend:', emailError);
      await OTP.deleteMany({
        email: req.session.newEmail,
        purpose: 'email-update',
      });
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message:
          'Email failed to send. Please check your email service configuration or try again later.',
      });
    }
    const otpMessage = createOtpMessage(req.session.newEmail, 'resend');
    res.status(HttpStatus.OK).json({
      success: true,
      message: otpMessage.message,
    });
  } catch (error) {
    console.error('Error resending email OTP:', error);
    await OTP.deleteMany({
      email: req.session.newEmail,
      purpose: 'email-update',
    });
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to resend OTP. Please try again.',
    });
  }
};

const removeProfileImage = async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Please login to remove image',
        errorType: 'UNAUTHORIZED'
      });
    }

    // Get user to check if they have a profile image
    const user = await User.findById(req.session.user_id);
    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'User not found',
        errorType: 'USER_NOT_FOUND'
      });
    }

    // If user has a profile image, delete it from Cloudinary
    if (user.profileImage) {
      try {
        // Extract public ID from Cloudinary URL
        const urlParts = user.profileImage.split('/');
        const publicIdWithExtension = urlParts[urlParts.length - 1];
        const publicId = publicIdWithExtension.split('.')[0];

        if (publicId && publicId !== 'default') {
          await cloudinary.uploader.destroy(`profile_images/${publicId}`);
        }
      } catch (deleteError) {
        console.error('Error deleting Cloudinary image:', deleteError);
        // Continue with database update even if Cloudinary deletion fails
      }
    }

    // Remove profile image from user record
    const updatedUser = await User.findByIdAndUpdate(
      req.session.user_id,
      { $unset: { profileImage: 1 } },
      { new: true }
    ).lean();

    if (!updatedUser) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to remove profile image',
        errorType: 'UPDATE_FAILED'
      });
    }

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Profile image removed successfully',
    });

  } catch (error) {
    console.error('Error removing profile image:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'An unexpected error occurred while removing your profile image. Please try again.',
      errorType: 'UNEXPECTED_ERROR'
    });
  }
};

// Send OTP for email change
const sendEmailOtp = async (req, res) => {
  try {
    const { newEmail } = req.body;
    const userId = req.session.user_id;

    if (!newEmail || !newEmail.trim()) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'New email address is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    // Check if email is already in use
    const existingUser = await User.findOne({
      email: newEmail.toLowerCase(),
      _id: { $ne: userId }
    });

    if (existingUser) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'This email address is already registered with another account'
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in session
    req.session.emailChangeOtp = {
      otp: otp,
      newEmail: newEmail.toLowerCase(),
      expiry: otpExpiry,
      userId: userId
    };

    // Send OTP email using enhanced email service
    try {
      await sendOtpEmail(newEmail, req.session.user.fullName || 'User', otp, 'Phoenix - Email Change Verification', 'email-update');
      console.log(`✅ Email change OTP sent successfully to: ${newEmail}`);
    } catch (emailError) {
      console.log(`❌ Failed to send email change OTP: ${emailError.message}`);

      // In development mode, continue without sending email
      if (process.env.NODE_ENV === 'development') {
        console.log("Development mode: Continuing without sending email");
        console.log(`Development OTP for ${newEmail} : ${otp}`);
      } else {
        // In production, fail the email change if email can't be sent
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Failed to send verification email. Please try again later.',
        });
      }
    }

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'OTP sent to your new email address'
    });

  } catch (error) {
    console.error('Error sending email OTP:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to send OTP. Please try again.'
    });
  }
};

// Verify OTP for email change
const verifyEmailOtpNew = async (req, res) => {
  try {
    const { newEmail, otp } = req.body;
    const userId = req.session.user_id;

    if (!newEmail || !otp) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Check if OTP exists in session
    const storedOtpData = req.session.emailChangeOtp;
    if (!storedOtpData) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'No OTP found. Please request a new OTP.'
      });
    }

    // Verify OTP details
    if (storedOtpData.userId !== userId ||
        storedOtpData.newEmail !== newEmail.toLowerCase() ||
        storedOtpData.otp !== otp.trim()) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid OTP. Please check and try again.'
      });
    }

    // Check if OTP has expired
    if (new Date() > new Date(storedOtpData.expiry)) {
      delete req.session.emailChangeOtp;
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'OTP has expired. Please request a new OTP.'
      });
    }

    // Update user's email
    await User.findByIdAndUpdate(userId, {
      email: newEmail.toLowerCase()
    });

    // Clear OTP from session
    delete req.session.emailChangeOtp;

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Email address updated successfully'
    });

  } catch (error) {
    console.error('Error verifying email OTP:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to verify OTP. Please try again.'
    });
  }
};

// Dual OTP Email Change System

// Simplified email change - Send OTP to current email for verification
const sendCurrentEmailOtp = async (req, res) => {
  try {
    const { newEmail } = req.body;
    const userId = req.session.user_id;

    if (!newEmail || !newEmail.trim()) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'New email address is required'
      });
    }

    // Validate new email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    // Get current user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if new email is already in use
    const existingUser = await User.findOne({
      email: newEmail.toLowerCase(),
      _id: { $ne: userId }
    });

    if (existingUser) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'This email address is already registered with another account'
      });
    }

    // Generate 6-digit OTP for current email verification
    const currentEmailOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store simplified OTP data in session (only current email verification needed)
    req.session.simplifiedEmailChange = {
      currentEmailOtp: currentEmailOtp,
      newEmail: newEmail.toLowerCase(),
      expiry: otpExpiry,
      userId: userId
    };

    // Send OTP to current email using enhanced email service
    try {
      await sendOtpEmail(user.email, user.fullName || 'User', currentEmailOtp, 'Phoenix - Email Change Verification', 'email-update');
      console.log(`✅ Current email OTP sent successfully to: ${user.email}`);
    } catch (emailError) {
      console.log(`❌ Failed to send current email OTP: ${emailError.message}`);

      // In development mode, continue without sending email
      if (process.env.NODE_ENV === 'development') {
        console.log("Development mode: Continuing without sending email");
        console.log(`Development OTP for ${user.email} : ${currentEmailOtp}`);
      } else {
        // In production, fail the email change if email can't be sent
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Failed to send verification email. Please try again later.',
        });
      }
    }

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'OTP sent to your current email address for verification'
    });

  } catch (error) {
    console.error('Error sending current email OTP:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to send OTP. Please try again.'
    });
  }
};

// Simplified email change - Verify current email OTP and complete email change
const verifyCurrentEmailOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const userId = req.session.user_id;

    if (!otp) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'OTP is required'
      });
    }

    // Check if OTP data exists in session
    const otpData = req.session.simplifiedEmailChange;
    if (!otpData) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'No OTP found. Please start the email change process again.'
      });
    }

    // Verify OTP details
    if (otpData.userId !== userId ||
        otpData.currentEmailOtp !== otp.trim()) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid OTP. Please check and try again.'
      });
    }

    // Check if OTP has expired
    if (new Date() > new Date(otpData.expiry)) {
      delete req.session.simplifiedEmailChange;
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'OTP has expired. Please start the process again.'
      });
    }

    // Update user's email in database (simplified - no new email verification needed)
    await User.findByIdAndUpdate(userId, {
      email: otpData.newEmail
    });

    // Update session email
    req.session.user_email = otpData.newEmail;

    // Clear OTP data from session
    delete req.session.simplifiedEmailChange;

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Email address updated successfully',
      newEmail: otpData.newEmail
    });

  } catch (error) {
    console.error('Error verifying current email OTP:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to verify OTP. Please try again.'
    });
  }
};

// Send OTP to new email for verification
const sendNewEmailOtp = async (req, res) => {
  try {
    const { newEmail } = req.body;
    const userId = req.session.user_id;

    // Check if current email is verified first
    const otpData = req.session.dualEmailOtp;
    if (!otpData || !otpData.currentEmailVerified) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Please verify your current email first'
      });
    }

    if (otpData.newEmail !== newEmail.toLowerCase()) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Email mismatch. Please start the process again.'
      });
    }

    // Generate 6-digit OTP for new email
    const newEmailOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // Update session with new email OTP
    req.session.dualEmailOtp.newEmailOtp = newEmailOtp;

    // Send OTP to new email using enhanced email service
    try {
      await sendOtpEmail(newEmail, req.session.user.fullName || 'User', newEmailOtp, 'Phoenix - Email Change Verification (New Email)', 'email-update');
      console.log(`✅ New email OTP sent successfully to: ${newEmail}`);
    } catch (emailError) {
      console.log(`❌ Failed to send new email OTP: ${emailError.message}`);

      // In development mode, continue without sending email
      if (process.env.NODE_ENV === 'development') {
        console.log("Development mode: Continuing without sending email");
        console.log(`Development OTP for ${newEmail} : ${newEmailOtp}`);
      } else {
        // In production, fail the email change if email can't be sent
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Failed to send verification email. Please try again later.',
        });
      }
    }

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'OTP sent to your new email address'
    });

  } catch (error) {
    console.error('Error sending new email OTP:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to send OTP. Please try again.'
    });
  }
};

// Verify new email OTP and complete email change
const verifyNewEmailOtp = async (req, res) => {
  try {
    const { newEmail, otp } = req.body;
    const userId = req.session.user_id;

    if (!newEmail || !otp) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Check if OTP data exists in session
    const otpData = req.session.dualEmailOtp;
    if (!otpData) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'No OTP found. Please start the email change process again.'
      });
    }

    // Verify all conditions
    if (otpData.userId !== userId ||
        otpData.newEmail !== newEmail.toLowerCase() ||
        otpData.newEmailOtp !== otp.trim() ||
        !otpData.currentEmailVerified) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid OTP or verification incomplete. Please check and try again.'
      });
    }

    // Check if OTP has expired
    if (new Date() > new Date(otpData.expiry)) {
      delete req.session.dualEmailOtp;
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'OTP has expired. Please start the process again.'
      });
    }

    // Update user's email in database
    await User.findByIdAndUpdate(userId, {
      email: newEmail.toLowerCase()
    });

    // Update session email
    req.session.user_email = newEmail.toLowerCase();

    // Clear OTP data from session
    delete req.session.dualEmailOtp;

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Email address updated successfully'
    });

  } catch (error) {
    console.error('Error verifying new email OTP:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to verify OTP. Please try again.'
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadProfileImage,
  removeProfileImage,
  requestEmailUpdate,
  verifyEmailOtp,
  resendEmailOtp,
  sendEmailOtp,
  verifyEmailOtpNew,
  sendCurrentEmailOtp,
  verifyCurrentEmailOtp,
  sendNewEmailOtp,
  verifyNewEmailOtp,
};