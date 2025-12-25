import axios from "axios";

const API_KEY = "AETRzB3hkWFzKNmjab5+RA==O10sSmrXmO4EG6sI";
const BASE_URL = "https://api.calorieninjas.com/v1/nutrition";

export const searchFoods = async (query) => {
  // Comprehensive validation
  if (!query) {
    console.log("searchFoods: No query provided");
    return [];
  }

  // Trim whitespace and convert to string
  const cleanQuery = String(query).trim();

  // Check if query is empty or too short after trimming
  if (!cleanQuery || cleanQuery.length < 2) {
    console.log("searchFoods: Query too short or empty:", cleanQuery);
    return [];
  }

  // Check if query contains only whitespace or special characters
  if (!/[a-zA-Z0-9]/.test(cleanQuery)) {
    console.log("searchFoods: Query contains no valid characters:", cleanQuery);
    return [];
  }

  try {
    console.log("searchFoods: Searching for:", cleanQuery);

    const response = await axios.get(BASE_URL, {
      params: {
        query: cleanQuery,
      },
      headers: {
        'X-Api-Key': API_KEY,
      },
      timeout: 10000, // 10 second timeout
    });

    const items = response.data.items || [];

    console.log("searchFoods: Found", items.length, "results");

    if (items.length === 0) {
      console.log("searchFoods: No results found for:", cleanQuery);
      return [];
    }

    // Log first result to see structure
    if (items.length > 0) {
      console.log("searchFoods: First result sample:", {
        name: items[0].name,
        calories: items[0].calories,
      });
    }

    // CalorieNinjas returns data already formatted nicely
    const results = items.map((item) => ({
      name: item.name || "Unknown food",
      calories: Math.round(item.calories || 0),
      protein: Math.round(item.protein_g || 0),
      carbs: Math.round(item.carbohydrates_total_g || 0),
      fat: Math.round(item.fat_total_g || 0),
      // Additional nutritional info available if needed:
      // sugar: Math.round(item.sugar_g || 0),
      // fiber: Math.round(item.fiber_g || 0),
      // sodium: Math.round(item.sodium_mg || 0),
      // cholesterol: Math.round(item.cholesterol_mg || 0),
    }));

    console.log("searchFoods: Returning", results.length, "formatted results");
    return results;
  } catch (error) {
    if (error.response) {
      // Server responded with error status
      console.error("searchFoods API Error:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        query: cleanQuery,
      });
      
      // Handle specific error cases
      if (error.response.status === 401) {
        console.error("Authentication failed. Please check your API key.");
      } else if (error.response.status === 400) {
        console.error("Bad request. Check your query format.");
      }
    } else if (error.request) {
      // Request made but no response
      console.error("searchFoods Network Error: No response received");
    } else {
      // Something else happened
      console.error("searchFoods Error:", error.message);
    }
    return [];
  }
};