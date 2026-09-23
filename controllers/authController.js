const authService = require('../services/authService');


class AuthController {
  constructor(service = authService) {
    this.authService = service;
  }


  register = async (req, res, next) => {
    try {
      const { name, email, password } = req.body;
      const result = await this.authService.register({ name, email, password });
      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  login = async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const result = await this.authService.login({ email, password });
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req, res, next) => {
    try {
      const { refreshToken } = req.body;
      const result = await this.authService.refreshToken(refreshToken);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  profile = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const result = await this.authService.getProfile(userId);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  logout = async (req, res) => {
    // JWT is stateless; client removes stored access and refresh tokens.
    return res.status(200).json({
      message: 'Logout successful',
    });
  };

  adminOnly = async (req, res) => {
    return res.status(200).json({
      message: 'Admin access granted',
    });
  };
}

module.exports = new AuthController();
module.exports.AuthController = AuthController;
