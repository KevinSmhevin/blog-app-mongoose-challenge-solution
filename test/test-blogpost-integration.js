'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');
const expect = chai.expect;

const {BlogPost} =  require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config')

const should = chai.should();
chai.use(chaiHttp);

function seedBlogPostData() {
    console.info('seeding blogpost data');
    const seedData = [];

    for (let i=1; i<=10; i++) {
        seedData.push(generateBlogPostData());
    }
    return BlogPost.insertMany(seedData);
}

function generateBlogPostData() {
    return {
        author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName()
        },
        content: faker.lorem.paragraph(),
        title: faker.lorem.sentence()
    }
}

function tearDownDb() {
    return new Promise((resolve, reject) => {
        console.warn('Deleting database');
        return mongoose.connection.dropDatabase()
            .then(result => resolve(result))
            .catch(err => reject(err));
    }); 
}

describe('BlogPost API resource', function() {
    before(function() {
        return runServer(TEST_DATABASE_URL)
    });
    beforeEach(function() {
        return seedBlogPostData();
    });
    afterEach(function(){
        return tearDownDb();
    });
    after(function() {
        return closeServer();
    })


    describe('GET endpoint', function() {
        it('should return all existing blog post', function() {
            let res;
            return chai.request(app)
            .get('/posts')
            .then(function(_res) {
                res = _res;
                expect(res).to.have.status(200);
                // console.log(res.body);
                // console.log(res.body.length)
                expect(res.body).to.have.lengthOf.at.least(1);
                return BlogPost.count();
            })
            .then(function(count) {
                expect(res.body).to.have.lengthOf(count);
            });
        });
        it('should return all blog posts with correct fields', function() {
            let resBlogPost;
            return chai.request(app)
            .get('/posts')
            .then(function(res) {
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body).to.be.a('array');
                expect(res.body).to.have.lengthOf.at.least(1);

                res.body.forEach(function(blogpost) {
                    expect(blogpost).to.be.a('object');
                    expect(blogpost).to.include.keys(
                        'id', 'author', 'content', 'title', 'created');
                });
                resBlogPost = res.body[0];
                return BlogPost.findById(resBlogPost.id);
            })
            .then(function(blogpost) {
                expect(resBlogPost.id).to.equal(blogpost.id);
                expect(resBlogPost.author).to.equal(blogpost.authorName);
                expect(resBlogPost.content).to.equal(blogpost.content);
                expect(resBlogPost.title).to.equal(blogpost.title)
            });
        });
    });
    describe('POST endpoint', function() {
        it('should add a new post', function() {
            const newPost = generateBlogPostData()
            return chai.request(app)
            .post('/posts')
            .send(newPost)
            // console.log(res)
            .then(function(res) {
                expect(res).to.have.status(201);
                expect(res).to.be.json;
                expect(res.body).to.be.a('object');
                expect(res.body).to.include.keys(
                    'id', 'author', 'content', 'title', 'created');
                expect(res.body.id).to.not.be.null;
                expect(res.body.content).to.equal(newPost.content);
                expect(res.body.title).to.equal(newPost.title)
                return BlogPost.findById(res.body.id);
            })
            .then(function(post) {
                expect(post.author.firstName).to.equal(newPost.author.firstName);
                expect(post.content).to.equal(newPost.content);
                expect(post.title).to.equal(newPost.title);
              });
        })
    })
    describe('PUT endpoint', function() {
        it('should alter an existing post', function() {
            const updateData = {
                content: 'France won the world cup!',
                title: 'SPOILERS: World Cup Results'
            };
            return BlogPost
            .findOne()
            .then(function(blogpost) {
                updateData.id = blogpost.id;
                console.log(blogpost.id + ' OVER HERE!!!!!!!!!!!')
                return chai.request(app)
                    .put(`/posts/${blogpost.id}`)
                    .send(updateData)
            })
            .then(function(res) {
                expect(res).to.have.status(204);
                return BlogPost.findById(updateData.id);
            })
            .then(function(blogpost) {
                console.log(blogpost.content + "--------------" + updateData.content)
                expect(blogpost.content).to.equal(updateData.content);
                expect(blogpost.title).to.equal(updateData.title);
            });
        });
    });
    describe('DELETE endpoint', function() {
        it('should delete a blogpost by ID', function() {
            let blogpost
            return BlogPost
            .findOne()
            .then(function(_blogpost) {
                blogpost = _blogpost;
                return chai.request(app).delete(`/posts/${blogpost.id}`);
            })
            .then(function(res) {
                expect(res).to.have.status(204);
                return BlogPost.findById(blogpost.id);
            })
            .then(function(_blogpost) {
                expect(_blogpost).to.be.null;
            })
        })
    })
    
});