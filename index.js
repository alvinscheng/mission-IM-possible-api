require('dotenv').config()
const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
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
app.use(bodyParser.json())
app.options('*', cors())

io.on('connection', socket => {
  socket.on('chat-message', msg => {
    io.emit('chat-message', msg)
  })
})

/**
 * @api {post} /register Create a new user.
 * @apiGroup register
 *
 * @apiExample {httpie} Example Usage:
 *  http post http://localhost/register username=user1 password=password1
 *
 *
 * @apiSuccessExample {json} Successful Response:
 *  HTTP/1.1 201 CREATED
 *  {
 *    "token": "YOUR_TOKEN"
 *  }
 *
 */

app.post('/register', (req, res) => {
  const { username, password } = req.body
  const payload = { username }
  const token = jwt.sign(payload, process.env.JWT_SECRET)
  const hash = bcrypt.hashSync(password, 10)
  findUser(username)
    .then(data => {
      if (data.length) {
        console.log('user already exists')
        res.sendStatus(409)
      }
      else {
        addUser(username, hash)
          .then(() => {
            res.status(201).send({ token })
          })
      }
    })
})

const port = process.env.PORT || 3000
server.listen(port, () => console.log('Listening on ' + port))
