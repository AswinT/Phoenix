/**
 * Generate user initials from full name
 * @param {string} fullName - User's full name
 * @returns {string} - User initials (max 2 characters)
 */
function generateInitials(fullName) {
  if (!fullName || typeof fullName !== 'string') {
    return 'U'; // Default fallback
  }
  
  const names = fullName.trim().split(' ').filter(name => name.length > 0);
  
  if (names.length === 0) {
    return 'U';
  }
  
  if (names.length === 1) {
    return names[0].charAt(0).toUpperCase();
  }
  
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}

module.exports = { generateInitials };