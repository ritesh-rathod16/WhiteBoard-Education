const users = [];

const addUser = ({ name, userId, roomId, host, presenter }) => {
  const user = { name, userId, roomId, host, presenter };
  users.push(user);
  return users.filter((user) => user.roomId === roomId);
};

const removeUser = (id) => {
  const index = users.findIndex((user) => user.userId === id); // Fixing issue

  if (index !== -1) {
    return users.splice(index, 1)[0]; // Remove user and return them
  }
};

const getUser = (id) => {
  return users.find((user) => user.userId === id);
};

const getUsersInRoom = (roomId) => {
  return users.filter((user) => user.roomId === roomId);
};

module.exports = {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
};
