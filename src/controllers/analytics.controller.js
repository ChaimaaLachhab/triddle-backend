const { prisma } = require('../config/db');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get form analytics dashboard data
 * @route   GET /api/v1/forms/:formId/analytics
 * @access  Private
 */
exports.getFormAnalytics = asyncHandler(async (req, res, next) => {
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
        `User ${req.user.id} is not authorized to access analytics for this form`,
        403
      )
    );
  }

  // Get total visits
  const totalVisits = await prisma.visit.count({
    where: { formId: req.params.formId }
  });

  // Get total responses
  const totalResponses = await prisma.response.count({
    where: {
      formId: req.params.formId,
      metadata: {
        path: ['isComplete'],
        equals: true
      }
    }
  });

  // Calculate conversion rate
  const conversionRate = totalVisits > 0 ? (totalResponses / totalVisits) * 100 : 0;

  // Get average completion time
  const completionTimes = await prisma.response.findMany({
    where: {
      formId: req.params.formId,
      metadata: {
        path: ['isComplete'],
        equals: true
      }
    },
    select: {
      metadata: true
    }
  });

  let avgCompletionTime = 0;
  if (completionTimes.length > 0) {
    const totalTime = completionTimes.reduce(
      (acc, curr) => acc + (curr.metadata.timeSpent || 0),
      0
    );
    avgCompletionTime = totalTime / completionTimes.length;
  }

  // Get device breakdown
  const visits = await prisma.visit.findMany({
    where: { formId: form.id },
    select: { metadata: true }
  });
  
  // Process device stats from visits
  const deviceCounts = {};
  visits.forEach(visit => {
    const device = visit.metadata.device || 'unknown';
    deviceCounts[device] = (deviceCounts[device] || 0) + 1;
  });
  
  const devices = Object.keys(deviceCounts).map(device => ({
    device,
    count: deviceCounts[device]
  }));

  // Get drop-off points (incomplete submissions)
  const incompleteResponses = await prisma.response.findMany({
    where: {
      formId: form.id,
      metadata: {
        path: ['isComplete'],
        equals: false
      }
    },
    select: { 
      answers: true
    }
  });
  
  // Calculate dropout points
  const dropoffCounts = {};
  incompleteResponses.forEach(response => {
    const answerCount = response.answers.length;
    dropoffCounts[answerCount] = (dropoffCounts[answerCount] || 0) + 1;
  });
  
  const dropOffs = Object.keys(dropoffCounts).map(count => ({
    answerCount: parseInt(count),
    count: dropoffCounts[count]
  })).sort((a, b) => a.answerCount - b.answerCount);

  // Get daily response trend for last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentResponses = await prisma.response.findMany({
    where: {
      formId: form.id,
      createdAt: { gte: thirtyDaysAgo }
    },
    select: { createdAt: true }
  });
  
  // Process trend data
  const dailyCounts = {};
  recentResponses.forEach(response => {
    const dateStr = response.createdAt.toISOString().split('T')[0];
    dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
  });
  
  const dailyTrend = Object.keys(dailyCounts).map(date => ({
    date: new Date(date),
    count: dailyCounts[date]
  })).sort((a, b) => a.date - b.date);

  res.status(200).json({
    success: true,
    data: {
      totalVisits,
      totalResponses,
      conversionRate,
      avgCompletionTime,
      devices,
      dropOffs,
      dailyTrend
    }
  });
});

/**
 * @desc    Get field-specific analytics
 * @route   GET /api/v1/forms/:formId/analytics/fields
 * @access  Private
 */
