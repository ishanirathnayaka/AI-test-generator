const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  AuthController,
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation
} = require('../controllers/authController');

// Public routes (no authentication required)
router.post('/register', registerValidation, AuthController.register);
router.post('/login', loginValidation, AuthController.login);

// Protected routes (authentication required)
router.use(authMiddleware);

router.get('/me', AuthController.getProfile);
router.put('/profile', updateProfileValidation, AuthController.updateProfile);
router.put('/password', changePasswordValidation, AuthController.changePassword);
router.post('/refresh', AuthController.refreshToken);
router.post('/logout', AuthController.logout);

module.exports = router;