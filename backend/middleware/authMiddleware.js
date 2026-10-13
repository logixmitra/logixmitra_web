const jwt = require('jsonwebtoken');
const { User, Role, Permission } = require('../models');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      if (!token || token === 'null' || token === 'undefined') {
        return res.status(401).json({ 
          success: false, 
          error: 'Not authorized, no token' 
        });
      }

      console.log('Verifying token:', token.substring(0, 20) + '...');
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] },
        include: [{
          model: Role,
          as: 'role',
          include: [{
            model: Permission,
            as: 'permissions',
            through: { attributes: [] },
            attributes: ['id', 'module', 'action']
          }]
        }]
      });

      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          error: 'User not found' 
        });
      }

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid token' 
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          error: 'Token expired' 
        });
      }
      
      return res.status(401).json({ 
        success: false, 
        error: 'Not authorized' 
      });
    }
  } else {
    return res.status(401).json({ 
      success: false, 
      error: 'Not authorized, no token' 
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authorized' 
      });
    }

    if (!roles.includes(req.user.role.name)) {
      return res.status(403).json({ 
        success: false, 
        error: `Role ${req.user.role.name} is not authorized to access this resource` 
      });
    }

    next();
  };
};

const checkPermission = (module, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authorized' 
      });
    }

    // Admin has all permissions
    if (req.user.role.name === 'admin') {
      return next();
    }

    const hasPermission = req.user.role.permissions.some(
      p => p.module === module && p.action === action
    );

    if (!hasPermission) {
      return res.status(403).json({ 
        success: false, 
        error: `You don't have permission to ${action} ${module}` 
      });
    }

    next();
  };
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

/** Sets req.user when a valid token is present; never blocks the request. */
const attachUserIfToken = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return next();
    const token = header.split(' ')[1];
    if (!token || token === 'null' || token === 'undefined') return next();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
    });
  } catch (_) {
    // leave req.user unset
  }
  next();
};

module.exports = {
  protect,
  authorize,
  checkPermission,
  generateToken,
  attachUserIfToken,
};