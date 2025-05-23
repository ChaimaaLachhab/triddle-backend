const { v4: uuidv4 } = require("uuid");
const { prisma } = require("../config/db");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../utils/asyncHandler");
const { CloudinaryUtils } = require("../utils/fileUpload");

/**
 * @desc    Get all responses for a form
 * @route   GET /api/v1/forms/:formId/responses
 * @access  Private
 */
exports.getResponses = asyncHandler(async (req, res, next) => {
  // Check if form exists
  const form = await prisma.form.findUnique({
    where: { id: req.params.formId },
  });

  if (!form) {
    return next(
      new ErrorResponse(`Form not found with id of ${req.params.formId}`, 404)
    );
  }

  // Make sure user is form owner
  if (form.userId !== req.user.id && req.user.role !== "ADMIN") {
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
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({
    success: true,
    count: responses.length,
    data: responses,
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
    include: { form: true },
  });

  if (!response) {
    return next(
      new ErrorResponse(`Response not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is form owner
  if (response.form.userId !== req.user.id && req.user.role !== "ADMIN") {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to view this response`,
        403
      )
    );
  }

  res.status(200).json({
    success: true,
    data: response,
  });
});

/**
 * @desc    Create new response or update existing one
 * @route   POST /api/v1/forms/:formId/responses
 * @access  Public
 */
exports.createResponse = asyncHandler(async (req, res, next) => {
  const form = await prisma.form.findUnique({
    where: { id: req.params.formId },
  });
  
  if (!form) {
    return next(
      new ErrorResponse(`Form not found with id of ${req.params.formId}`, 404)
    );
  }

  // Check if form is published
  if (form.status !== "PUBLISHED") {
    return next(
      new ErrorResponse(`Form is not currently accepting responses`, 403)
    );
  }

  // Parse answers from the request body
  let answers;

  // Handle answers coming from FormData (with files)
  if (req.body.answers && typeof req.body.answers === "string") {
    try {
      answers = JSON.parse(req.body.answers);
    } catch (e) {
      return next(new ErrorResponse("Invalid answers format", 400));
    }
  } else {
    // Handle answers coming directly as JSON
    answers = req.body.answers || [];
  }

  // Process any file uploads in the answers
  const fileUploadPromises = [];
  
  for (let i = 0; i < answers.length; i++) {
    const answer = answers[i];
    const fieldId = answer.fieldId;

    // Check if there's a file upload for this field
    if (req.files && req.files[fieldId]) {
      const file = req.files[fieldId];
      
      // Set up upload promise
      const uploadPromise = (async () => {
        try {
          const folder = `triddle/responses/${form.id}`;
          const result = await CloudinaryService.uploadFile(file, folder, {
            resource_type: "auto"
          });

          // Update answer with file information
          answers[i].fileUrl = result.url;
          answers[i].filePublicId = result.publicId;
          answers[i].value = file.name || "uploaded-file";
          
          return result;
        } catch (error) {
          console.error("File upload error:", error);
          throw new Error(`Error uploading file ${fieldId}: ${error.message}`);
        }
      })();
      
      fileUploadPromises.push(uploadPromise);
    }
  }
  
  // Wait for all file uploads to complete
  try {
    await Promise.all(fileUploadPromises);
  } catch (error) {
    return next(new ErrorResponse(error.message, 500));
  }

  // Get or create visit
  let visit;
  if (req.body.visitId) {
    visit = await prisma.visit.findUnique({
      where: { visitId: req.body.visitId },
    });

    if (!visit) {
      // Create a new visit if not found
      visit = await prisma.visit.create({
        data: {
          formId: req.params.formId,
          visitId: req.body.visitId,
          metadata: {
            startedAt: new Date(),
            userAgent: req.headers["user-agent"],
            ipAddress: req.ip,
            referrer: req.headers.referer || "",
            device: determineDevice(req.headers["user-agent"]),
          },
        },
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
          userAgent: req.headers["user-agent"],
          ipAddress: req.ip,
          referrer: req.headers.referer || "",
          device: determineDevice(req.headers["user-agent"]),
        },
      },
    });
  }
  
  // Create the response
  try {
    const response = await prisma.response.create({
      data: {
        formId: req.params.formId,
        // Correction: utilisez une relation correcte avec l'objet visit
        visit: {
          connect: {
            visitId: visit.visitId
          }
        },
        answers: answers,
        metadata: {
          submittedAt: new Date(),
          userAgent: req.headers["user-agent"],
          ipAddress: req.ip,
          referrer: req.headers.referer || "",
        }
      },
    });
    
    // Update the visit as completed
    await prisma.visit.update({
      where: { visitId: visit.visitId },
      data: {
        completed: true
      },
    });
    
    res.status(201).json({
      success: true,
      data: response
    });
  } catch (error) {
    // Clean up any uploaded files if response creation fails
    const filesToDelete = answers
      .filter(answer => answer.filePublicId)
      .map(answer => answer.filePublicId);
      
    if (filesToDelete.length > 0) {
      try {
        await CloudinaryService.deleteMultipleFiles(filesToDelete);
      } catch (deleteError) {
        console.error("Error cleaning up uploaded files:", deleteError);
      }
    }
    
    return next(new ErrorResponse(`Error creating response: ${error.message}`, 500));
  }
});

/**
 * @desc    Delete response
 * @route   DELETE /api/v1/responses/:id
 * @access  Private
 */
exports.deleteResponse = asyncHandler(async (req, res, next) => {
  const response = await prisma.response.findUnique({
    where: { id: req.params.id },
    include: { form: true },
  });

  if (!response) {
    return next(
      new ErrorResponse(`Response not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is form owner
  if (response.form.userId !== req.user.id && req.user.role !== "ADMIN") {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this response`,
        403
      )
    );
  }

  await prisma.response.delete({
    where: { id: req.params.id },
  });

  res.status(200).json({
    success: true,
    data: {},
  });
});

// Helper function to determine device type from user agent
const determineDevice = (userAgent) => {
  if (!userAgent) return "unknown";

  if (/mobile/i.test(userAgent)) {
    return "mobile";
  } else if (/tablet/i.test(userAgent)) {
    return "tablet";
  } else {
    return "desktop";
  }
};
