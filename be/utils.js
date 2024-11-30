import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from './models/userModel.js';

export const generateKeyPair = () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  return { publicKey, privateKey };
};

export const generateToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    user.privateKey,
    {
      algorithm: 'RS256',
      expiresIn: '60d',
    }
  );
};

export const isAuth = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (authorization) {
    const token = authorization.slice(7, authorization.length); // Bearer XXXXXX
    try {
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded) throw new Error('Invalid token');
      
      const user = await User.findById(decoded.payload._id);
      if (!user) throw new Error('User not found');

      jwt.verify(token, user.publicKey, { algorithms: ['RS256'] }, (err, decode) => {
        if (err) {
          res.status(401).send({ message: 'Invalid Token' });
        } else {
          req.user = decode;
          next();
        }
      });
    } catch (error) {
      res.status(401).send({ message: 'Invalid Token' });
    }
  } else {
    res.status(401).send({ message: 'No Token' });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 2) {
    next();
  } else {
    res.status(401).send({ message: 'Invalid Admin Token' });
  }
};

export const isGiaoVu = (req, res, next) => {
  if (req.user && (req.user.role === 1 || req.user.role === 2)) {
    next();
  } else {
    res.status(401).send({ message: 'Unauthorized: Requires Giao Vu or Admin role' });
  }
};

export const isToTruong = (req, res, next) => {
  if (req.user && (req.user.role === 0)) {
    next();
  } else {
    res.status(401).send({ message: 'Unauthorized: Requires To Truong role' });
  }
};