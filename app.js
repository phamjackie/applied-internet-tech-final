require('./db.js');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const flash = require('connect-flash');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const Post = mongoose.model('Post');
const Comment = mongoose.model('Comment');

const app = express();

// enable sessions
const session = require('express-session');
const sessionOptions = {
    secret: 'secret cookie',
    resave: true,
    saveUninitialized: true
};
app.use(session(sessionOptions));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// body parser setup
app.use(bodyParser.urlencoded({ extended: false }));

// serve static files
app.use(express.static(path.join(__dirname, 'public')));

// initialize passport middleware
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// passport authentication strategy
passport.use(new LocalStrategy(
    function(username, password, done) {
        User.findOne({username: username}, function(err, user) {
            if (err) {
                return done(err);
            }
            if (!user) {
                return done(null, false, { message: 'Incorrect username.' });
            }
            if (!user.validPassword(password)) {
                return done(null, false, { message: 'Incorrect password.' });
            }
            return done(null, user);
        });
    }
));

// serialize user id to session
passport.serializeUser((user, done) => {
    done(null, user.id);
});
  
passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
        done(err, user);
    });
});


// check if user is logged in or not
app.use((req, res, next) => {
    res.locals.loggedIn = req.isAuthenticated();
    next();
});

app.get('/', (req, res) => {
    let query = {};

    if (req.query.searchQ) {
        query = {'text' : {$regex : `(?i)(.*${req.query.searchQ}.*)`}};
    }

    Post.find(query, (err, result) => {
        if (err) {
           console.log(err);
           res.status(500).send(err);
        } else {
            res.render('index', {posts: result.reverse()});
        }
     });
});

app.post('/', (req, res) => {
    const post = new Post({
        text: req.body.postText.toString(),
        createdAt: Date.now(),
        user: req.user.username,
        numComments: 0
    });

    post.save((err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send({error: err});
        } else {
            User.findByIdAndUpdate(req.user._id, { "$push": { posts: result._id }}, { "new": true }, (err, docs) => {
                if (err) {
                    console.log(err);
                    res.status(500).send(err);
                } else {
                    console.log('Post successfully added to user: ' + docs.text);
                    console.log('Post "' + result.text + '" saved successfully.');
                    res.redirect('/');
                }
            });
        }
    });
});

app.get('/:id/comments/', (req, res) => {
    Post.findById(req.params.id, (err, result) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.render('post', result);
        }
    });
});

app.post('/:id/comments/', (req, res) => {
    const postId = req.params.id;

    const comment = new Comment({
        text: req.body.commentText.toString(),
        createdAt: Date.now(),
        user: req.user.username,
        post: postId
    });

    comment.save((err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send({error: err});
        } else {
            console.log('"' + result.text + '" comment saved successfully.');
            Post.findByIdAndUpdate(postId, { "$push": { comments: comment }, "$inc": { numComments : 1 } }, { "new": true }, (err, docs) => {
                if (err) {
                    console.log(err);
                    res.status(500).send(err);
                } else {
                    console.log('Comment successfully added to post: ' + docs.text);
                    res.redirect(`/${postId}/comments/`);
                }
            });
        }
    });
});

app.get('/login', (req, res) => {
    if (req.isAuthenticated()) {
        res.redirect('/');
    } else {
        res.render('login');
    }
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}));

app.get('/register', (req, res) => {
    if (req.isAuthenticated()) {
        res.redirect('/');
    } else {
        res.render('register');
    }
});

app.post('/register', (req, res) => {
    const newUsername = req.body.username;
    User.findOne({username: newUsername}, function(err, result) {
        if (!result) {
            const user = new User({
                username: newUsername,
                password: req.body.password
            });
            user.save((err, result) => {
                if (err) {
                    console.log(err);
                    res.status(500).send(err);
                } else {
                    console.log('New user ' + result.username + ' successfully registered.');
                    req.login(user, function(err) {
                        if (err) {
                            console.log(err);
                            res.status(500).send(err);
                        } else {
                            return res.redirect('/');
                        }
                    });
                }
            });
        } else if (err) {
            res.status(500).send(err);
        } else {
            res.redirect('/register');
        }
    });
});

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

app.get('/profile', (req, res) => {
    if (req.isAuthenticated()) {
        const postIds = req.user.posts;
        Post.find({}, (err, result) => {
            if (err) {
                res.status(500).send(err);
            } else {
                const allPosts = result;
                const userPosts = allPosts.filter(post => postIds.includes(post._id));
                res.render('profile', {posts: userPosts});
            }
        });
    } else {
        res.redirect('/login');
    }
});


const port = process.env.PORT || 3000;
app.listen(port);