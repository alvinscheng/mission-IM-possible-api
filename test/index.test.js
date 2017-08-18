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

  describe('POST /messages', () => {

    before(done => {
      knex('messages')
        .truncate()
        .then(() => done())
    })

    after(done => {
      knex('messages')
        .truncate()
        .then(() => done())
    })

    it('Adds a new message to the database', done => {
      const json = { username: 'user1', message: 'Hello', time: '100', roomId: 1 }
      request.post(url + '/messages', { json }, (err, res, body) => {
        expect(err).to.equal(null)
        expect(res).to.have.property('statusCode', 201)
        done()
      })
    })

  })

  describe('GET /messages', () => {
    const message1 = { username: 'user1', message: 'Hello', time: '100', room_id: 1 }
    const message2 = { username: 'user2', message: 'world', time: '200', room_id: 1 }

    before(done => {
      knex('messages').truncate().insert(message1).then(() => {
        knex('messages').insert(message2).then(() => {
          knex('rooms').truncate().then(() => {
            knex('rooms_users').truncate().then(() => {
              done()
            })
          })
        })
      })
    })

    after(done => {
      knex('messages').truncate().then(() => {
        knex('rooms').truncate().then(() => {
          knex('rooms_users').truncate().then(() => {
            done()
          })
        })
      })
    })

    it('Gets messages from the database by room id', done => {
      request.get(url + '/messages?room=1', (err, res, body) => {
        expect(err).to.equal(null)
        expect(res).to.have.property('statusCode', 200)
        expect(body).to.be.a('string')
        done()
      })
    })

    it('Creates a new room if one doesn\'t exist between the users', done => {
      request.get(url + '/messages?usernames=user1+user3', (err, res, body) => {
        expect(err).to.equal(null)
        expect(res).to.have.property('statusCode', 200)
        expect(body).to.be.a('string')
        done()
      })
    })

    it('Gets messages from the database by usernames', done => {
      request.get(url + '/messages?usernames=user1+user3', (err, res, body) => {
        expect(err).to.equal(null)
        expect(res).to.have.property('statusCode', 200)
        expect(body).to.be.an('string')
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

  afterEach(done => {
    user1.disconnect()
    user2.disconnect()
    done()
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

      user1.on('user-disconnected', () => {
        user1.on('new-user-login', users => {
          expect(users).to.be.an('array').with.length(2)
          done()
        })

        user2 = io('http://localhost:' + port, {
          path: '/api/connect',
          'query': {
            username: 'user2',
            token: token2
          }
        })

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
        user2.on('connect', () => {
          done()
        })
      })
      user2.disconnect()
    })

  })
})