exports.getFieldAnalytics = asyncHandler(async (req, res, next) => {
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
        `User ${req.user.id} is not authorized to access analytics for this form`,
        403
      )
    );
  }

  // Get all responses for the form
  const responses = await prisma.response.findMany({
    where: { formId: req.params.formId },
    select: { answers: true }
  });

  // Process field-specific analytics
  const fieldAnalytics = {};
  const fields = form.fields;

  // Initialize field analytics objects
  fields.forEach(field => {
    fieldAnalytics[field.fieldId] = {
      fieldId: field.fieldId,
      label: field.label,
      type: field.type,
      responseCount: 0,
      values: [],
      // Additional metrics based on field type
      ...(field.type === 'multiSelect' || field.type === 'radio' || field.type === 'dropdown'
        ? { optionCounts: {} }
        : {}),
      ...(field.type === 'number'
        ? { min: null, max: null, average: 0, sum: 0 }
        : {})
    };

    // Initialize option counts for fields with options
    if (
      field.type === 'multiSelect' ||
      field.type === 'radio' ||
      field.type === 'dropdown'
    ) {
      field.options.forEach(option => {
        fieldAnalytics[field.fieldId].optionCounts[option.value] = 0;
      });
    }
  });

  // Process responses
  responses.forEach(response => {
    response.answers.forEach(answer => {
      const fieldId = answer.fieldId;
      const field = fields.find(f => f.fieldId === fieldId);

      if (field && fieldAnalytics[fieldId]) {
        fieldAnalytics[fieldId].responseCount++;
        fieldAnalytics[fieldId].values.push(answer.value);

        // Process based on field type
        if (
          (field.type === 'radio' || field.type === 'dropdown') &&
          answer.value
        ) {
          fieldAnalytics[fieldId].optionCounts[answer.value] =
            (fieldAnalytics[fieldId].optionCounts[answer.value] || 0) + 1;
        } else if (field.type === 'multiSelect' && Array.isArray(answer.value)) {
          answer.value.forEach(val => {
            fieldAnalytics[fieldId].optionCounts[val] =
              (fieldAnalytics[fieldId].optionCounts[val] || 0) + 1;
          });
        } else if (field.type === 'number' && answer.value !== null && answer.value !== undefined) {
          const numValue = Number(answer.value);
          if (!isNaN(numValue)) {
            fieldAnalytics[fieldId].sum += numValue;
            
            if (fieldAnalytics[fieldId].min === null || numValue < fieldAnalytics[fieldId].min) {
              fieldAnalytics[fieldId].min = numValue;
            }
            
            if (fieldAnalytics[fieldId].max === null || numValue > fieldAnalytics[fieldId].max) {
              fieldAnalytics[fieldId].max = numValue;
            }
          }
        }
      }
    });
  });

  // Calculate averages for number fields
  Object.keys(fieldAnalytics).forEach(fieldId => {
    const field = fieldAnalytics[fieldId];
    if (field.type === 'number' && field.responseCount > 0) {
      field.average = field.sum / field.responseCount;
    }
  });

  res.status(200).json({
    success: true,
    data: Object.values(fieldAnalytics)
  });
});

/**
 * @desc    Get visit analytics
 * @route   GET /api/v1/forms/:formId/analytics/visits
 * @access  Private
 */
