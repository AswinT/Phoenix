
function waitForDependencies() {
    if (typeof window.ValidationErrorHandler === 'undefined') {
        setTimeout(waitForDependencies, 100);
        return;
    }
    initializeCouponValidation();
}

function initializeCouponValidation() {
    const addCouponForm = document.getElementById('addCouponForm');
    const editCouponForm = document.getElementById('editCouponForm');
    const errorHandler = window.ValidationErrorHandler;

    if (addCouponForm) {
        errorHandler.addRealTimeValidation(addCouponForm);
        
        addRealTimeValidationListeners(addCouponForm, errorHandler);
    }

    if (editCouponForm) {
        errorHandler.addRealTimeValidation(editCouponForm);
        
        addRealTimeValidationListeners(editCouponForm, errorHandler);
    }
}

function addRealTimeValidationListeners(form, errorHandler) {
    const codeField = form.querySelector('#couponCode, #editCouponCode');
    if (codeField) {
        codeField.addEventListener('input', function() {
            const value = this.value.trim();
            if (value && !/^[A-Z0-9_\-]+$/.test(value)) {
                errorHandler.showFieldError(this, 'Coupon code must be uppercase letters, numbers, - or _');
            } else {
                errorHandler.clearFieldError(this);
            }
        });

        codeField.addEventListener('blur', function() {
            if (!this.value.trim()) {
                errorHandler.showFieldError(this, 'Coupon code is required');
            }
        });
    }

    const discountValueField = form.querySelector('#discountValue, #editDiscountValue');
    const discountTypeField = form.querySelector('#discountType, #editDiscountType');
    
    if (discountValueField) {
        discountValueField.addEventListener('input', function() {
            const value = Number(this.value);
            const discountType = discountTypeField ? discountTypeField.value : 'percentage';
            
            if (this.value && value <= 0) {
                errorHandler.showFieldError(this, 'Discount value must be greater than 0');
            } else if (discountType === 'percentage' && value > 100) {
                errorHandler.showFieldError(this, 'Percentage discount cannot exceed 100%');
            } else if (this.value.trim()) {
                errorHandler.clearFieldError(this);
            }
        });

        discountValueField.addEventListener('blur', function() {
            if (!this.value.trim()) {
                errorHandler.showFieldError(this, 'Discount value is required');
            }
        });
    }

    if (discountTypeField && discountValueField) {
        discountTypeField.addEventListener('change', function() {
            if (discountValueField.value) {
                const value = Number(discountValueField.value);
                if (this.value === 'percentage' && value > 100) {
                    errorHandler.showFieldError(discountValueField, 'Percentage discount cannot exceed 100%');
                } else {
                    errorHandler.clearFieldError(discountValueField);
                }
            }
        });
    }

    const maxDiscountValueField = form.querySelector('#maxDiscountValue, #editMaxDiscountValue');
    if (maxDiscountValueField) {
        maxDiscountValueField.addEventListener('input', function() {
            const value = Number(this.value);
            if (this.value && value < 0) {
                errorHandler.showFieldError(this, 'Maximum discount must be 0 or more');
            } else if (this.value.trim()) {
                errorHandler.clearFieldError(this);
            }
        });
    }

    const minOrderAmountField = form.querySelector('#minOrderAmount, #editMinOrderAmount');
    if (minOrderAmountField) {
        minOrderAmountField.addEventListener('input', function() {
            const value = Number(this.value);
            if (this.value && value < 0) {
                errorHandler.showFieldError(this, 'Minimum order amount cannot be negative');
            } else if (this.value.trim()) {
                errorHandler.clearFieldError(this);
            }
        });
    }

    const startDateField = form.querySelector('#startDate, #editStartDate');
    const expiryDateField = form.querySelector('#expiryDate, #editExpiryDate');
    
    if (startDateField) {
        startDateField.addEventListener('change', function() {
            if (!this.value) {
                errorHandler.showFieldError(this, 'Start date is required');
            } else {
                errorHandler.clearFieldError(this);
                if (expiryDateField && expiryDateField.value) {
                    validateDateRange(startDateField, expiryDateField, errorHandler);
                }
            }
        });
    }

    if (expiryDateField) {
        expiryDateField.addEventListener('change', function() {
            if (!this.value) {
                errorHandler.showFieldError(this, 'Expiry date is required');
            } else {
                errorHandler.clearFieldError(this);
                if (startDateField && startDateField.value) {
                    validateDateRange(startDateField, expiryDateField, errorHandler);
                }
            }
        });
    }

    const usageLimitGlobalField = form.querySelector('#usageLimitGlobal, #editUsageLimitGlobal');
    if (usageLimitGlobalField) {
        usageLimitGlobalField.addEventListener('input', function() {
            const value = Number(this.value);
            if (this.value && value < 0) {
                errorHandler.showFieldError(this, 'Global usage limit cannot be negative');
            } else if (this.value.trim()) {
                errorHandler.clearFieldError(this);
            }
        });
    }

    const usageLimitPerUserField = form.querySelector('#usageLimitPerUser, #editUsageLimitPerUser');
    if (usageLimitPerUserField) {
        usageLimitPerUserField.addEventListener('input', function() {
            const value = Number(this.value);
            if (this.value && value < 1) {
                errorHandler.showFieldError(this, 'Usage limit per user must be at least 1');
            } else if (this.value.trim()) {
                errorHandler.clearFieldError(this);
            }
        });

        usageLimitPerUserField.addEventListener('blur', function() {
            if (!this.value.trim()) {
                errorHandler.showFieldError(this, 'Usage limit per user is required');
            }
        });
    }
}

