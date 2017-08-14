require('dotenv').config()
const { describe, it, before, after } = require('mocha')
const { expect } = require('chai')
const request = require('request')
const knex = require('knex')({
  dialect: 'pg',
  connection: process.env.DATABASE_URL
})
const io = require('socket.io-client')
const server = require('../index.js')

describe('mission-IM-possible API', () => {

  before(done => {
    const port = process.env.PORT || 3000
    server.listen(port, () => {
      console.log('Listening on ' + port)
      done()
    })
  })

  after(done => {
    server.close(() => {
      done()
    })
  })

  const port = process.env.PORT || 3000
  const url = 'http://localhost:' + port

  describe('POST /register', () => {

    before(done => {
      knex('users')
        .truncate()
        .then(() => {
          knex('users')
            .insert({ username: 'user1', password: 'password1' })
            .then(() => done())
        })
    })

    after(done => {
      knex('users')
        .truncate()
        .then(() => {
          done()
        })
    })

    it('rejects a new user if the username is already taken', done => {
      const json = { username: 'user1', password: 'password1' }
      request.post(url + '/register', { json }, (err, res, body) => {
        expect(err).to.equal(null)
        expect(res).to.have.property('statusCode', 409)
        done()
      })
    })

    it('creates a new user', done => {
      const json = { username: 'user2', password: 'password1' }
      request.post(url + '/register', { json }, (err, res, body) => {
        expect(err).to.equal(null)
        expect(res).to.have.property('statusCode', 201)
        expect(body)
          .to.be.an('object')
          .with.property('token')
        done()
      })
    })

  })

  describe('POST /authenticate', () => {

    before(done => {
      knex('users')
        .truncate()
        .then(() => {
          const json = { username: 'user1', password: 'password1' }
          request.post(url + '/register', { json }, () => {
            done()
          })
        })
    })

    after(done => {
      knex('users')
        .truncate()
        .then(() => {
          done()
        })
    })

    it('validates a username and password', done => {
      const json = { username: 'user1', password: 'password1' }
      request.post(url + '/authenticate', { json }, (err, res, body) => {
        expect(err).to.equal(null)
        expect(res).to.have.property('statusCode', 200)
        expect(body)
          .to.be.an('object')
          .with.property('token')
        done()
      })
    })

    it('rejects an incorrect password', done => {
      const json = { username: 'user1', password: 'password2' }
      request.post(url + '/authenticate', { json }, (err, res, body) => {
        expect(err).to.equal(null)
        expect(res).to.have.property('statusCode', 401)
        expect(body.error).to.equal('Passwords did not match.')
        done()
      })
    })

    it('responds if username does not exist', done => {
      const json = { username: 'user0', password: 'password1' }
      request.post(url + '/authenticate', { json }, (err, res, body) => {
        expect(err).to.equal(null)
        expect(res).to.have.property('statusCode', 404)
        expect(body.error).to.equal('Username does not exist.')
        done()
      })
    })
  })

})

describe('Socket.io', () => {

  it('broadcasts a message to all users', done => {
    let messages = 0

    function checkMessages(user) {
      user.on('chat-message', msg => {
        expect(msg).to.equal('Hello World!')
        user.disconnect()
        messages++
        if (messages === 2) {
          done()
        }
      })
    }
    const user1 = io.connect('https://stark-meadow-83882.herokuapp.com', {
      path: '/api/connect'
    })
    checkMessages(user1)
    user1.on('connect', () => {
      const user2 = io.connect('https://stark-meadow-83882.herokuapp.com', {
        path: '/api/connect'
      })
      checkMessages(user2)
      user2.on('connect', () => {
        user1.emit('chat-message', 'Hello World!')
      })
    })
    done()
  })

})
