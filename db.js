require('dotenv').config();
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

// a user
// * our site requires authentication...
// * so users have a username and password
// * they also have an array of their posts
const User = new mongoose.Schema({
    username: String,
    password: String,
    posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }]
});

User.methods.validPassword = function(pwd) {
    return (this.password === pwd);
};

// a comment
const Comment = new mongoose.Schema({
    text: {type: String, required: true},
    createdAt: {type: Date},
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post'},
    user: {type: String}
});

// a post
const Post = new mongoose.Schema({
    text: {type: String, required: true},
    createdAt: {type: Date},
    user: { type: String},
    numComments: {type: Number},
    comments: {type: [Comment]}
});

// TODO: add remainder of setup for slugs, connection, registering models, etc. below
mongoose.model('User', User);
mongoose.model('Post', Post);
mongoose.model('Comment', Comment);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/phamjackie-final-project', { useNewUrlParser: true, useUnifiedTopology: true });