/**
 * @swagger
 * tags:
 *   name: Forms
 *   description: Form management
 */

const express = require("express");
const {
  getForms,
  getForm,
  createForm,
  updateForm,
  deleteForm,
  publishForm,
  archiveForm,
  uploadFile,
} = require("../controllers/forms.controller");

const {
  getFormAnalytics,
  getFieldAnalytics,
  getVisitAnalytics,
  exportResponses,
} = require("../controllers/analytics.controller");

const {
  getResponses,
  createResponse,
} = require("../controllers/responses.controller");

const router = express.Router();

const { protect, authorize } = require("../middleware/auth");
const { optionalAuth } = require("../middleware/optionalAuth");

/**
 * @swagger
 * /forms/{id}:
 *   get:
 *     summary: Get a single form (public endpoint)
 *     tags: [Forms]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Form ID
 *     responses:
 *       200:
 *         description: Form data
 *       404:
 *         description: Form not found
 */
router.get("/:id", optionalAuth, getForm);

// Apply authentication middleware to all other routes
router.use(protect);

/**
 * @swagger
 * /forms:
 *   get:
 *     summary: Get all forms
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, PUBLISHED, ARCHIVED]
 *         description: Filter forms by status
 *     responses:
 *       200:
 *         description: List of forms
 *       401:
 *         description: Not authorized
 */
router
  .route("/")
  .get(getForms)
  /**
   * @swagger
   * /forms:
   *   post:
   *     summary: Create a new form
   *     tags: [Forms]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - title
   *             properties:
   *               title:
   *                 type: string
   *               description:
   *                 type: string
   *               fields:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     fieldId:
   *                       type: string
   *                     type:
   *                       type: string
   *                       enum: [text, number, multiSelect, radio, dropdown, fileUpload, longText]
   *                     label:
   *                       type: string
   *                     placeholder:
   *                       type: string
   *                     required:
   *                       type: boolean
   *                     options:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           label:
   *                             type: string
   *                           value:
   *                             type: string
   *                     validations:
   *                       type: object
   *                     order:
   *                       type: integer
   *               settings:
   *                 type: object
   *                 properties:
   *                   theme:
   *                     type: object
   *                     properties:
   *                       primaryColor:
   *                         type: string
   *                       backgroundColor:
   *                         type: string
   *                       fontFamily:
   *                         type: string
   *                   progressBar:
   *                     type: object
   *                     properties:
   *                       show:
   *                         type: boolean
   *                       type:
   *                         type: string
   *                         enum: [percentage, dots, bar]
   *                   submitButton:
   *                     type: object
   *                     properties:
   *                       text:
   *                         type: string
   *                   successMessage:
   *                     type: string
   *     responses:
   *       201:
   *         description: Form created
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       description: The form ID
   *                     form_id:
   *                       type: string
   *                       description: The form ID (same as id)
   *                     title:
   *                       type: string
   *                     description:
   *                       type: string
   *                     slug:
   *                       type: string
   *                     public_url:
   *                       type: string
   *                       description: The public URL for accessing the form
   *                     status:
   *                       type: string
   *                       enum: [DRAFT, PUBLISHED, ARCHIVED]
   *                     userId:
   *                       type: string
   *                     createdAt:
   *                       type: string
   *                       format: date-time
   *                     updatedAt:
   *                       type: string
   *                       format: date-time
   *       400:
   *         description: Invalid input
   *       401:
   *         description: Not authorized
   */
  .post(createForm);

/**
 * @swagger
 * /forms/{id}:
 *   put:
 *     summary: Update a form
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Form ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *               settings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Form updated
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Form not found
 */
router.route("/:id").put(updateForm).delete(deleteForm);

/**
 * @swagger
 * /forms/{id}/publish:
 *   put:
 *     summary: Publish a form
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Form ID
 *     responses:
 *       200:
 *         description: Form published
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Form not found
 */
router.route("/:id/publish").put(publishForm);

/**
 * @swagger
 * /forms/{id}/archive:
 *   put:
 *     summary: Archive a form
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Form ID
 *     responses:
 *       200:
 *         description: Form archived
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Form not found
 */
router.route("/:id/archive").put(archiveForm);

/**
 * @swagger
 * /forms/{id}/upload:
 *   post:
 *     summary: Upload a file for a form field
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Form ID
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Form not found
 */
router.route("/:id/upload").post(uploadFile);

/**
 * @swagger
 * /forms/{formId}/analytics:
 *   get:
 *     summary: Get form analytics
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: formId
 *         schema:
 *           type: string
 *         required: true
 *         description: Form ID
 *     responses:
 *       200:
 *         description: Form analytics data
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Form not found
 */
router.route("/:formId/analytics").get(getFormAnalytics);

/**
 * @swagger
 * /forms/{formId}/analytics/fields:
 *   get:
 *     summary: Get field analytics
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: formId
 *         schema:
 *           type: string
 *         required: true
 *         description: Form ID
 *     responses:
 *       200:
 *         description: Field analytics data
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Form not found
 */
router.route("/:formId/analytics/fields").get(getFieldAnalytics);

/**
 * @swagger
 * /forms/{formId}/analytics/visits:
 *   get:
 *     summary: Get visit analytics
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: formId
 *         schema:
 *           type: string
 *         required: true
 *         description: Form ID
 *     responses:
 *       200:
 *         description: Visit analytics data
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Form not found
 */
router.route("/:formId/analytics/visits").get(getVisitAnalytics);

/**
 * @swagger
 * /forms/{formId}/export:
 *   get:
 *     summary: Export form responses
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: formId
 *         schema:
 *           type: string
 *         required: true
 *         description: Form ID
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *         description: Export format (default is json)
 *     responses:
 *       200:
 *         description: Exported data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *           text/csv:
 *             schema:
 *               type: string
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Form not found
 */
router.route("/:formId/export").get(exportResponses);

/**
 * @swagger
 * /forms/{formId}/responses:
 *   get:
 *     summary: Get all responses for a form
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: formId
 *         schema:
 *           type: string
 *         required: true
 *         description: Form ID
 *     responses:
 *       200:
 *         description: List of responses
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Form not found
 */
router.route("/:formId/responses").get(getResponses);

/**
 * @swagger
 * /forms/{formId}/responses:
 *   post:
 *     summary: Submit a form response (public endpoint)
 *     tags: [Forms]
 *     parameters:
 *       - in: path
 *         name: formId
 *         schema:
 *           type: string
 *         required: true
 *         description: Form ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *               visitId:
 *                 type: string
 *               isComplete:
 *                 type: boolean
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               answers:
 *                 type: string
 *               visitId:
 *                 type: string
 *               isComplete:
 *                 type: boolean
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Response submitted
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Form not accepting responses
 *       404:
 *         description: Form not found
 */
router.post("/:formId/responses", createResponse);

module.exports = router;