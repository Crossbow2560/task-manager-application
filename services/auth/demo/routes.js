// Explicitly enabled, loopback-only shortcuts for the dedicated synthetic demo.
// Uses the normal password/lockout/active-account login handler.
const express = require('express');
const { login } = require('../login/routes');
const { notFound, badRequest } = require('../../../src/errors');
const router = express.Router();
const accounts = [
  {email:'admin@demo.test',name:'Demo Admin',description:'All project features and account administration'},
  {email:'manager@demo.test',name:'Demo Manager',description:'Manage project members and tasks'},
  {email:'member@demo.test',name:'Demo Teammate',description:'Update assigned tasks and add comments'},
  {email:'temporary@demo.test',name:'Temporary Demo User',description:'Spare account for the deactivation demonstration'},
  {email:'outsider@demo.test',name:'Outside Project User',description:'Demonstrate restricted project access'},
];
function localDemo(req, res, next) {
  let dedicated = false;
  try {
    const url = new URL(process.env.DATABASE_URL);
    dedicated = url.pathname === '/taskmanager_demo' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  } catch (_) { /* no explicitly configured demo database */ }
  const loopback = ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
  if (process.env.LOCAL_DEMO_LOGIN !== '1' || process.env.NODE_ENV === 'production' || !process.env.LOCAL_DEMO_PASSWORD || !dedicated || !loopback) {
    return next(notFound('Route not found'));
  }
  res.set('Cache-Control','no-store');
  next();
}
router.get('/demo/accounts', localDemo, (req,res) => res.json({accounts}));
router.post('/demo/login', localDemo, (req,res,next) => {
  const email = req.body && req.body.email;
  if (!accounts.some(a=>a.email===email)) return next(badRequest('Choose one of the prepared demo accounts'));
  req.body = {email,password:process.env.LOCAL_DEMO_PASSWORD};
  return login(req,res,next);
});
module.exports = {router};
