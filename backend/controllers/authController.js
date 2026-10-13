const { User, Role, Permission,Seller } = require('../models');
const { generateToken } = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { canViewAllOrders, isOrderViewerRole } = require('../utils/roles');


const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      roleId,
      mobile,
      company,
      phone,
      address
    } = req.body;

    // 1. Validation
    if (!email || !password || !roleId || !company || !phone || !address) {
      return res.status(400).json({
        message: 'Required fields missing'
      });
    }

    // 2. Check existing user
    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      return res.status(400).json({
        message: 'Email already exists'
      });
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      roleId,
      mobile,
      company,
      phone,
      address
    });

    return res.status(201).json({
      message: 'User registered successfully',
      data: {
        id: user.id,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Register Error:', error);

    return res.status(500).json({
      message: 'Internal server error'
    });
  }
};

// const { User } = require('../models');
// const bcrypt = require('bcryptjs');

const updatePassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    // 1. Validation
    if (!userId || !newPassword) {
      return res.status(400).json({
        message: 'userId and newPassword are required'
      });
    }

    // 2. Find user
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // 3. Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 4. Update password directly (IMPORTANT ⚠️)
    await User.update(
      { password: hashedPassword },
      { where: { id: userId } }
    );

    return res.status(200).json({
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Update Password Error:', error);
    return res.status(500).json({
      message: 'Internal server error'
    });
  }
};



// const login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res.status(400).json({ 
//         success: false, 
//         error: 'Email and password are required' 
//       });
//     }

//     console.log('Login attempt for email:', email);

//     // Find user with role
//     const user = await User.findOne({
//       where: { email },
//       include: [{
//         model: Role,
//         as: 'role',
//         attributes: ['id', 'name', 'description', 'isSystem']
//       }]
//     });

//     if (!user) {
//       console.log('User not found:', email);
//       return res.status(401).json({ 
//         success: false, 
//         error: 'Invalid email or password' 
//       });
//     }

//     // Check if user is active
//     if (!user.isActive) {
//       return res.status(401).json({ 
//         success: false, 
//         error: 'Account is deactivated. Please contact administrator.' 
//       });
//     }

//     // Verify password
//     const isMatch = await user.comparePassword(password);
    
//     if (!isMatch) {
//       console.log('Invalid password for user:', email);
//       return res.status(401).json({ 
//         success: false, 
//         error: 'Invalid email or password' 
//       });
//     }

//     // Generate token
//     const token = generateToken(user.id);
    
//     // Update last login
//     await user.update({ lastLogin: new Date() });

//     console.log('Login successful for user:', email);

//     // Get user permissions
//     const permissions = await Permission.findAll({
//       include: [{
//         model: Role,
//         as: 'roles',
//         where: { id: user.roleId },
//         through: { attributes: [] }
//       }],
//       attributes: ['module', 'action']
//     });

//     // Format permissions
//     const formattedPermissions = permissions.reduce((acc, perm) => {
//       const existing = acc.find(p => p.module === perm.module);
//       if (existing) {
//         existing.actions.push(perm.action);
//       } else {
//         acc.push({ module: perm.module, actions: [perm.action] });
//       }
//       return acc;
//     }, []);

//     return res.json({
//       success: true,
//       data: {
//         user: {
//           id: user.id,
//           name: user.name,
//           email: user.email,
//           role: user.role.name,
//           roleId: user.roleId,
//           avatar: user.avatar,
//           permissions: formattedPermissions
//         },
//         token
//       }
//     });

//   } catch (error) {
//     console.error('Login error:', error);
//     return res.status(500).json({ 
//       success: false, 
//       error: 'Server error during login' 
//     });
//   }
// };


/*
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    console.log('Login attempt for email:', email);

    let user = await User.findOne({
      where: { email },
      include: [{
        model: Role,
        as: 'role',
        attributes: ['id', 'name', 'description', 'isSystem']
      }]
    });

    let isSeller = false;

    if (!user) {
      const seller = await Seller.findOne({
        where: { email },
        include: [{
          model: Role,
          as: 'role',
          attributes: ['id', 'name']
        }]
      });

      if (!seller) {
        console.log('User/Seller not found:', email);
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      user = seller;
      isSeller = true;
    }

    if (!isSeller && !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated. Please contact administrator.'
      });
    }

    if (isSeller && user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Seller account is not active'
      });
    }
    console.log(user,"passwordpasswordpasswordpassword")

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      console.log('Invalid password for:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const token = generateToken(user.id);

    if (!isSeller) {
      await user.update({ lastLogin: new Date() });
    }

    console.log('Login successful for:', email);

    let formattedPermissions = [];

    if (!isSeller) {
      const permissions = await Permission.findAll({
        include: [{
          model: Role,
          as: 'roles',
          where: { id: user.roleId },
          through: { attributes: [] }
        }],
        attributes: ['module', 'action']
      });

      formattedPermissions = permissions.reduce((acc, perm) => {
        const existing = acc.find(p => p.module === perm.module);
        if (existing) {
          existing.actions.push(perm.action);
        } else {
          acc.push({ module: perm.module, actions: [perm.action] });
        }
        return acc;
      }, []);
    }

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role?.name || 'seller',
          roleId: user.roleId,
          avatar: user.avatar || 'S',
          isSeller,
          permissions: formattedPermissions
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error during login'
    });
  }
};



const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    console.log('Login attempt for email:', email);

    let user = await User.findOne({
      where: { email },
      include: [{
        model: Role,
        as: 'role',
        attributes: ['id', 'name', 'description', 'isSystem']
      }]
    });

    let isSeller = false;

    if (!user) {
      const seller = await Seller.findOne({
        where: { email },
        include: [{
          model: Role,
          as: 'role',
          attributes: ['id', 'name']
        }]
      });

      if (!seller) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      user = seller;
      isSeller = true;
    }

    if (!isSeller && !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated. Please contact administrator.'
      });
    }

    if (isSeller && user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Seller account is not active'
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const token = generateToken(user.id);

    if (!isSeller) {
      await user.update({ lastLogin: new Date() });
    }

    console.log('Login successful for:', email);

    let formattedPermissions = [];

    if (user.roleId) {
      const roleWithPermissions = await Role.findByPk(user.roleId, {
        include: [{
          model: Permission,
          as: 'permissions',
          attributes: ['module', 'action'],
          through: { attributes: [] }
        }]
      });

      const permissions = roleWithPermissions?.permissions || [];

      const uniquePermissions = [];
      const seen = new Set();

      for (const perm of permissions) {
        const key = `${perm.module}-${perm.action}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniquePermissions.push(perm);
        }
      }

      formattedPermissions = uniquePermissions.reduce((acc, perm) => {
        const existing = acc.find(p => p.module === perm.module);
        if (existing) {
          existing.actions.push(perm.action);
        } else {
          acc.push({
            module: perm.module,
            actions: [perm.action]
          });
        }
        return acc;
      }, []);
    }

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role?.name || 'seller',
          roleId: user.roleId,
          avatar: user.avatar || user.name?.charAt(0)?.toUpperCase() || 'U',
          isSeller,
          permissions: formattedPermissions
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error during login'
    });
  }
};
*/



const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    console.log('Login attempt for email:', email);

    // 2. Find user (single model)
    const user = await User.findOne({
      where: { email },
      include: [{
        model: Role,
        as: 'role',
        attributes: ['id', 'name', 'description', 'isSystem']
      }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // 3. Account checks (User + Seller logic merged)
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated. Please contact administrator.'
      });
    }

    if (user.status && user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Account is not active'
      });
    }

    // 4. Password check
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // 5. Generate token
    const token = generateToken(user.id);

    // 6. Update last login
    await user.update({ lastLogin: new Date() });

    console.log('Login successful for:', email);

    // 7. Permissions
    let formattedPermissions = [];

    if (user.roleId) {
      const roleWithPermissions = await Role.findByPk(user.roleId, {
        include: [{
          model: Permission,
          as: 'permissions',
          attributes: ['module', 'action'],
          through: { attributes: [] }
        }]
      });

      const permissions = roleWithPermissions?.permissions || [];

      const uniquePermissions = [];
      const seen = new Set();

      for (const perm of permissions) {
        const key = `${perm.module}-${perm.action}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniquePermissions.push(perm);
        }
      }

      formattedPermissions = uniquePermissions.reduce((acc, perm) => {
        const existing = acc.find(p => p.module === perm.module);
        if (existing) {
          existing.actions.push(perm.action);
        } else {
          acc.push({
            module: perm.module,
            actions: [perm.action]
          });
        }
        return acc;
      }, []);
    }

    // 8. Response
    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role?.name || null,
          roleId: user.roleId,
          avatar: user.avatar || user.name?.charAt(0)?.toUpperCase() || 'U',
          avatarUrl: user.avatarUrl || '',
          isSeller: isOrderViewerRole(user) ? false : (user.company ? true : false),
          canViewAllOrders: canViewAllOrders(user),
          walletBalance: Number(user.walletBalance) || 0,
          permissions: formattedPermissions
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      success: false,
      error: 'Server error during login'
    });
  }
};



/**
 * Impersonate a seller account ("Login as Seller").
 * Only admin / super admin can call this. Issues a real token for the target
 * seller so the admin is fully logged into that account until they exit.
 */
const impersonate = async (req, res) => {
  try {
    const roleName = String(req.user?.role?.name || req.user?.role || '').toLowerCase();
    const isAdmin = roleName === 'admin' || roleName === 'super admin';
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Only admin accounts can access a seller account'
      });
    }

    const targetId = req.params.id;
    if (!targetId) {
      return res.status(400).json({ success: false, error: 'Seller id is required' });
    }

    const target = await User.findByPk(targetId, {
      include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }]
    });

    if (!target) {
      return res.status(404).json({ success: false, error: 'Seller not found' });
    }

    // Never allow impersonating another admin account.
    const targetRole = String(target.role?.name || '').toLowerCase();
    if (targetRole === 'admin' || targetRole === 'super admin') {
      return res.status(403).json({
        success: false,
        error: 'Cannot access an admin account this way'
      });
    }

    const token = generateToken(target.id);

    await target.update({ lastLogin: new Date() });

    // Same permissions payload the login endpoint returns.
    let formattedPermissions = [];
    if (target.roleId) {
      const roleWithPermissions = await Role.findByPk(target.roleId, {
        include: [{
          model: Permission,
          as: 'permissions',
          attributes: ['module', 'action'],
          through: { attributes: [] }
        }]
      });

      const permissions = roleWithPermissions?.permissions || [];
      const seen = new Set();
      const uniquePermissions = [];
      for (const perm of permissions) {
        const key = `${perm.module}-${perm.action}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniquePermissions.push(perm);
        }
      }

      formattedPermissions = uniquePermissions.reduce((acc, perm) => {
        const existing = acc.find(p => p.module === perm.module);
        if (existing) {
          existing.actions.push(perm.action);
        } else {
          acc.push({ module: perm.module, actions: [perm.action] });
        }
        return acc;
      }, []);
    }

    console.log(
      `Impersonation: ${req.user.name} (${req.user.email}) accessed seller ${target.email}`
    );

    return res.json({
      success: true,
      data: {
        user: {
          id: target.id,
          name: target.name,
          email: target.email,
          role: target.role?.name || 'seller',
          roleId: target.roleId,
          avatar: target.avatar || target.name?.charAt(0)?.toUpperCase() || 'U',
          isSeller: isOrderViewerRole(target) ? false : (target.company ? true : false),
          canViewAllOrders: canViewAllOrders(target),
          walletBalance: Number(target.walletBalance) || 0,
          permissions: formattedPermissions
        },
        token,
        impersonation: {
          by: req.user.id,
          byName: req.user.name,
          startedAt: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Impersonate error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while switching account'
    });
  }
};