exports.getVisitAnalytics = asyncHandler(async (req, res, next) => {
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
        `User ${req.user.id} is not authorized to access analytics for this form`,
        403
      )
    );
  }

  // Get all visits
  const visits = await prisma.visit.findMany({
    where: { formId: form.id },
    select: { metadata: true }
  });
  
  // Process referrer breakdown
  const referrerCounts = {};
  visits.forEach(visit => {
    const referrer = visit.metadata.referrer || 'direct';
    referrerCounts[referrer] = (referrerCounts[referrer] || 0) + 1;
  });
  
  const referrers = Object.keys(referrerCounts)
    .map(referrer => ({
      referrer,
      count: referrerCounts[referrer]
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Process browser breakdown
  const browserCounts = {};
  visits.forEach(visit => {
    const browser = visit.metadata.browser || 'unknown';
    browserCounts[browser] = (browserCounts[browser] || 0) + 1;
  });
  
  const browsers = Object.keys(browserCounts)
    .map(browser => ({
      browser,
      count: browserCounts[browser]
    }))
    .sort((a, b) => b.count - a.count);
  
  // Process operating system breakdown
  const osCounts = {};
  visits.forEach(visit => {
    const os = visit.metadata.operatingSystem || 'unknown';
    osCounts[os] = (osCounts[os] || 0) + 1;
  });
  
  const operatingSystems = Object.keys(osCounts)
    .map(os => ({
      os,
      count: osCounts[os]
    }))
    .sort((a, b) => b.count - a.count);
  
  // Process hourly visit distribution
  const hourlyDistribution = [];
  for (let hour = 0; hour < 24; hour++) {
    hourlyDistribution.push({
      hour,
      count: 0
    });
  }
  
  visits.forEach(visit => {
    const startedAt = visit.metadata.startedAt;
    if (startedAt) {
      const hour = new Date(startedAt).getHours();
      hourlyDistribution[hour].count++;
    }
  });
  
  // Process day of week distribution
  const dayOfWeekDistribution = [];
  for (let day = 1; day <= 7; day++) {
    dayOfWeekDistribution.push({
      dayOfWeek: day,
      count: 0
    });
  }
  
  visits.forEach(visit => {
    const startedAt = visit.metadata.startedAt;
    if (startedAt) {
      // JS getDay returns 0 for Sunday, we want 1-7
      const day = new Date(startedAt).getDay() || 7;
      dayOfWeekDistribution[day - 1].count++;
    }
  });

  res.status(200).json({
    success: true,
    data: {
      referrers,
      browsers,
      operatingSystems,
      hourlyDistribution,
      dayOfWeekDistribution
    }
  });
});

/**
 * @desc    Export responses data
 * @route   GET /api/v1/forms/:formId/export
 * @access  Private
 */
exports.exportResponses = asyncHandler(async (req, res, next) => {
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
        `User ${req.user.id} is not authorized to export data for this form`,
        403
      )
    );
  }

  // Get all complete responses
  const responses = await prisma.response.findMany({
    where: {
      formId: req.params.formId,
      metadata: {
        path: ['isComplete'],
        equals: true
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Format depends on export type requested
  const exportType = req.query.format || 'json';

  // Create field map for headings
  const fieldMap = {};
  form.fields.forEach(field => {
    fieldMap[field.fieldId] = field.label;
  });

  if (exportType === 'csv') {
    // Generate CSV
    let csv = '';
    
    // Add headers
    const headers = [
      'Response ID',
      'Submission Date',
      'Time Spent (seconds)',
      ...form.fields.map(field => field.label)
    ];
    
    csv += headers.join(',') + '\n';
    
    // Add rows
    responses.forEach(response => {
      const rowData = [
        response.id,
        response.metadata.completedAt ? new Date(response.metadata.completedAt).toISOString() : '',
        response.metadata.timeSpent || '',
      ];
      
      // Add field data
      form.fields.forEach(field => {
        const answer = response.answers.find(a => a.fieldId === field.fieldId);
        let value = '';
        
        if (answer) {
          if (field.type === 'multiSelect' && Array.isArray(answer.value)) {
            value = `"${answer.value.join(', ')}"`;
          } else if (answer.fileUrl) {
            value = answer.fileUrl;
          } else if (answer.value !== null && answer.value !== undefined) {
            // Escape quotes and wrap in quotes if contains commas
            if (typeof answer.value === 'string' && 
                (answer.value.includes(',') || answer.value.includes('"'))) {
              value = `"${answer.value.replace(/"/g, '""')}"`;
            } else {
              value = answer.value;
            }
          }
        }
        
        rowData.push(value);
      });
      
      csv += rowData.join(',') + '\n';
    });
    
    // Set headers for download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${form.title.replace(/\s+/g, '_')}_responses.csv"`
    );
    
    res.status(200).send(csv);
  } else {
    // Return JSON format by default
    const formattedResponses = responses.map(response => {
      const formattedResponse = {
        id: response.id,
        submittedAt: response.metadata.completedAt,
        timeSpent: response.metadata.timeSpent,
        answers: {}
      };
      
      // Format answers
      response.answers.forEach(answer => {
        // Use field label as the key
        const fieldLabel = fieldMap[answer.fieldId] || answer.fieldId;
        formattedResponse.answers[fieldLabel] = answer.fileUrl || answer.value;
      });
      
      return formattedResponse;
    });
    
    res.status(200).json({
      success: true,
      count: formattedResponses.length,
      data: formattedResponses
    });
  }
});