function validateDateRange(startDateField, expiryDateField, errorHandler) {
    const startDate = new Date(startDateField.value);
    const expiryDate = new Date(expiryDateField.value);
    
    if (startDate >= expiryDate) {
        errorHandler.showFieldError(expiryDateField, 'Expiry date must be after start date');
        return false;
    } else {
        errorHandler.clearFieldError(expiryDateField);
        return true;
    }
}

window.validateCouponForm = function(form) {
    const errorHandler = window.ValidationErrorHandler;
    let isValid = true;

    errorHandler.clearAllErrors(form);

    const codeField = form.querySelector('#couponCode, #editCouponCode');
    if (codeField) {
        if (!codeField.value.trim()) {
            errorHandler.showFieldError(codeField, 'Coupon code is required');
            isValid = false;
        } else if (!/^[A-Z0-9_\-]+$/.test(codeField.value.trim())) {
            errorHandler.showFieldError(codeField, 'Coupon code must be uppercase letters, numbers, - or _');
            isValid = false;
        }
    }

    const discountTypeField = form.querySelector('#discountType, #editDiscountType');
    if (discountTypeField && !discountTypeField.value) {
        errorHandler.showFieldError(discountTypeField, 'Discount type is required');
        isValid = false;
    }

    const discountValueField = form.querySelector('#discountValue, #editDiscountValue');
    if (discountValueField) {
        if (!discountValueField.value || Number(discountValueField.value) <= 0) {
            errorHandler.showFieldError(discountValueField, 'Discount value is required and must be greater than 0');
            isValid = false;
        } else if (discountTypeField && discountTypeField.value === 'percentage' && Number(discountValueField.value) > 100) {
            errorHandler.showFieldError(discountValueField, 'Percentage discount cannot exceed 100%');
            isValid = false;
        }
    }

    const maxDiscountValueField = form.querySelector('#maxDiscountValue, #editMaxDiscountValue');
    if (maxDiscountValueField && discountTypeField && discountTypeField.value === 'percentage' && maxDiscountValueField.value && Number(maxDiscountValueField.value) < 0) {
        errorHandler.showFieldError(maxDiscountValueField, 'Maximum discount must be 0 or more');
        isValid = false;
    }

    const minOrderAmountField = form.querySelector('#minOrderAmount, #editMinOrderAmount');
    if (minOrderAmountField && minOrderAmountField.value && Number(minOrderAmountField.value) < 0) {
        errorHandler.showFieldError(minOrderAmountField, 'Minimum order amount cannot be negative');
        isValid = false;
    }

    const startDateField = form.querySelector('#startDate, #editStartDate');
    if (startDateField && !startDateField.value) {
        errorHandler.showFieldError(startDateField, 'Start date is required');
        isValid = false;
    }

    const expiryDateField = form.querySelector('#expiryDate, #editExpiryDate');
    if (expiryDateField) {
        if (!expiryDateField.value) {
            errorHandler.showFieldError(expiryDateField, 'Expiry date is required');
            isValid = false;
        } else if (startDateField && startDateField.value && new Date(startDateField.value) >= new Date(expiryDateField.value)) {
            errorHandler.showFieldError(expiryDateField, 'Expiry date must be after start date');
            isValid = false;
        }
    }

    const usageLimitGlobalField = form.querySelector('#usageLimitGlobal, #editUsageLimitGlobal');
    if (usageLimitGlobalField && usageLimitGlobalField.value && Number(usageLimitGlobalField.value) < 0) {
        errorHandler.showFieldError(usageLimitGlobalField, 'Global usage limit cannot be negative');
        isValid = false;
    }

    const usageLimitPerUserField = form.querySelector('#usageLimitPerUser, #editUsageLimitPerUser');
    if (usageLimitPerUserField) {
        if (!usageLimitPerUserField.value || Number(usageLimitPerUserField.value) < 1) {
            errorHandler.showFieldError(usageLimitPerUserField, 'Usage limit per user is required and must be at least 1');
            isValid = false;
        }
    }

    return isValid;
};

document.addEventListener('DOMContentLoaded', waitForDependencies);