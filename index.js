require('dotenv').config()
const express = require('express')
const path = require('path')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')

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
  let { username, password } = req.body
  const payload = { username }
  const token = jwt.sign(payload, process.env.JWT_SECRET)
  bcrypt.hash(password, 10).then(hash => {
    password = hash
    // use knex to send user to datapase and return token
    console.log(token)
  })
})

const port = process.env.PORT || 3000
server.listen(port, () => console.log('Listening on ' + port))
