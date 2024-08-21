const mongoose = require('mongoose');
const supertest = require('supertest');
const app = require('../app');
const helper = require('./test_helper');
const Blog = require('../models/blog');

const api = supertest(app);

const newBlogObject2 = {
  title: "TDD harms architecture",
  author: "Robert C. Martin",
  url: "http://blog.cleancoder.com/uncle-bob/2017/03/03/TDD-Harms-Architecture.html",
};

const newBlogObject3 = {
  author: "Robert C. Martin",
  likes: 100,
};

beforeEach(async () => {
  await Blog.deleteMany({});
  for (let blog of helper.initialBlogs) {
    let blogObject = new Blog(blog);
    await blogObject.save();
  }
});

// GET Test, check for 3 blogs
test('all blogs are returned', async () => {
  const response = await api.get('/api/blogs');
  expect(response.body).toHaveLength(helper.initialBlogs.length);
});

// Check if each blog has ID property
test('all blogs have id property', async () => {
  const response = await api.get('/api/blogs');
  response.body.forEach(blog => {
    expect(blog.id).toBeDefined();
  });
});

// Check if POST works
test('a valid blog can be added', async () => {
  const newBlog = {
    title: "TDD harms architecture",
    author: "Robert C. Martin",
    url: "http://blog.cleancoder.com/uncle-bob/2017/03/03/TDD-Harms-Architecture.html",
    likes: 7,
  };

  await api
    .post('/api/blogs')
    .send(newBlog)
    .expect(201)
    .expect('Content-Type', /application\/json/);

  const response = await api.get('/api/blogs');
  const titles = response.body.map(r => r.title);

  expect(response.body).toHaveLength(helper.initialBlogs.length + 1);
  expect(titles).toContain(newBlog.title);
});

// Check if likes defaults to 0 if likes isn't defined
test('blog without likes defaults to 0', async () => {
  await api
    .post('/api/blogs')
    .send(newBlogObject2)
    .expect(201)
    .expect('Content-Type', /application\/json/);

  const blogs = await Blog.find({});
  const addedBlog = blogs.find(blog => blog.title === newBlogObject2.title);

  expect(addedBlog.likes).toBe(0);
});

// Checks if there's a 400 error when url or title aren't defined
test('blog without title and url is not added', async () => {
  await api
    .post('/api/blogs')
    .send(newBlogObject3)
    .expect(400);

  const response = await api.get('/api/blogs');
  expect(response.body).toHaveLength(helper.initialBlogs.length);
});

// Check DELETE
test('a blog can be deleted', async () => {
  const blogsAtStart = await Blog.find({});
  const blogToDelete = blogsAtStart[0];

  await api
    .delete(`/api/blogs/${blogToDelete.id}`)
    .expect(204);

  const blogsAtEnd = await Blog.find({});
  expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length - 1);

  const titles = blogsAtEnd.map(r => r.title);
  expect(titles).not.toContain(blogToDelete.title);
});

// Check PUT
test('a blog can be updated', async () => {
  const updatedBlog = {
    title: "LOL",
    author: "Michael Chan",
    url: "https://reactpatterns.com/",
    likes: 100,
  };

  const blogsAtStart = await Blog.find({});
  const blogToUpdate = blogsAtStart[0];

  await api
    .put(`/api/blogs/${blogToUpdate.id}`)
    .send(updatedBlog)
    .expect(200)
    .expect('Content-Type', /application\/json/);

  const blogsAtEnd = await Blog.find({});
  const updatedBlogFromDB = blogsAtEnd.find(blog => blog.id === blogToUpdate.id);

  expect(updatedBlogFromDB.title).toBe(updatedBlog.title);
  expect(updatedBlogFromDB.likes).toBe(updatedBlog.likes);
});

afterAll(() => {
  mongoose.connection.close();
});
