import { MemoryClient } from "mem0ai";

// Initialize Mem0 client
let mem0Client: MemoryClient | null = null;

export function getMem0Client(): MemoryClient {
  if (!mem0Client) {
    const apiKey = process.env.MEM0_API_KEY;
    
    if (!apiKey) {
      throw new Error("MEM0_API_KEY is not configured");
    }
    
    mem0Client = new MemoryClient({ apiKey });
    console.log("✅ Mem0 client initialized");
  }
  
  return mem0Client;
}

/**
 * Add memories from a conversation
 */
export async function addMemories(
  userId: string,
  conversationId: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>
) {
  try {
    const client = getMem0Client();
    
    // Add memories with user and conversation context
    const result = await client.add(messages, {
      user_id: userId,
      metadata: {
        conversation_id: conversationId,
        timestamp: new Date().toISOString(),
      },
    });
    
    console.log("✅ Memories added:", result);
    return result;
  } catch (error) {
    console.error("❌ Error adding memories:", error);
    throw error;
  }
}

/**
 * Search for relevant memories
 */
export async function searchMemories(
  userId: string,
  query: string,
  conversationId?: string
) {
  try {
    const client = getMem0Client();
    
    const filters: any = {
      user_id: userId,
    };
    
    if (conversationId) {
      filters["metadata.conversation_id"] = conversationId;
    }
    
    const memories = await client.search(query, {
      user_id: userId,
      limit: 5,
    });
    
    console.log(`✅ Found ${memories?.length || 0} relevant memories`);
    return memories;
  } catch (error) {
    console.error("❌ Error searching memories:", error);
    return [];
  }
}

/**
 * Get all memories for a user
 */
export async function getUserMemories(userId: string) {
  try {
    const client = getMem0Client();
    
    const memories = await client.getAll({
      user_id: userId,
    });
    
    console.log(`✅ Retrieved ${memories?.length || 0} memories for user`);
    return memories;
  } catch (error) {
    console.error("❌ Error getting user memories:", error);
    return [];
  }
}

/**
 * Delete specific memory
 */
export async function deleteMemory(memoryId: string) {
  try {
    const client = getMem0Client();
    await client.delete(memoryId);
    console.log("✅ Memory deleted:", memoryId);
  } catch (error) {
    console.error("❌ Error deleting memory:", error);
    throw error;
  }
}