const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
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

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Format permissions (role may be missing for legacy rows)
    const rolePerms = user.role?.permissions || [];
    const permissions = rolePerms.reduce((acc, perm) => {
      const existing = acc.find(p => p.module === perm.module);
      if (existing) {
        existing.actions.push(perm.action);
      } else {
        acc.push({ module: perm.module, actions: [perm.action] });
      }
      return acc;
    }, []);

    return res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role?.name || '',
        roleId: user.roleId,
        avatar: user.avatar,
        avatarUrl: user.avatarUrl || '',
        canViewAllOrders: canViewAllOrders(user),
        walletBalance: Number(user.walletBalance) || 0,
        permissions
      }
    });

  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

const logout = async (req, res) => {
  try {
    // In a real app, you might blacklist the token
    return res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error during logout' 
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      include: [{
        model: Role,
        as: 'role',
        attributes: ['id', 'name']
      }],
      order: [['createdAt', 'DESC']]
    });

    return res.json({
      success: true,
      data: users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile || '',
        role: user.role.name,
        roleId: user.roleId,
        avatar: user.avatar,
        avatarUrl: user.avatarUrl || '',
        isActive: user.isActive,
        status: user.isActive ? 'active' : 'inactive',
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }))
    });

  } catch (error) {
    console.error('Get all users error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

/* ============================================================================
 * Self-service profile endpoints (used by the Profile page)
 * ==========================================================================*/

/** Fields a user is allowed to change on their own profile */
const PROFILE_EDITABLE_FIELDS = [
  'name',
  'email',
  'mobile',
  'phone',
  'company',
  'gst',
  'address',
  'city',
  'state',
  'pincode',
  'avatar',
  'avatarUrl'
];

/** Group a flat permission list into [{ module, actions }] */
const groupPermissions = (permissions = []) =>
  permissions.reduce((acc, perm) => {
    const existing = acc.find((p) => p.module === perm.module);

    if (existing) {
      if (!existing.actions.includes(perm.action)) existing.actions.push(perm.action);
    } else {
      acc.push({ module: perm.module, actions: [perm.action] });
    }

    return acc;
  }, []);

/** Normalize a user (+role/permissions) into the profile payload */
const formatProfile = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  mobile: user.mobile || '',
  phone: user.phone || '',
  company: user.company || '',
  gst: user.gst || '',
  address: user.address || '',
  city: user.city || '',
  state: user.state || '',
  pincode: user.pincode || '',
  avatar: user.avatar || user.name?.charAt(0)?.toUpperCase() || 'U',
  avatarUrl: user.avatarUrl || '',
  isActive: user.isActive,
  status: user.status,
  kycStatus: user.kycStatus,
  riskCategory: user.riskCategory,
  subscription: user.subscription,
  walletBalance: user.walletBalance || 0,
  totalOrders: user.totalOrders || 0,
  performanceScore: user.performanceScore || 0,
  rtoRate: user.rtoRate || 0,
  revenue: user.revenue || '₹0',
  joinedAt: user.joinedAt || user.createdAt,
  createdAt: user.createdAt,
  lastLogin: user.lastLogin,
  role: user.role
    ? { id: user.role.id, name: user.role.name, description: user.role.description }
    : null,
  roleId: user.roleId,
  permissions: groupPermissions(user.role?.permissions || []),
  canViewAllOrders: canViewAllOrders(user)
});

