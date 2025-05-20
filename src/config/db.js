const { PrismaClient } = require('@prisma/client');
const { withAccelerate } = require('@prisma/extension-accelerate');
const logger = require('./logger');

// Create a singleton Prisma instance
let prisma;

if (!prisma) {
  prisma = new PrismaClient().$extends(withAccelerate());
}

// Connect to database with error handling
const connectDB = async () => {
  try {
    await prisma.$connect();
    logger.info('PostgreSQL Connected');
    return prisma;
  } catch (error) {
    logger.error(`Error connecting to PostgreSQL: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { prisma, connectDB };