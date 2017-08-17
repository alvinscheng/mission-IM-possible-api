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

function addMessage(username, message, time) {
  return knex('messages')
    .insert({ username, message, time })
    .returning('*')
}

function getMessages() {
  return knex('messages').orderBy('id', 'desc')
}

module.exports = { findUser, addUser, addMessage, getMessages }
