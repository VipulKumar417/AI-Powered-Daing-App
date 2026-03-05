// Local AI Service using Ollama
// Requires Ollama running locally at http://localhost:11434 with the 'mistral' model installed.

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = 'mistral'; // or 'llama3.2', 'phi3' depending on what is pulled

export interface UserProfileData {
    name: string;
    age: number;
    location: string;
    bio: string;
    gender: string;
    preference: string;
    conversationDepth?: number;
    mbti?: string;
    enneagram?: string;
    attachmentStyle?: string;
    loveLanguages?: string[];
    coreValues?: string[];
    redFlags?: string[];
    greenFlags?: string[];
    relationshipGoals?: string;
    communicationStyle?: string;
}

// Helper to make calls to local Ollama instance
async function callOllama(prompt: string, format?: 'json') {
    try {
        const response = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: prompt,
                stream: false,
                ...(format ? { format } : {})
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.response;
    } catch (e) {
        console.error("Failed to connect to Local Ollama:", e);
        throw e;
    }
}

export const generateProfileAnalysis = async (userProfile: UserProfileData, chatHistory: { role: string, content: string }[]) => {
    try {
        const prompt = `
        Analyze the following user profile and chat history to determine their personality traits for a dating app.
        
        User Profile:
        ${JSON.stringify(userProfile, null, 2)}
        
        Chat History:
        ${JSON.stringify(chatHistory, null, 2)}
        
        Provide the analysis strictly in the following JSON format:
        {
            "mbti": "string (e.g., INTJ)",
            "enneagram": "string (e.g., 5w4)",
            "attachmentStyle": "string",
            "loveLanguages": ["string", "string"],
            "coreValues": ["string", "string"],
            "redFlags": ["string", "string"],
            "greenFlags": ["string", "string"],
            "relationshipGoals": "string",
            "communicationStyle": "string"
        }
        Do not include any other text besides the JSON object.
        `;

        const responseText = await callOllama(prompt, 'json');

        // Extract JSON from potential markdown blocks (though Ollama 'json' format usually handles this)
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/```\n([\s\S]*?)\n```/);
        const jsonString = jsonMatch ? jsonMatch[1] : responseText;

        return JSON.parse(jsonString);

    } catch (e) {
        console.error("Failed to generate AI profile analysis. Falling back to mock.", e);
        return {
            mbti: "ENFP",
            enneagram: "7w6",
            attachmentStyle: "Secure",
            loveLanguages: ["Quality Time", "Words of Affirmation"],
            coreValues: ["Adventure", "Growth", "Connection"],
            redFlags: ["Inconsistency", "Lack of empathy", "Poor communication"],
            greenFlags: ["Emotional intelligence", "Active listening", "Shared interests"],
            relationshipGoals: "Long-term partnership",
            communicationStyle: "Open and expressive"
        };
    }
};

export const generateAIResponse = async (userProfile: UserProfileData, chatHistory: { role: string, content: string }[]) => {
    try {
        const prompt = `
         You are Sanjog, a charming, witty, and deeply empathetic companion (NOT a coach or teacher) for a premium dating app.
         Your goal is to chat with the user like a close friend and help them find a great match.
         Talk to them with love, warmth, and an engaging, interesting style. 
         Do NOT act like an interviewer or asking boring questions like "what are your interests and lifestyle". 
         Instead, share a fun observation, make a playful joke, or ask a unique, unexpected question that sparks a genuine connection.
         Keep your responses concise, natural, and conversational (1-2 sentences).
         

         User Profile:
         Name: ${userProfile.name}
         Age: ${userProfile.age}
         Bio: ${userProfile.bio}
         
         Chat History:
         ${chatHistory.map(msg => `${msg.role === 'user' ? 'User' : 'Sanjog'}: ${msg.content}`).join('\n')}
         
         Sanjog:`;

        const responseText = await callOllama(prompt);
        return responseText.trim();

    } catch (e) {
        console.error("Failed to generate AI chat response. Falling back to mock.", e);
        return "Hey there! I was just thinking... if you had to pick one song to be the soundtrack of your week, what would it be? 🎵";
    }
}

export const generateCompatibilityScore = async (user1: UserProfileData, user2: UserProfileData) => {
    try {
        const prompt = `
        Analyze the compatibility between these two dating profiles and provide a score from 0-100 and a brief list of reasons.
        
        User 1:
        ${JSON.stringify(user1, null, 2)}
        
        User 2:
        ${JSON.stringify(user2, null, 2)}
        
        Provide the analysis strictly in the following JSON format:
        {
            "score": number (0-100),
            "reasons": ["string", "string", "string"]
        }
        Do not include any other text besides the JSON object.
        `;

        const responseText = await callOllama(prompt, 'json');

        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/```\n([\s\S]*?)\n```/);
        const jsonString = jsonMatch ? jsonMatch[1] : responseText;

        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to generate compatibility score:", e);
        return { score: 75, reasons: ["Failed to analyze due to API error. Using fallback score."] };
    }
}

