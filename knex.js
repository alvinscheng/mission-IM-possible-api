const knex = require('knex')({
  dialect: 'pg',
  connection: process.env.DATABASE_URL
})

function findUser(username) {
  return knex('users')
    .where('username', username)
    .limit(1)
}

function addUser(username, password) {
  return knex('users')
    .insert({ username, password })
    .returning('*')
}

function addMessage(username, message, time, roomId) {
  return knex('messages')
    .insert({ username, message, time, room_id: roomId })
    .returning('*')
}

function getMessagesByRoom(room) {
  return knex('messages')
    .where('room_id', room)
    .orderBy('id', 'desc')
}

function getRoom(user1, user2) {
  return knex('rooms_users')
    .select('room_id')
    .whereIn('username', [user1, user2])
    .groupBy('room_id')
    .havingRaw('count(room_id) = 2')
}

function createRoom() {
  return knex('rooms')
    .insert({})
    .returning('*')
}

function createRoomUsers(user1, user2, roomId) {
  return knex('rooms_users')
    .insert([
      { room_id: roomId, username: user1 },
      { room_id: roomId, username: user2 }
    ])
    .returning('*')
}

module.exports = { findUser, addUser, addMessage, getMessagesByRoom, getRoom, createRoom, createRoomUsers }
