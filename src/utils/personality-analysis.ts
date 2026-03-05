// Personality Analysis System for Sanjog AI Dating

export interface PersonalityTraits {
  // Big Five Personality Traits (0-100 scale)
  openness: number;        // Open to experience vs conventional
  conscientiousness: number; // Organized vs spontaneous  
  extraversion: number;    // Outgoing vs reserved
  agreeableness: number;   // Cooperative vs competitive
  neuroticism: number;     // Sensitive vs secure
  
  // Dating-specific traits
  romantic: number;        // Romantic vs practical
  adventurous: number;     // Adventure-seeking vs homebody
  intellectual: number;    // Intellectual vs casual
  humor: number;          // Humorous vs serious
  ambitious: number;      // Career-focused vs relaxed
}

export interface PersonalityVector {
  // 3D space coordinates for matching
  x: number; // Extraversion-Introversion axis
  y: number; // Thinking-Feeling axis  
  z: number; // Judging-Perceiving axis
  
  // Additional dimensions
  energy: number;     // High energy vs calm
  creativity: number; // Creative vs practical
  social: number;     // Social vs independent
}

export class PersonalityAnalyzer {
  
  // Analyze conversation and extract personality insights
  static analyzeConversation(messages: any[]): PersonalityTraits {
    const traits: PersonalityTraits = {
      openness: 50,
      conscientiousness: 50,
      extraversion: 50,
      agreeableness: 50,
      neuroticism: 50,
      romantic: 50,
      adventurous: 50,
      intellectual: 50,
      humor: 50,
      ambitious: 50
    };

    for (const message of messages) {
      if (message.role === 'user') {
        const text = message.content.toLowerCase();
        
        // Analyze openness to experience
        if (this.containsKeywords(text, ['travel', 'new', 'different', 'explore', 'creative', 'art', 'culture'])) {
          traits.openness += 10;
        }
        if (this.containsKeywords(text, ['routine', 'traditional', 'familiar', 'safe', 'normal'])) {
          traits.openness -= 5;
        }

        // Analyze conscientiousness 
        if (this.containsKeywords(text, ['plan', 'organize', 'schedule', 'goal', 'work', 'career', 'future'])) {
          traits.conscientiousness += 10;
        }
        if (this.containsKeywords(text, ['spontaneous', 'flexible', 'whatever', 'lazy', 'procrastinate'])) {
          traits.conscientiousness -= 5;
        }

        // Analyze extraversion
        if (this.containsKeywords(text, ['party', 'people', 'social', 'friends', 'group', 'outgoing', 'meet'])) {
          traits.extraversion += 10;
        }
        if (this.containsKeywords(text, ['quiet', 'alone', 'home', 'introvert', 'peaceful', 'books', 'solitude'])) {
          traits.extraversion -= 5;
        }

        // Analyze agreeableness
        if (this.containsKeywords(text, ['help', 'kind', 'care', 'family', 'friend', 'support', 'love'])) {
          traits.agreeableness += 10;
        }
        if (this.containsKeywords(text, ['compete', 'win', 'argue', 'fight', 'independent'])) {
          traits.agreeableness -= 5;
        }

        // Analyze romantic nature
        if (this.containsKeywords(text, ['romantic', 'love', 'relationship', 'date', 'heart', 'feelings', 'emotions'])) {
          traits.romantic += 15;
        }

        // Analyze adventurous spirit
        if (this.containsKeywords(text, ['adventure', 'travel', 'explore', 'hiking', 'sports', 'thrill', 'risk'])) {
          traits.adventurous += 15;
        }
        if (this.containsKeywords(text, ['home', 'cozy', 'netflix', 'comfortable', 'routine', 'safe'])) {
          traits.adventurous -= 5;
        }

        // Analyze intellectual interests
        if (this.containsKeywords(text, ['book', 'read', 'learn', 'study', 'university', 'knowledge', 'science', 'philosophy'])) {
          traits.intellectual += 15;
        }

        // Analyze humor
        if (this.containsKeywords(text, ['funny', 'laugh', 'joke', 'humor', 'comedy', 'fun', 'haha', 'lol', '😂', '😄'])) {
          traits.humor += 15;
        }

        // Analyze ambition
        if (this.containsKeywords(text, ['career', 'success', 'goal', 'achieve', 'business', 'promotion', 'ambitious'])) {
          traits.ambitious += 15;
        }
      }
    }

    // Normalize traits to 0-100 range
    Object.keys(traits).forEach(key => {
      traits[key] = Math.max(0, Math.min(100, traits[key]));
    });

    return traits;
  }

