require('dotenv').config()
const express = require('express')
const path = require('path')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const { findUser, addUser } = require('./knex.js')

const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server, {
  path: '/api/connect'
})

app.use(express.static(path.join(__dirname, 'public')))
app.options('*', cors())

io.on('connection', socket => {
  socket.on('chat-message', msg => {
    io.emit('chat-message', msg)
  })
})

app.post('/register', (req, res) => {
  const { username, password } = req.body
  const payload = { username }
  const token = jwt.sign(payload, process.env.JWT_SECRET)
  const salt = bcrypt.genSaltSync(10)
  const hash = bcrypt.hashSync(password, salt)
  findUser(username)
    .then(data => {
      (data)
        ? console.log('user already exists')
        : addUser(username, hash)
            .then(() => {
              res.send({ token })
            })
    })
})

const port = process.env.PORT || 3000
server.listen(port, () => console.log('Listening on ' + port))
