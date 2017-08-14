const { describe, it, before, after } = require('mocha')
const { expect } = require('chai')
const request = require('request')
const knex = require('knex')({
  dialect: 'pg',
  connection: process.env.DATABASE_URL
})

describe('mission-IM-possible API', () => {

  const port = process.env.PORT || 3000
  const url = 'http://localhost:' + port

  describe('POST /register', () => {

    before(() => {
      knex('users').truncate()
    })

    after(() => {
      knex('users').truncate()
    })

    it('creates a new user', done => {
      const json = { username: 'user1', password: 'password1' }
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

    before(() => {
      knex('users').insert({ username: 'user1', password: 'password1' })
    })

    after(() => {
      knex('users').truncate()
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
  })

})