export const generateIcebreakers = async (matchProfile: any) => {
    try {
        const prompt = `
        You are an expert dating assistant. Your user is about to message someone new. 
        Based on the match's profile below, generate 3 unique, engaging, and highly contextual opening messages (icebreakers). 
        Make one funny, one thoughtful, and one casual.
        
        Match Profile:
        Name: ${matchProfile.name}
        Bio: ${matchProfile.bio}
        Interests: ${matchProfile.interests?.join(', ') || 'None listed'}
        
        Provide the analysis strictly in the following JSON format:
        {
            "icebreakers": ["string", "string", "string"]
        }
        Do not include any other text besides the JSON object.
        `;

        const responseText = await callOllama(prompt, 'json');

        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/```\n([\s\S]*?)\n```/);
        const jsonString = jsonMatch ? jsonMatch[1] : responseText;

        const data = JSON.parse(jsonString);
        return data.icebreakers || [];
    } catch (e) {
        console.error("Failed to generate icebreakers:", e);
        return [
            "Hi there! What caught your eye today?",
            "I saw your profile and just had to say hi! What's your favorite thing to do on a weekend?",
            "If you could travel anywhere right now, where would it be?"
        ];
    }
}

export const generateProfileReview = async (userProfile: any) => {
    try {
        const prompt = `
        You are an expert dating profile optimizer. Review the following user profile and provide constructive feedback to help them get more high-quality matches.
        
        Give 1 thing they are doing well ("boast"), 1 area of improvement ("roast"), and 1 specific actionable tip.
        
        User Profile:
        Name: ${userProfile.name}
        Bio: ${userProfile.bio || 'No bio provided'}
        Interests: ${userProfile.interests?.join(', ') || 'None listed'}
        
        Provide the analysis strictly in the following JSON format:
        {
            "boast": "string",
            "roast": "string",
            "tip": "string"
        }
        Do not include any other text besides the JSON object.
        `;

        const responseText = await callOllama(prompt, 'json');

        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/```\n([\s\S]*?)\n```/);
        const jsonString = jsonMatch ? jsonMatch[1] : responseText;

        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to generate profile review:", e);
        return {
            boast: "Your profile is filled out and shows you're active!",
            roast: "Your bio could use a bit more personality or a fun prompt to draw people in.",
            tip: "Try adding a question to your bio so potential matches have an easy icebreaker!"
        };
    }
}

export const generateDatePlan = async (user1: any, user2: any, location: string) => {
    try {
        const prompt = `
        You are an expert date planner. Plan the perfect date for these two people based on their shared interests.
        
        The date should take place in: ${location || 'A generic vibrant city'}
        
        User 1:
        Name: ${user1.name}
        Bio: ${user1.bio}
        Interests: ${user1.interests?.join(', ') || 'None listed'}
        
        User 2:
        Name: ${user2.name}
        Bio: ${user2.bio}
        Interests: ${user2.interests?.join(', ') || 'None listed'}
        
        Provide the date plan strictly in the following JSON format:
        {
            "title": "A catchy title for the date (e.g., Coffee & Canvas in the City)",
            "description": "A short 1-2 sentence description of why this date is perfect for them.",
            "itinerary": [
                {
                    "time": "e.g., 2:00 PM",
                    "activity": "What they will do",
                    "location": "Specific type of venue or place"
                }
            ]
        }
        Do not include any other text besides the JSON object. Keep the itinerary to 2-3 stops.
        `;

        const responseText = await callOllama(prompt, 'json');

        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/```\n([\s\S]*?)\n```/);
        const jsonString = jsonMatch ? jsonMatch[1] : responseText;

        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to generate date plan:", e);
        return {
            title: "Coffee & A Walk",
            description: "A classic, low-pressure first date to get to know each other better.",
            itinerary: [
                { time: "3:00 PM", activity: "Meet for coffee or tea", location: "Local cafe" },
                { time: "4:00 PM", activity: "Take a walk to keep the conversation flowing", location: "Nearby park or scenic area" }
            ]
        };
    }
}

export const generateConversationRescuer = async (chatHistory: any[], otherParticipant: any) => {
    try {
        const prompt = `
        You are an expert dating assistant. The conversation between the user and their match has gone stale or died out.
        Analyze the previous messages and the match's profile to suggest a natural, low-pressure, and engaging question to reignite the spark.
        Keep it under 2 sentences.
        
        Match Profile:
        Name: ${otherParticipant.name}
        Bio: ${otherParticipant.bio}
        Interests: ${otherParticipant.interests?.join(', ') || 'None listed'}
        
        Recent Chat History (older to newer):
        ${chatHistory.slice(-5).map((msg: any) => `${msg.senderId === otherParticipant.id ? otherParticipant.name : 'User'}: ${msg.content}`).join('\n')}
        
        Suggest one great follow-up message the User can send:
        `;

        const responseText = await callOllama(prompt);
        return responseText.replace(/^["']|["']$/g, '').trim(); // Remove surrounding quotes if any
    } catch (e) {
        console.error("Failed to generate conversation rescuer:", e);
        return "Hey! It's been a minute. How has your week been going?";
    }
}