/** Shared include used by both profile reads */
const profileInclude = {
  model: Role,
  as: 'role',
  attributes: ['id', 'name', 'description'],
  include: [{
    model: Permission,
    as: 'permissions',
    through: { attributes: [] },
    attributes: ['id', 'module', 'action']
  }]
};

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [profileInclude]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    return res.json({
      success: true,
      data: formatProfile(user)
    });

  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const payload = {};

    for (const field of PROFILE_EDITABLE_FIELDS) {
      if (req.body[field] === undefined) continue;
      const value = req.body[field];
      payload[field] = typeof value === 'string' ? value.trim() : value;
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No profile fields provided'
      });
    }

    // Seller accounts may only update their profile image — every other field
    // is managed by admins (the Profile page mirrors this rule).
    const requesterRole = user.roleId ? await Role.findByPk(user.roleId) : null;
    if (String(requesterRole?.name || '').toLowerCase() === 'seller') {
      const disallowedFields = Object.keys(payload).filter((field) => field !== 'avatar' && field !== 'avatarUrl');
      if (disallowedFields.length > 0) {
        return res.status(403).json({
          success: false,
          error: 'Seller accounts can only update their profile image. Contact an admin to change other details.'
        });
      }
    }

    if (payload.name !== undefined && payload.name.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Name must be at least 2 characters'
      });
    }

    if (payload.company !== undefined && payload.company === '') {
      return res.status(400).json({
        success: false,
        error: 'Company name is required'
      });
    }

    if (payload.email !== undefined) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
        return res.status(400).json({
          success: false,
          error: 'A valid email is required'
        });
      }

      const emailOwner = await User.findOne({ where: { email: payload.email } });

      if (emailOwner && String(emailOwner.id) !== String(user.id)) {
        return res.status(409).json({
          success: false,
          error: 'Email is already in use by another account'
        });
      }
    }

    for (const phoneField of ['phone', 'mobile']) {
      const value = payload[phoneField];
      if (value !== undefined && value !== '' && !/^[0-9+\-\s()]{6,20}$/.test(value)) {
        return res.status(400).json({
          success: false,
          error: `${phoneField === 'mobile' ? 'Mobile' : 'Phone'} number is not valid`
        });
      }
    }

    if (payload.pincode !== undefined && payload.pincode !== '' && !/^[0-9]{4,10}$/.test(payload.pincode)) {
      return res.status(400).json({
        success: false,
        error: 'Pincode must be 4 to 10 digits'
      });
    }

    if (payload.avatar !== undefined) {
      payload.avatar = (payload.avatar || '').slice(0, 3).toUpperCase()
        || (payload.name || user.name || 'U').charAt(0).toUpperCase();
    }

    if (payload.avatarUrl !== undefined) {
      const avatarUrl = String(payload.avatarUrl || '').trim();
      if (avatarUrl.length > 500) {
        return res.status(400).json({
          success: false,
          error: 'Profile image reference is too long'
        });
      }
      payload.avatarUrl = avatarUrl;
    }

    // Profile photo: accept either a bare filename ("1728-456.jpg") or a full
    // URL ("https://.../uploads/1728-456.jpg"). The frontend sends bare
    // filenames while header/avatar resolvers handle both shapes.
    if (payload.avatarUrl !== undefined && payload.avatarUrl !== '') {
      const raw = String(payload.avatarUrl);
      const bare = raw.split('?')[0].split('#')[0].split('/').pop() || '';
      if (!bare) {
        return res.status(400).json({
          success: false,
          error: 'Profile image reference is not valid'
        });
      }
      payload.avatarUrl = bare;
    }

    await user.update(payload);

    const updated = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [profileInclude]
    });

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: formatProfile(updated)
    });

  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

