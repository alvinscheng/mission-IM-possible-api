require('dotenv').config()
const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const { findUser, addUser } = require('./knex.js')
const socketioJwt = require('socketio-jwt')

const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server, {
  path: '/api/connect'
})

app.use(express.static(path.join(__dirname, 'public')))
app.use(bodyParser.json())
app.options('*', cors())

io.use(socketioJwt.authorize({
  secret: process.env.JWT_SECRET,
  handshake: true
}))

io.on('connection', socket => {
  socket.on('chat-message', msg => {
    io.emit('chat-message', msg)
  })
  socket.on('new-user-login', username => {
    io.emit('new-user-login', username)
  })
  socket.on('disconnect', () => {
    io.emit('user-disconnected', socket.handshake.query.username)
  })
})

/**
 * @api {post} /register Create a new user.
 * @apiName CreateUser
 * @apiGroup Login
 *
 * @apiExample {httpie} Example Usage:
 *  http post http://localhost/register username=user1 password=password1
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
        res.status(409).send('Username already exists.')
      }
      else {
        addUser(username, hash)
          .then(() => {
            res.status(201).send({ username, token })
          })
      }
    })
})

/**
 * @api {post} /authenticate Verify the user password.
 * @apiName AuthenticatePassword
 * @apiGroup Login
 *
 * @apiExample {httpie} Example Usage:
 *  http post http://localhost/authenticate username=user1 password=password1
 *
 * @apiSuccessExample {json} Successful Response:
 *  HTTP/1.1 201 CREATED
 *  {

UPDATE THIS

 *    "token": "YOUR_TOKEN"
 *    "username": "user1"
 *  }
 *
 * @apiErrorExample {json} Error-Response:
 *  HTTP/1.1 401 Unauthorized
 *  {
 *    "error": "Passwords did not match."
 *  }
 *
 * @apiErrorExample {json} Error-Response:
 *  HTTP/1.1 404 Not Found
 *  {
 *    "error": "Username does not exist."
 *  }
 *
 */
app.post('/authenticate', (req, res) => {
  const { username, password } = req.body
  findUser(username)
    .then(user => {
      if (!user.length) return res.status(404).send({ error: 'Username does not exist.' })

      if (!bcrypt.compareSync(password, user[0].password)) {
        return res.status(401).send({ error: 'Passwords did not match.' })
      }

      const payload = { username }
      const token = jwt.sign(payload, process.env.JWT_SECRET)
      res.status(200).send({ username, token })
    })
})

const port = process.env.PORT || 3000
server.listen(port, () => console.log('Listening on ' + port))

module.exports = server
