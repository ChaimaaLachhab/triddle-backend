const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../config/db');
const { getPublicFormUrl } = require('../utils/url');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/fileUpload');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../utils/asyncHandler');
const slugify = require('slugify');
const path = require('path');

/**
 * @desc    Get all forms
 * @route   GET /api/v1/forms
 * @access  Private
 */
exports.getForms = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === 'ADMIN';

  let where = {};

  if (!isAdmin) {
    where.userId = userId;
  } else {
    where.OR = [
      { userId },
      { status: 'PUBLISHED' }
    ];
  }

  if (req.query.status) {
    where.status = req.query.status;
  }

  const forms = await prisma.form.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });

  const formIds = forms.map(f => f.id);

  let responsesMap = {};
  let responsesTodayMap = {};

  if (formIds.length <= 50) {
    const now = new Date();
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));
    const endOfToday = new Date(now.setHours(23, 59, 59, 999));

    const [responsesCounts, responsesTodayCounts] = await Promise.all([
      prisma.response.groupBy({
        by: ['formId'],
        where: { formId: { in: formIds } },
        _count: true
      }),
      prisma.response.groupBy({
        by: ['formId'],
        where: {
          formId: { in: formIds },
          createdAt: {
            gte: startOfToday,
            lte: endOfToday
          }
        },
        _count: true
      })
    ]);

    responsesMap = Object.fromEntries(
      responsesCounts.map(rc => [rc.formId, rc._count])
    );
    responsesTodayMap = Object.fromEntries(
      responsesTodayCounts.map(rc => [rc.formId, rc._count])
    );
  } else {
    console.warn(`Too many forms (${formIds.length}), skipping live response counts`);
  }

  res.status(200).json({
    success: true,
    count: forms.length,
    data: forms.map(form => ({
      ...form,
      public_url: form.status === 'PUBLISHED' 
    ? getPublicFormUrl(req, form.slug, form.id)
    : null,
      responses: responsesMap[form.id] ?? null,
      responsesToday: responsesTodayMap[form.id] ?? null
    }))
  });
});

/**
 * @desc    Get single form
 * @route   GET /api/v1/forms/:id
 * @access  Private/Public (depending on form settings)
 */
