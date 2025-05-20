/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management
 */

const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/users.controller');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

/**
 * Apply middleware to all routes
 */
router.use(protect);
router.use(authorize('ADMIN'));

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 */
router.route('/')
  .get(getUsers)
  /**
   * @swagger
   * /users:
   *   post:
   *     summary: Create a user
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - email
   *               - password
   *             properties:
   *               name:
   *                 type: string
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *               role:
   *                 type: string
   *                 enum: [USER, ADMIN]
   *     responses:
   *       201:
   *         description: User created
   *       400:
   *         description: Invalid input
   *       401:
   *         description: Not authorized
   *       403:
   *         description: Forbidden
   */
  .post(createUser);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a single user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: User data
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.route('/:id')
  .get(getUser)
  /**
   * @swagger
   * /users/{id}:
   *   put:
   *     summary: Update a user
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: string
   *         required: true
   *         description: User ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *               role:
   *                 type: string
   *                 enum: [USER, ADMIN]
   *     responses:
   *       200:
   *         description: User updated
   *       400:
   *         description: Invalid input
   *       401:
   *         description: Not authorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: User not found
   */
  .put(updateUser)
  /**
   * @swagger
   * /users/{id}:
   *   delete:
   *     summary: Delete a user
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: string
   *         required: true
   *         description: User ID
   *     responses:
   *       200:
   *         description: User deleted
   *       401:
   *         description: Not authorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: User not found
   */
  .delete(deleteUser);

module.exports = router;