  // Convert personality traits to 3D vector for matching
  static traitsToVector(traits: PersonalityTraits): PersonalityVector {
    return {
      x: traits.extraversion, // Social axis
      y: (traits.openness + traits.intellectual) / 2, // Intellectual axis  
      z: (traits.adventurous + traits.romantic) / 2, // Emotional axis
      energy: (traits.extraversion + traits.adventurous) / 2,
      creativity: (traits.openness + traits.humor) / 2,
      social: (traits.extraversion + traits.agreeableness) / 2
    };
  }

  // Calculate compatibility between two personality vectors
  static calculateCompatibility(
    vector1: PersonalityVector, 
    vector2: PersonalityVector, 
    preference: 'similar' | 'opposite' | 'balanced'
  ): number {
    
    // Calculate 3D distance between personality vectors
    const distance = Math.sqrt(
      Math.pow(vector1.x - vector2.x, 2) +
      Math.pow(vector1.y - vector2.y, 2) +
      Math.pow(vector1.z - vector2.z, 2)
    );

    let compatibility = 0;

    if (preference === 'similar') {
      // Closer vectors = higher compatibility
      compatibility = Math.max(0, 100 - (distance / 2));
    } else if (preference === 'opposite') {
      // Further vectors = higher compatibility (up to a point)
      compatibility = Math.min(100, distance * 1.2);
    } else { // balanced
      // Sweet spot in the middle
      const idealDistance = 50;
      compatibility = 100 - Math.abs(distance - idealDistance);
    }

    // Bonus points for complementary traits
    const energyCompat = this.calculateTraitCompatibility(vector1.energy, vector2.energy, preference);
    const creativityCompat = this.calculateTraitCompatibility(vector1.creativity, vector2.creativity, preference);
    const socialCompat = this.calculateTraitCompatibility(vector1.social, vector2.social, preference);

    // Weighted average
    compatibility = (
      compatibility * 0.6 +
      energyCompat * 0.15 +
      creativityCompat * 0.15 +
      socialCompat * 0.1
    );

    return Math.max(60, Math.min(98, Math.round(compatibility)));
  }

  private static calculateTraitCompatibility(trait1: number, trait2: number, preference: string): number {
    const difference = Math.abs(trait1 - trait2);
    
    if (preference === 'similar') {
      return 100 - difference;
    } else if (preference === 'opposite') {
      return difference;
    } else {
      return 100 - Math.abs(difference - 40); // Sweet spot around 40 points difference
    }
  }

  // Check if conversation is meaningful enough to unlock suggestions
  static isConversationMeaningful(messages: any[]): boolean {
    const userMessages = messages.filter(msg => msg.role === 'user');
    
    // Need at least 8 user messages
    if (userMessages.length < 8) return false;
    
    // Check for variety in topics
    const topics = ['relationship', 'love', 'date', 'personality', 'interest', 'goal', 'value', 'life'];
    let topicsCovered = 0;
    
    for (const topic of topics) {
      if (userMessages.some(msg => msg.content.toLowerCase().includes(topic))) {
        topicsCovered++;
      }
    }
    
    // Need to cover at least 4 different topics
    if (topicsCovered < 4) return false;
    
    // Check for meaningful message length (not just yes/no answers)
    const meaningfulMessages = userMessages.filter(msg => 
      msg.content.split(' ').length >= 5 // At least 5 words
    );
    
    return meaningfulMessages.length >= 6;
  }

  // Generate compatibility explanation
  static generateCompatibilityReason(
    traits1: PersonalityTraits, 
    traits2: PersonalityTraits, 
    preference: string
  ): string {
    const reasons = [];
    
    if (preference === 'similar') {
      if (Math.abs(traits1.extraversion - traits2.extraversion) < 20) {
        reasons.push(traits1.extraversion > 60 ? "both enjoy social activities" : "both appreciate quiet time together");
      }
      if (Math.abs(traits1.adventurous - traits2.adventurous) < 20) {
        reasons.push("share similar adventure levels");
      }
      if (Math.abs(traits1.intellectual - traits2.intellectual) < 20) {
        reasons.push("have compatible intellectual interests");
      }
    } else if (preference === 'opposite') {
      if (Math.abs(traits1.extraversion - traits2.extraversion) > 40) {
        reasons.push("balance each other's social energy");
      }
      if (Math.abs(traits1.conscientiousness - traits2.conscientiousness) > 40) {
        reasons.push("complement each other's organizational styles");
      }
    } else {
      reasons.push("have a balanced mix of similarities and differences");
    }

    if (Math.abs(traits1.humor - traits2.humor) < 30) {
      reasons.push("share a similar sense of humor");
    }

    return reasons.length > 0 
      ? `You ${reasons.join(" and ")}.`
      : "Have complementary personalities that could work well together.";
  }

  private static containsKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }
}

export default PersonalityAnalyzer;