exports.getForm = asyncHandler(async (req, res, next) => {
  const form = await prisma.form.findUnique({
    where: { id: req.params.id }
  });

  if (!form) {
    return next(
      new ErrorResponse(`Form not found with id of ${req.params.id}`, 404)
    );
  }

  const isAuthenticated = !!req.user;
  const isOwner = isAuthenticated && form.userId === req.user.id;
  const isAdmin = isAuthenticated && req.user.role === 'ADMIN';

  if (!isAuthenticated) {
    // Guest access - only if published
    if (form.status !== 'PUBLISHED') {
      return next(
        new ErrorResponse(
          `This form is not currently available to the public`,
          403
        )
      );
    }
  } else {
    // Authenticated user - must be owner or admin
    if (!isOwner && !isAdmin && form.status !== 'PUBLISHED') {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to access this form`,
          403
        )
      );
    }
  }

  res.status(200).json({
    success: true,
    data: {
      ...form,
      public_url: form.status === 'PUBLISHED'
        ? getPublicFormUrl(req, form.slug, form.id)
        : null
    }
  });
});


/**
 * @desc    Create new form
 * @route   POST /api/v1/forms
 * @access  Private
 */
exports.createForm = asyncHandler(async (req, res, next) => {
  // Generate slug from title
  const baseSlug = slugify(req.body.title || 'untitled-form', { lower: true });
  const slug = `${baseSlug}-${uuidv4().slice(0, 8)}`;

  // Create form with user ID
  const form = await prisma.form.create({
    data: {
      ...req.body,
      userId: req.user.id,
      slug: slug,
      fields: req.body.fields || [],
      logicJumps: req.body.logicJumps || [],
      settings: req.body.settings || {
        theme: {
          primaryColor: '#3B82F6',
          backgroundColor: '#F9FAFB',
          fontFamily: 'Inter, sans-serif'
        },
        progressBar: {
          show: true,
          type: 'bar'
        },
        submitButton: {
          text: 'Submit'
        },
        successMessage: 'Thank you for your submission!',
        showQuestionNumbers: true
      }
    }
  });

  res.status(201).json({
    success: true,
    data: {
      ...form,
      public_url: form.status === 'PUBLISHED' 
    ? getPublicFormUrl(req, form.slug, form.id)
    : null,
    }
  });
});

/**
 * @desc    Update form
 * @route   PUT /api/v1/forms/:id
 * @access  Private
 */
exports.updateForm = asyncHandler(async (req, res, next) => {
  let form = await prisma.form.findUnique({
    where: { id: req.params.id }
  });

  if (!form) {
    return next(
      new ErrorResponse(`Form not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is form owner
  if (form.userId !== req.user.id && req.user.role !== 'ADMIN') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this form`,
        403
      )
    );
  }

  // Update form
  form = await prisma.form.update({
    where: { id: req.params.id },
    data: req.body
  });

  const protocol = req.secure ? 'https' : 'http';
  const host = req.get('host');
  const publicUrl = `${protocol}://localhost:3000/f/${form.slug}/${form.id}`;

  res.status(200).json({
    success: true,
    data: {
      ...form,
      public_url: form.status === 'PUBLISHED' 
    ? getPublicFormUrl(req, form.slug, form.id)
    : null,
    }
  });
});

/**
 * @desc    Delete form
 * @route   DELETE /api/v1/forms/:id
 * @access  Private
 */
exports.deleteForm = asyncHandler(async (req, res, next) => {
  const form = await prisma.form.findUnique({
    where: { id: req.params.id }
  });

  if (!form) {
    return next(
      new ErrorResponse(`Form not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is form owner
  if (form.userId !== req.user.id && req.user.role !== 'ADMIN') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this form`,
        403
      )
    );
  }

  // Delete associated responses first (cascade should handle this automatically)
  await prisma.form.delete({
    where: { id: req.params.id }
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

/**
 * @desc    Publish form
 * @route   PUT /api/v1/forms/:id/publish
 * @access  Private
 */
exports.publishForm = asyncHandler(async (req, res, next) => {
  let form = await prisma.form.findUnique({
    where: { id: req.params.id }
  });

  if (!form) {
    return next(
      new ErrorResponse(`Form not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is form owner
  if (form.userId !== req.user.id && req.user.role !== 'ADMIN') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to publish this form`,
        403
      )
    );
  }

  // Update form status to published
  form = await prisma.form.update({
    where: { id: req.params.id },
    data: { status: 'PUBLISHED' }
  });

  res.status(200).json({
    success: true,
    data: {
      ...form,
      public_url: form.status === 'PUBLISHED' 
    ? getPublicFormUrl(req, form.slug, form.id)
    : null,
    }
  });
});

/**
 * @desc    Archive form
 * @route   PUT /api/v1/forms/:id/archive
 * @access  Private
 */
exports.archiveForm = asyncHandler(async (req, res, next) => {
  let form = await prisma.form.findUnique({
    where: { id: req.params.id }
  });

  if (!form) {
    return next(
      new ErrorResponse(`Form not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is form owner
  if (form.userId !== req.user.id && req.user.role !== 'ADMIN') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to archive this form`,
        403
      )
    );
  }

  // Update form status to archived
  form = await prisma.form.update({
    where: { id: req.params.id },
    data: { status: 'ARCHIVED' }
  });

  res.status(200).json({
    success: true,
    data: form
  });
});

/**
 * @desc    Upload field file
 * @route   POST /api/v1/forms/:id/upload
 * @access  Private/Public
 */
exports.uploadFile = asyncHandler(async (req, res, next) => {
  const form = await prisma.form.findUnique({
    where: { id: req.params.id }
  });

  if (!form) {
    return next(
      new ErrorResponse(`Form not found with id of ${req.params.id}`, 404)
    );
  }

  if (!req.files) {
    return next(new ErrorResponse(`Please upload a file`, 400));
  }

  const file = req.files.file;

  // Make sure the file is valid
  if (!file.mimetype) {
    return next(new ErrorResponse(`Please upload a valid file`, 400));
  }

  // Determine folder based on form ID
  const folder = `triddle/forms/${form.id}`;

  try {
    // Upload to Cloudinary
    const result = await uploadToCloudinary(file.data, folder, {
      resource_type: 'auto'
    });

    // Return the file info
    res.status(200).json({
      success: true,
      data: {
        name: result.original_filename,
        url: result.secure_url,
        publicId: result.public_id,
        size: result.bytes,
        type: result.format
      }
    });
  } catch (error) {
    return next(new ErrorResponse(`Problem with file upload: ${error.message}`, 500));
  }
});