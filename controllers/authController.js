const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');

const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);
    const cookieOptions = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 86400000,
        ),
        httpOnly: true,
    };
    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

    res.cookie('jwt', token, cookieOptions);

    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user,
        },
    });
};

exports.signup = catchAsync(async (req, res, next) => {
    const newUser = await User.create(req.body);

    const url = `${req.protocol}://${req.get('host')}/me`;
    await new Email(newUser, url).sendWelcome();

    createSendToken(newUser, 201, res);
});

// User Login
exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return next(new AppError('Please provide an email and password', 400));
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('Incorrect email or password', 401));
    }

    createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
    res.clearCookie('jwt');
    res.status(200).json({ status: 'success' });
};

// Checks if user has access to protected routes
exports.protect = catchAsync(async (req, res, next) => {
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    if (!token) {
        return next(new AppError('Please log in to access this route!', 401));
    }

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
        return next(
            new AppError(
                'The user belonging to this token no longer exists',
                401,
            ),
        );
    }

    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(
            new AppError(
                'User recently changed password. please log in again!',
                401,
            ),
        );
    }
    req.user = currentUser;
    res.locals.user = currentUser;
    next();
});

exports.isLoggedIn = async (req, res, next) => {
    if (req.cookies.jwt) {
        try {
            const decoded = await promisify(jwt.verify)(
                req.cookies.jwt,
                process.env.JWT_SECRET,
            );

            const currentUser = await User.findById(decoded.id);
            if (!currentUser) {
                return next();
            }

            if (currentUser.changedPasswordAfter(decoded.iat)) {
                return next();
            }
            res.locals.user = currentUser;
            return next();
        } catch (err) {
            return next();
        }
    }
    next();
};

exports.restrictTo =
    (...roles) =>
    (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError(
                    'You do not have permission to perfom this action',
                    403,
                ),
            );
        }

        next();
    };

exports.forgotPassword = catchAsync(async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(
            new AppError(
                'There is no user associated with that email address',
                404,
            ),
        );
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetURL = `${req.protocol}://${req.get(
        'host',
    )}/api/v1/users/resetPassword/${resetToken}`;

    try {
        // await sendEmail({
        //     email: user.email,
        //     subject: 'Your password reset token (valid for 10 minutes).',
        //     message,
        // });
        await new Email(user, resetURL).sendPasswordreset();

        res.status(200).json({
            status: 'success',
            message: 'Token sent to email!',
        });
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return next(
            new AppError(
                'There was an error sending the email, please try again later',
                500,
            ),
        );
    }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    // Get user based on token
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });

    // Set new password if token hasn't expired and there is a user
    if (!user) {
        return next(new AppError('Token is invalid or has expired', 400));
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Log the user in

    createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    // Get User from collection
    const user = await User.findById(req.user.id).select('+password');
    // Check if user password is correct
    if (
        !(await user.correctPassword(req.body.passwordCurrent, user.password))
    ) {
        return next(new AppError('Your current password is invalid', 401));
    }
    // Update Password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();
    // Log user back in
    createSendToken(user, 200, res);
});
