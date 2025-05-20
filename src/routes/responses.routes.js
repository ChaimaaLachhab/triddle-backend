/**
 * @swagger
 * tags:
 *   name: Responses
 *   description: Form responses management
 */

const express = require('express');
const {
  getResponse,
  deleteResponse
} = require('../controllers/responses.controller');

const router = express.Router();

const { protect } = require('../middleware/auth');

// Protected routes
router.use(protect);

/**
 * @swagger
 * /responses/{id}:
 *   get:
 *     summary: Get a single response
 *     tags: [Responses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Response ID
 *     responses:
 *       200:
 *         description: Response data
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Response not found
 */
router.route('/:id')
  .get(getResponse)
  /**
   * @swagger
   * /responses/{id}:
   *   delete:
   *     summary: Delete a response
   *     tags: [Responses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: string
   *         required: true
   *         description: Response ID
   *     responses:
   *       200:
   *         description: Response deleted
   *       401:
   *         description: Not authorized
   *       403:
   *         description: Forbidden
   *       404:
   *         description: Response not found
   */
  .delete(deleteResponse);

module.exports = router;