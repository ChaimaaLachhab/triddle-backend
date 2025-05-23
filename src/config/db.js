const { PrismaClient } = require('@prisma/client');
const { withAccelerate } = require('@prisma/extension-accelerate');

// Create a singleton Prisma instance
let prisma;

if (!prisma) {
  prisma = new PrismaClient().$extends(withAccelerate());
}

// Connect to database with error handling
const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('PostgreSQL Connected');
    return prisma;
  } catch (error) {
    console.error(`Error connecting to PostgreSQL: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { prisma, connectDB };