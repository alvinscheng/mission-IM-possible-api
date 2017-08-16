require('dotenv').config()
const { describe, it, before, after, beforeEach, afterEach } = require('mocha')
const { expect } = require('chai')
const request = require('request')
const knex = require('knex')({
  dialect: 'pg',
  connection: process.env.DATABASE_URL
})
const io = require('socket.io-client')
const server = require('../index.js')
const jwt = require('jsonwebtoken')

const port = process.env.PORT || 3000
const url = 'http://localhost:' + port

before(done => {
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

describe('mission-IM-possible API', () => {

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

  let user1, user2
  const token1 = jwt.sign({ username: 'user1' }, process.env.JWT_SECRET)
  const token2 = jwt.sign({ username: 'user2' }, process.env.JWT_SECRET)

  beforeEach(done => {
    user1 = io('http://localhost:' + port, {
      path: '/api/connect',
      'query': {
        username: 'user1',
        token: token1
      }
    })
    user1.on('connect', () => {
      user2 = io('http://localhost:' + port, {
        path: '/api/connect',
        'query': {
          username: 'user2',
          token: token2
        }
      })
      user2.on('connect', () => {
        done()
      })
    })
  })

  afterEach(() => {
    user1.disconnect()
    user2.disconnect()
  })

  describe('chat-message', () => {

    it('broadcasts a message to all users', done => {

      user1.on('chat-message', msg => {
        expect(msg).to.equal('Hello World!')
        done()
      })
      user2.emit('chat-message', 'Hello World!')
    })

  })

  describe('new-user-login', () => {

    it('broadcasts when a socket connects', done => {

      user2.disconnect()
      user2 = io('http://localhost:' + port, {
        path: '/api/connect',
        'query': {
          username: 'user2',
          token: token2
        }
      })
      user1.on('new-user-login', username => {
        expect(username).to.equal('user2')
        done()
      })

    })

  })

  describe('disconnect', () => {

    it('broadcasts username of socket that disconnects', done => {

      user1.on('user-disconnected', username => {
        expect(username).to.equal('user2')
        user2 = io('http://localhost:' + port, {
          path: '/api/connect',
          'query': {
            username: 'user2',
            token: token2
          }
        })
        done()
      })
      user2.disconnect()
    })

  })
})
