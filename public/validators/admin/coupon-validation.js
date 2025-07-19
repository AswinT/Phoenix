// Coupon validation for admin panel
document.addEventListener('DOMContentLoaded', function() {
    // Form validation for Add Coupon
    const addCouponForm = document.getElementById('addCouponForm');
    if (addCouponForm) {
        addCouponForm.addEventListener('submit', function(e) {
            e.preventDefault();
            validateCouponForm('add');
        });
    }

    // Form validation for Edit Coupon
    const editCouponForm = document.getElementById('editCouponForm');
    if (editCouponForm) {
        editCouponForm.addEventListener('submit', function(e) {
            e.preventDefault();
            validateCouponForm('edit');
        });
    }

    function validateCouponForm(type) {
        const prefix = type === 'add' ? '' : 'edit';
        const codeField = document.getElementById(prefix + 'CouponCode' || prefix + 'couponCode');
        const discountTypeField = document.getElementById(prefix + 'DiscountType' || prefix + 'discountType');
        const discountValueField = document.getElementById(prefix + 'DiscountValue' || prefix + 'discountValue');
        const startDateField = document.getElementById(prefix + 'StartDate' || prefix + 'startDate');
        const expiryDateField = document.getElementById(prefix + 'ExpiryDate' || prefix + 'expiryDate');

        let isValid = true;
        let errors = [];

        // Validate coupon code
        if (!codeField.value.trim()) {
            errors.push('Coupon code is required');
            isValid = false;
        }

        // Validate discount value
        if (!discountValueField.value || discountValueField.value <= 0) {
            errors.push('Discount value must be greater than 0');
            isValid = false;
        }

        // Validate percentage discount
        if (discountTypeField.value === 'percentage' && discountValueField.value > 100) {
            errors.push('Percentage discount cannot exceed 100%');
            isValid = false;
        }

        // Validate dates
        if (startDateField.value && expiryDateField.value) {
            const startDate = new Date(startDateField.value);
            const expiryDate = new Date(expiryDateField.value);
            
            if (startDate >= expiryDate) {
                errors.push('Expiry date must be after start date');
                isValid = false;
            }
        }

        if (!isValid) {
            Swal.fire({
                title: 'Validation Error',
                html: errors.join('<br>'),
                icon: 'error'
            });
        }

        return isValid;
    }
});