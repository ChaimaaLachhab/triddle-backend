const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../config/db');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../utils/asyncHandler');
const { uploadToCloudinary } = require('../utils/fileUpload');

/**
 * @desc    Get all responses for a form
 * @route   GET /api/v1/forms/:formId/responses
 * @access  Private
 */
exports.getResponses = asyncHandler(async (req, res, next) => {
  // Check if form exists
  const form = await prisma.form.findUnique({
    where: { id: req.params.formId }
  });

  if (!form) {
    return next(
      new ErrorResponse(`Form not found with id of ${req.params.formId}`, 404)
    );
  }

  // Make sure user is form owner
  if (form.userId !== req.user.id && req.user.role !== 'ADMIN') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to access responses for this form`,
        403
      )
    );
  }

  // Get responses for the form
  const responses = await prisma.response.findMany({
    where: { formId: req.params.formId },
    orderBy: { createdAt: 'desc' }
  });

  res.status(200).json({
    success: true,
    count: responses.length,
    data: responses
  });
});

/**
 * @desc    Get single response
 * @route   GET /api/v1/responses/:id
 * @access  Private
 */
exports.getResponse = asyncHandler(async (req, res, next) => {
  const response = await prisma.response.findUnique({
    where: { id: req.params.id },
    include: { form: true }
  });

  if (!response) {
    return next(
      new ErrorResponse(`Response not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is form owner
  if (response.form.userId !== req.user.id && req.user.role !== 'ADMIN') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to view this response`,
        403
      )
    );
  }

  res.status(200).json({
    success: true,
    data: response
  });
});

/**
 * @desc    Create new response or update existing one
 * @route   POST /api/v1/forms/:formId/responses
 * @access  Public
 */
exports.createResponse = asyncHandler(async (req, res, next) => {
  const form = await prisma.form.findUnique({
    where: { id: req.params.formId }
  });

  if (!form) {
    return next(
      new ErrorResponse(`Form not found with id of ${req.params.formId}`, 404)
    );
  }

  // Check if form is published
  if (form.status !== 'PUBLISHED') {
    return next(
      new ErrorResponse(`Form is not currently accepting responses`, 403)
    );
  }

  // Process any file uploads in the answers
  const answers = [...req.body.answers];
  
  // If there are file uploads, handle them with Cloudinary
  for (let i = 0; i < answers.length; i++) {
    const answer = answers[i];
    
    // If answer contains a file, upload it
    if (answer.file && req.files && req.files[answer.fieldId]) {
      const file = req.files[answer.fieldId];
      
      // Upload to Cloudinary
      const folder = `triddle/responses/${form.id}`;
      const result = await uploadToCloudinary(file.data, folder, {
        resource_type: 'auto'
      });
      
      // Update answer with file URL
      answers[i].fileUrl = result.secure_url;
      answers[i].value = file.name;
    }
  }

  // Get or create visit
  let visit;
  if (req.body.visitId) {
    visit = await prisma.visit.findUnique({
      where: { visitId: req.body.visitId }
    });
    
    if (!visit) {
      // Create a new visit if not found
      visit = await prisma.visit.create({
        data: {
          formId: req.params.formId,
          visitId: req.body.visitId,
          metadata: {
            startedAt: new Date(),
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip,
            referrer: req.headers.referer || '',
            device: determineDevice(req.headers['user-agent'])
          }
        }
      });
    }
  } else {
    // Generate a new visit ID
    const visitId = uuidv4();
    visit = await prisma.visit.create({
      data: {
        formId: req.params.formId,
        visitId: visitId,
        metadata: {
          startedAt: new Date(),
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip,
          referrer: req.headers.referer || '',
          device: determineDevice(req.headers['user-agent'])
        }
      }
    });
  }

  // Check if there's an existing partial response for this visit
  let response = await prisma.response.findFirst({
    where: {
      formId: req.params.formId,
      metadata: {
        path: ['visitId'],
        equals: visit.visitId
      }
    }
  });

  if (response && !response.metadata.isComplete) {
    // Update existing response
    const updatedAnswers = [...response.answers, ...answers];
    
    const updatedMetadata = {
      ...response.metadata,
      updatedAt: new Date()
    };
    
    // Check if this is a complete submission
    if (req.body.isComplete) {
      updatedMetadata.isComplete = true;
      updatedMetadata.completedAt = new Date();
      updatedMetadata.timeSpent = 
        (new Date(updatedMetadata.completedAt).getTime() - new Date(updatedMetadata.startedAt).getTime()) / 1000;
      
      // Mark the visit as completed
      await prisma.visit.update({
        where: { id: visit.id },
        data: {
          completed: true,
          metadata: {
            ...visit.metadata,
            endedAt: new Date()
          }
        }
      });
    }

    response = await prisma.response.update({
      where: { id: response.id },
      data: {
        answers: updatedAnswers,
        metadata: updatedMetadata
      }
    });
    
    // Update visit with response link
    await prisma.visit.update({
      where: { id: visit.id },
      data: { responseId: response.id }
    });
  } else {
    // Create new response
    const metadata = {
      visitId: visit.visitId,
      startedAt: new Date(),
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
      isComplete: req.body.isComplete || false
    };
    
    if (req.body.isComplete) {
      metadata.completedAt = new Date();
      metadata.timeSpent = 0; // Just created, so time spent is 0
    }

    response = await prisma.response.create({
      data: {
        formId: req.params.formId,
        answers: answers,
        metadata: metadata,
        // Link to user if authenticated
        respondentId: req.user ? req.user.id : null
      }
    });
    
    // Update visit with response link
    await prisma.visit.update({
      where: { id: visit.id },
      data: { 
        responseId: response.id,
        completed: req.body.isComplete || false,
        metadata: req.body.isComplete ? {
          ...visit.metadata,
          endedAt: new Date()
        } : visit.metadata
      }
    });
  }

  res.status(201).json({
    success: true,
    data: response,
    visitId: visit.visitId
  });
});

/**
 * @desc    Delete response
 * @route   DELETE /api/v1/responses/:id
 * @access  Private
 */
exports.deleteResponse = asyncHandler(async (req, res, next) => {
  const response = await prisma.response.findUnique({
    where: { id: req.params.id },
    include: { form: true }
  });

  if (!response) {
    return next(
      new ErrorResponse(`Response not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is form owner
  if (response.form.userId !== req.user.id && req.user.role !== 'ADMIN') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this response`,
        403
      )
    );
  }

  await prisma.response.delete({
    where: { id: req.params.id }
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// Helper function to determine device type from user agent
const determineDevice = (userAgent) => {
  if (!userAgent) return 'unknown';
  
  if (/mobile/i.test(userAgent)) {
    return 'mobile';
  } else if (/tablet/i.test(userAgent)) {
    return 'tablet';
  } else {
    return 'desktop';
  }
};