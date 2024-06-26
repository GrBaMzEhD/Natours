const express = require('express');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

router.use(viewsController.alerts)

router.get('/me', authController.protect, viewsController.getAccount);
router.get(
    '/my-tours',
    authController.protect,
    bookingController.hasUserBookedAny,
    viewsController.getMyTours,
);
router.post(
    '/submit-user-data',
    authController.protect,
    viewsController.updateUserData,
);

router.use(authController.isLoggedIn);

router.get(
    '/',
    // bookingController.createBookingCheckout,
    viewsController.getOverview,
);
router.get('/tour/:slug', viewsController.getTour);
router.get('/login', viewsController.getLoginForm);
router.get('/signup', viewsController.getSignupForm);
module.exports = router;
