export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isStrongPassword = (password) => {
  // At least 8 characters, containing uppercase, lowercase, number, and special character
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return !isNaN(date.getTime()); // Valid date if it's not NaN
};

export const isValidNames = (str) => {
  return /^[a-zA-Z]{2,20}$/.test(str);
};

export const isValidNickName = (str) => {
  // 2-20 characters, only letters, numbers, and special characters
  return /^[a-zA-Z0-9_]{2,20}$/.test(str);
};

export const isValidAvatar = (file) => {
  // must be a valid image format and also size must be less than 5MB
  const imageRegex = /\.(jpg|jpeg|png|gif)$/i;
  const size = file.size / 1024 / 1024;
  return imageRegex.test(file.name) && size < 5;
};

export const isValidBio = (str) => {
  return str.length <= 100;
};
