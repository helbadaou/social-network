/**
 * Abbreviates a number using K, M, B, T notation
 * @param {number} number - The number to abbreviate
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} - Abbreviated number string
 */
export function abbreviateNumber(number, decimals = 1) {
  // Handle edge cases
  if (number === 0) return "0";
  if (!number) return "";
  if (isNaN(number)) return "NaN";

  // Make sure number is positive for calculations
  const isNegative = number < 0;
  const absNumber = Math.abs(number);

  // Define abbreviation thresholds and symbols
  const tier = [
    { threshold: 1, symbol: "" },
    { threshold: 1e3, symbol: "K" },
    { threshold: 1e6, symbol: "M" },
    { threshold: 1e9, symbol: "B" },
    { threshold: 1e12, symbol: "T" },
  ];

  // Find appropriate tier
  let i = tier.length - 1;
  while (i > 0 && absNumber < tier[i].threshold) {
    i--;
  }

  // Calculate the abbreviated value
  const divisor = tier[i].threshold;
  const abbreviatedValue = absNumber / divisor;

  // Format with correct number of decimal places
  // If the value is exact (like 1K for 1000), don't show decimals
  const isExact = abbreviatedValue % 1 === 0;
  const formattedValue = isExact
    ? abbreviatedValue.toString()
    : abbreviatedValue.toFixed(decimals).replace(/\.0+$/, "");

  // Add the negative sign back if the original number was negative
  const sign = isNegative ? "-" : "";

  return `${sign}${formattedValue}${tier[i].symbol}`;
}

/**
 * Formats a date based on how recent it is
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date string
 */
export function formatDate(date) {
  const now = new Date();
  const diff = now - date; // difference in milliseconds

  // Convert time differences to seconds, minutes, hours, days
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  // If less than a week has passed
  if (days < 7) {
    // If it's today
    if (days === 0) {
      if (seconds < 60) {
        return `${seconds}s ago`;
      }
      if (minutes < 60) {
        return `${minutes}m ago`;
      }
      if (hours < 24) {
        return `${hours}h ago`;
      }
    }

    // If it's within the last week but not today
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  }

  // If more than a week has passed, format as dd/mm/yyyy
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0"); // getMonth() is 0-indexed
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}
