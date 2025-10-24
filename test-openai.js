// Quick test to see if Gemini API works
const { google } = require('@ai-sdk/google');
const { generateText } = require('ai');

async function test() {
  try {
    console.log('Testing Gemini API...');
    console.log('API Key exists:', !!process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    
    const result = await generateText({
      model: google('models/gemini-2.5-flash'),
      prompt: 'Say hello in a friendly way!',
    });
    
    console.log('✅ Success! Response:', result.text);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error details:', error);
  }
}

test();
