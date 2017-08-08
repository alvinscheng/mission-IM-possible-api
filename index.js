require('dotenv').config()
const express = require('express')
const path = require('path')
const cors = require('cors')

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

const port = process.env.PORT || 3000
server.listen(port, () => console.log('Listening on ' + port))
