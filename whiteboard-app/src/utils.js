export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePassword(password) {
  return password.length >= 6;
}

export function getUserColor(userId) {
  const hash = Array.from(userId).reduce((hash, char) => {
    return char.charCodeAt(0) + ((hash << 5) - hash);
  }, 0);
  return `hsl(${Math.abs(hash % 360)}, 70%, 60%)`;
}