/**
 * Resolve the password-bearing record for the authenticated account.
 *
 * Lookup is scoped by the account's EMAIL first (the same unique identifier
 * login uses): `user_sellers` table first, then the legacy `sellers` table —
 * so a password is only ever checked against THIS user's own row and never
 * another account that might exist (identical passwords are common). When
 * both id and email are known, the row must satisfy BOTH, otherwise it is
 * rejected. Falls back to the JWT id when no email-based match is found.
 */
const findPasswordOwner = async (authUser) => {
  const id = authUser?.id;
  const email = normalizeEmail(authUser?.email);

  const belongsToAuth = (record) => {
    if (!record) return false;
    const idOk = id === undefined || id === null || String(record.id) === String(id);
    const emailOk = !email || normalizeEmail(record.email) === email;
    return idOk && emailOk;
  };

  // 1) Email-first lookup — same table order as login (User, then Seller).
  if (email) {
    try {
      const byEmail = await User.findOne({ where: { email } });
      if (belongsToAuth(byEmail)) return byEmail;
    } catch (_) { /* fall through to next lookup */ }

    try {
      if (Seller) {
        const sellerByEmail = await Seller.findOne({ where: { email } });
        if (belongsToAuth(sellerByEmail)) return sellerByEmail;
      }
    } catch (_) { /* fall through to id lookup */ }
  }

  // 2) Id fallback (numeric → user_sellers, uuid → sellers).
  if (id !== undefined && id !== null && String(id) !== '') {
    const rawId = String(id);
    if (/^\d+$/.test(rawId)) {
      try {
        const user = await User.findByPk(Number(rawId));
        if (belongsToAuth(user)) return user;
      } catch (_) { /* fall through */ }
    }
    try {
      if (Seller) {
        const seller = await Seller.findByPk(rawId);
        if (belongsToAuth(seller)) return seller;
      }
    } catch (_) { /* ignore */ }
  }

  return null;
};

