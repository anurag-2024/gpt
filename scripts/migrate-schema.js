/**
 * Migration script to clean up old message format
 * Run this once to remove old messages with role/content fields
 * Usage: MONGODB_URI="your-uri" node scripts/migrate-schema.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Read MongoDB URI from .env.local
function getMongoUri() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/MONGODB_URI=(.+)/);
  return match ? match[1].trim() : null;
}

async function migrate() {
  try {
    const mongoUri = getMongoUri();
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in .env.local');
    }

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const messagesCollection = db.collection('messages');

    // Count old format messages (have 'role' field)
    const oldMessagesCount = await messagesCollection.countDocuments({ role: { $exists: true } });
    console.log(`📊 Found ${oldMessagesCount} messages in old format`);

    if (oldMessagesCount > 0) {
      console.log('🗑️  Deleting old format messages...');
      const result = await messagesCollection.deleteMany({ role: { $exists: true } });
      console.log(`✅ Deleted ${result.deletedCount} old messages`);
    }

    // Count new format messages (have 'query' field)
    const newMessagesCount = await messagesCollection.countDocuments({ query: { $exists: true } });
    console.log(`📊 Current messages in new format: ${newMessagesCount}`);

    console.log('✅ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