/**
 * Verify a plaintext candidate against the value stored in the DB.
 *
 * Stored passwords are bcrypt HASHES ($2a$/$2b$…) — they are one-way: they
 * cannot be decrypted. bcrypt.compare() re-hashes the candidate with the salt
 * embedded in the stored hash and compares the results, which is the only
 * correct way to match a password.
 * Rows saved without hashing (legacy data that bypassed the model hooks) fall
 * back to a constant-time comparison so we never leak via response timing.
 */
const BCRYPT_HASH_RE = /^\$2[abxy]?\$\d\d\$[A-Za-z0-9./]{53}$/;
const passwordMatches = async (stored, candidate) => {
  const hash = String(stored || '');
  const plain = String(candidate ?? '');
  if (!hash || !plain) return false;

  if (BCRYPT_HASH_RE.test(hash)) {
    try {
      return await bcrypt.compare(plain, hash);
    } catch (_) {
      return false;
    }
  }

  const a = Buffer.from(plain, 'utf8');
  const b = Buffer.from(hash, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/**
 * Shared guard for verify/change: an optional `email` from the client must
 * belong to the logged-in session — a request can never target another user.
 * Returns false (and sends the 400 response) on mismatch.
 */
const assertOwnEmail = (req, res) => {
  const requested = req.body?.email;
  if (requested === undefined || requested === null || String(requested).trim() === '') {
    return true;
  }
  if (normalizeEmail(requested) !== normalizeEmail(req.user?.email)) {
    res.status(400).json({
      success: false,
      error: 'Email does not match the logged-in account'
    });
    return false;
  }
  return true;
};

const changeMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Password checks stay scoped to the logged-in account's own email —
    // never another user's record, even when passwords are identical.
    if (!assertOwnEmail(req, res)) return;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters'
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        error: 'New password must be different from the current password'
      });
    }

    // Email-scoped lookup: only THIS account's row (session email + token id
    // must both match) is ever used for the password check.
    const user = await findPasswordOwner(req.user);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Match against the stored bcrypt hash (one-way — never decrypted).
    const isMatch = await passwordMatches(user.password, currentPassword);

    if (!isMatch) {
      // NOTE: intentionally 400 (not 401) — the frontend axios interceptor treats
      // every 401 as "session expired" and wipes the token + redirects to /login.
      // A wrong current-password is a form error, not an expired session.
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // beforeUpdate hook re-hashes the password
    await user.update({ password: newPassword });

    return res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/** Verify the current password without changing anything (live check under the field) */
const verifyMyPassword = async (req, res) => {
  try {
    const { currentPassword } = req.body;

    // Verify only against THIS logged-in account's record (email-scoped).
    if (!assertOwnEmail(req, res)) return;

    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password is required'
      });
    }

    // Email-scoped lookup: resolve the row by the session email first
    // (user_sellers → sellers), verified against the token id.
    const user = await findPasswordOwner(req.user);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // bcrypt.compare against the stored hash — plain text is never stored or
    // compared directly, and the hash can never be decrypted.
    const isMatch = await passwordMatches(user.password, currentPassword);

    // Same 401-avoidance as above: wrong password is a form error (400), not a logout.
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    return res.json({
      success: true,
      message: 'Current password is correct'
    });

  } catch (error) {
    console.error('Verify password error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

module.exports = {
  login,
  impersonate,
  getCurrentUser,
  logout,
  getAllUsers,
  updatePassword,
  register,
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
  verifyMyPassword
};
