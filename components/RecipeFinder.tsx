import React, { useState } from 'react';
import { Search, Loader2, Sparkles, ExternalLink, Globe, Plus, Clock, List, ChefHat, ToggleLeft, ToggleRight, Star, Heart, Bookmark } from 'lucide-react';
import { searchRecipes } from '../services/geminiService';
import { RecipeSearchResult, LoadingState, RecipeRating, StructuredRecipe, PantryItem, SavedRecipe } from '../types';
import { Tab } from '../types/app';
import { fetchRecipeImage } from '../services/imageService';
import { RecipeRatingUI } from './RecipeRating';
import RecipeModal from './RecipeModal';
import { logEvent } from 'firebase/analytics';
import { analytics } from '../firebaseConfig';
import { PremiumFeature } from './PremiumFeature';

interface RecipeFinderProps {
    onAddToPlan: (recipe: StructuredRecipe) => void;
    onSaveRecipe: (recipe: StructuredRecipe) => void;
    onDeleteRecipe: (recipe: SavedRecipe) => void;
    onMarkAsMade?: (recipe: StructuredRecipe) => void;
    inventory: PantryItem[];
    ratings: RecipeRating[];
    onRate: (rating: RecipeRating) => void;
    savedRecipes: SavedRecipe[];
    user: User;
    setActiveTab: (tab: Tab) => void;
    persistedResult?: RecipeSearchResult | null;
    setPersistedResult?: (result: RecipeSearchResult | null) => void;
}

export const RecipeFinder: React.FC<RecipeFinderProps> = ({ onAddToPlan, onSaveRecipe, onDeleteRecipe, onMarkAsMade, inventory, ratings, onRate, savedRecipes, user, setActiveTab, persistedResult, setPersistedResult }) => {
        // List of staple items to ignore
        const STAPLES = ['salt', 'pepper', 'oil', 'water', 'flour', 'sugar', 'butter', 'vinegar', 'baking powder', 'baking soda', 'spices', 'seasoning', 'soy sauce', 'cornstarch', 'yeast'];
    const [activeView, setActiveView] = useState<'search' | 'saved'>('search');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
    const [specificQuery, setSpecificQuery] = useState('');
    const [maxCookTime, setMaxCookTime] = useState<string>('60');
    const [maxIngredients, setMaxIngredients] = useState<string>('10');
    const [recipeType, setRecipeType] = useState<'Snack' | 'Dinner' | 'Dessert' | ''>('');
    const [measurement, setMeasurement] = useState<'Metric' | 'Standard'>('Standard');
    const [strictMode, setStrictMode] = useState(false);
  
    // Use persistedResult if available
    const [result, setResult] = useState<RecipeSearchResult | null>(persistedResult || null);
    const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [showRecipeModal, setShowRecipeModal] = useState(false);
    const [modalRecipe, setModalRecipe] = useState<StructuredRecipe | null>(null);
    const [modalIsSavedView, setModalIsSavedView] = useState(false);

    // Popular recipes from CSV
    const csvRecipes: StructuredRecipe[] = [
        {
            title: "Chicken Parmesan",
            description: "Chicken Parmesan is a classic Italian-American dish that consists of breaded chicken cutlets topped with tomato sauce and melted cheese. It's crispy, cheesy, and utterly delicious!",
            ingredients: ["4 boneless, skinless chicken breasts", "1 cup all-purpose flour", "2 large eggs", "1 cup breadcrumbs", "1/2 cup grated Parmesan cheese", "2 cups marinara sauce", "1 cup shredded mozzarella cheese", "2 tablespoons olive oil", "Salt and pepper to taste", "Fresh basil leaves for garnish"],
            instructions: ["Preheat oven to 400°F (200°C).", "Pound chicken breasts to 1/2-inch thickness.", "Season chicken with salt and pepper.", "Dredge in flour, dip in beaten eggs, then coat with breadcrumb-Parmesan mixture.", "Heat olive oil in a skillet over medium-high heat.", "Cook chicken until golden brown on both sides, about 3-4 minutes per side.", "Transfer to a baking dish.", "Top each piece with marinara sauce and mozzarella cheese.", "Bake for 10-15 minutes until cheese is melted and bubbly.", "Garnish with fresh basil and serve hot."],
            cookTime: "35 mins",
            type: "Dinner"
        },
        {
            title: "Beef Stroganoff",
            description: "Beef Stroganoff is a Russian-inspired dish featuring tender strips of beef in a creamy mushroom sauce, served over egg noodles. It's comfort food at its finest!",
            ingredients: ["1 lb beef sirloin, cut into strips", "8 oz mushrooms, sliced", "1 onion, thinly sliced", "2 cloves garlic, minced", "1 cup beef broth", "1 cup sour cream", "2 tablespoons all-purpose flour", "2 tablespoons butter", "2 tablespoons olive oil", "Salt and pepper to taste", "8 oz egg noodles, cooked"],
            instructions: ["Season beef strips with salt and pepper.", "Heat olive oil in a large skillet over medium-high heat.", "Brown beef in batches, remove and set aside.", "In the same skillet, melt butter and sauté onions until soft.", "Add garlic and mushrooms, cook until mushrooms release their moisture.", "Sprinkle flour over vegetables and stir for 1 minute.", "Gradually whisk in beef broth, bring to a simmer.", "Return beef to skillet and cook until sauce thickens.", "Stir in sour cream just before serving.", "Serve over cooked egg noodles."],
            cookTime: "30 mins",
            type: "Dinner"
        },
        {
            title: "Vegetable Stir-Fry",
            description: "This colorful vegetable stir-fry is packed with fresh veggies and tossed in a savory sauce. It's a quick, healthy, and customizable meal that's perfect for busy weeknights.",
            ingredients: ["2 cups broccoli florets", "1 red bell pepper, sliced", "1 yellow bell pepper, sliced", "1 carrot, julienned", "1 cup snap peas", "2 cloves garlic, minced", "1 tablespoon fresh ginger, grated", "3 tablespoons soy sauce", "1 tablespoon sesame oil", "1 tablespoon vegetable oil", "1 tablespoon cornstarch", "2 tablespoons water", "Sesame seeds for garnish"],
            instructions: ["Mix soy sauce, sesame oil, cornstarch, and water in a small bowl.", "Heat vegetable oil in a large wok or skillet over high heat.", "Add garlic and ginger, stir-fry for 30 seconds.", "Add broccoli, carrots, and bell peppers, stir-fry for 3-4 minutes.", "Add snap peas and continue cooking for 2 more minutes.", "Pour in sauce mixture and toss everything together.", "Cook until sauce thickens and vegetables are tender-crisp.", "Garnish with sesame seeds and serve hot."],
            cookTime: "15 mins",
            type: "Dinner"
        },
        {
            title: "Chocolate Chip Cookies",
            description: "These classic chocolate chip cookies are soft, chewy, and loaded with chocolate chips. They're the perfect treat for any occasion and always disappear quickly!",
            ingredients: ["2 1/4 cups all-purpose flour", "1 teaspoon baking soda", "1 teaspoon salt", "1 cup unsalted butter, softened", "3/4 cup granulated sugar", "3/4 cup brown sugar, packed", "2 large eggs", "2 teaspoons vanilla extract", "2 cups chocolate chips", "1 cup chopped walnuts (optional)"],
            instructions: ["Preheat oven to 375°F (190°C).", "In a bowl, whisk together flour, baking soda, and salt.", "In a large bowl, cream together butter and both sugars until light and fluffy.", "Beat in eggs one at a time, then stir in vanilla.", "Gradually blend in the flour mixture.", "Fold in chocolate chips and walnuts if using.", "Drop rounded tablespoons of dough onto ungreased baking sheets.", "Bake for 9-11 minutes until golden brown.", "Cool on baking sheet for 2 minutes, then transfer to wire rack."],
            cookTime: "25 mins",
            type: "Dessert"
        },
        {
            title: "Caesar Salad",
            description: "This classic Caesar salad features crisp romaine lettuce tossed in a creamy dressing with Parmesan cheese and croutons. It's a timeless favorite that's both simple and elegant.",
            ingredients: ["1 large head romaine lettuce, torn into pieces", "1/2 cup Caesar dressing", "1/3 cup grated Parmesan cheese", "1 cup croutons", "1 teaspoon lemon juice", "Freshly ground black pepper", "Anchovy fillets (optional)"],
            instructions: ["Wash and dry romaine lettuce, then place in a large salad bowl.", "Add croutons and Parmesan cheese.", "Drizzle with Caesar dressing and lemon juice.", "Toss gently to coat all ingredients.", "Season with black pepper to taste.", "If using anchovies, chop and sprinkle on top.", "Serve immediately as a side or light meal."],
            cookTime: "10 mins",
            type: "Salad"
        },
        {
            title: "Pancakes",
            description: "These fluffy pancakes are perfect for breakfast or brunch. They're light, golden, and can be topped with your favorite syrup, fruit, or whipped cream.",
            ingredients: ["1 1/2 cups all-purpose flour", "3 1/2 teaspoons baking powder", "1 teaspoon salt", "1 tablespoon white sugar", "1 1/4 cups milk", "1 egg", "3 tablespoons butter, melted", "Maple syrup for serving"],
            instructions: ["In a large bowl, sift together flour, baking powder, salt, and sugar.", "Make a well in the center and pour in milk, egg, and melted butter.", "Mix until smooth, but don't overmix.", "Heat a lightly oiled griddle or frying pan over medium-high heat.", "Pour or scoop batter onto the griddle, using about 1/4 cup for each pancake.", "Cook until bubbles form on the surface and edges look cooked.", "Flip and cook until golden brown on the other side.", "Serve hot with maple syrup."],
            cookTime: "15 mins",
            type: "Breakfast"
        },
        {
            title: "Spaghetti Carbonara",
            description: "Spaghetti Carbonara is a classic Italian pasta dish made with eggs, cheese, pancetta, and black pepper. It's creamy, rich, and incredibly satisfying.",
            ingredients: ["8 oz spaghetti", "4 oz pancetta or bacon, diced", "2 cloves garlic, minced", "2 large eggs", "1/2 cup grated Pecorino Romano cheese", "1/2 cup grated Parmesan cheese", "Freshly ground black pepper", "Salt to taste", "Fresh parsley, chopped (optional)"],
            instructions: ["Cook spaghetti in salted boiling water according to package directions.", "While pasta cooks, cook pancetta in a skillet until crispy.", "Add garlic and cook for 1 minute, then remove from heat.", "In a bowl, whisk together eggs, cheeses, and black pepper.", "Reserve 1 cup pasta water, then drain spaghetti.", "Add hot spaghetti to the skillet with pancetta.", "Remove from heat and quickly stir in egg mixture.", "Add pasta water gradually until sauce reaches desired consistency.", "Serve immediately with extra cheese and parsley if desired."],
            cookTime: "20 mins",
            type: "Dinner"
        },
        {
            title: "Banana Bread",
            description: "This moist and flavorful banana bread is made with ripe bananas and walnuts. It's perfect for breakfast, snacks, or dessert and freezes beautifully.",
            ingredients: ["2 cups all-purpose flour", "1 teaspoon baking soda", "1/4 teaspoon salt", "1/2 cup butter, softened", "3/4 cup brown sugar", "2 large eggs, beaten", "2 1/3 cups mashed overripe bananas", "1 cup chopped walnuts"],
            instructions: ["Preheat oven to 350°F (175°C). Grease a 9x5 inch loaf pan.", "In a large bowl, combine flour, baking soda, and salt.", "In a separate bowl, cream together butter and brown sugar.", "Stir in eggs and mashed bananas until well blended.", "Stir banana mixture into flour mixture until just combined.", "Fold in chopped walnuts.", "Pour batter into prepared loaf pan.", "Bake for 60-65 minutes until a toothpick comes out clean.", "Cool in pan for 10 minutes, then transfer to wire rack."],
            cookTime: "1 hr 10 mins",
            type: "Dessert"
        },
        {
            title: "Grilled Cheese Sandwich",
            description: "This classic grilled cheese sandwich is crispy on the outside and melty on the inside. It's simple comfort food that's ready in minutes.",
            ingredients: ["4 slices bread", "4 slices cheddar cheese", "2 tablespoons butter, softened", "Tomato slices (optional)", "Bacon strips (optional)"],
            instructions: ["Butter one side of each bread slice.", "Place cheese between two slices of bread, buttered sides out.", "Add tomato or bacon if desired.", "Heat a skillet over medium heat.", "Place sandwich in skillet and cook until golden brown, about 2-3 minutes.", "Flip and cook until cheese is melted and bread is golden.", "Cut in half and serve hot."],
            cookTime: "10 mins",
            type: "Lunch"
        },
        {
            title: "Tomato Soup",
            description: "This creamy tomato soup is rich, comforting, and pairs perfectly with a grilled cheese sandwich. It's made with fresh tomatoes and simple seasonings.",
            ingredients: ["6 large ripe tomatoes, chopped", "1 onion, chopped", "2 cloves garlic, minced", "4 cups vegetable broth", "1/2 cup heavy cream", "2 tablespoons butter", "1 tablespoon olive oil", "Salt and pepper to taste", "Fresh basil leaves for garnish"],
            instructions: ["Heat olive oil and butter in a large pot over medium heat.", "Add onion and garlic, sauté until softened.", "Add chopped tomatoes and cook for 5 minutes.", "Pour in vegetable broth and bring to a boil.", "Reduce heat and simmer for 15-20 minutes.", "Blend soup until smooth using an immersion blender.", "Stir in heavy cream and season with salt and pepper.", "Simmer for 5 more minutes.", "Garnish with fresh basil and serve hot."],
            cookTime: "35 mins",
            type: "Soup"
        },
        {
            title: "Stovetop Barbecue Pulled Chicken",
            description: "This stovetop barbecue pulled chicken is tender, flavorful, and perfect for sandwiches or tacos. It's made with simple ingredients and cooks in about 30 minutes.",
            ingredients: ["2 pounds boneless, skinless chicken thighs, cut in half widthwise", "1/2 cup ketchup", "1/4 cup apple cider vinegar", "2 tablespoons brown sugar", "2 teaspoons smoked paprika", "1 teaspoon ground cumin", "1 teaspoon salt", "1 teaspoon black pepper"],
            instructions: ["Mix ketchup, vinegar, brown sugar, smoked paprika, cumin, salt and pepper in a large pot.", "Add chicken to the pot and toss to coat.", "Bring to a simmer over medium heat, then cover partially and cook for 20 minutes.", "Shred the chicken directly in the pot using two forks.", "Cook uncovered for 5-10 minutes until sauce thickens.", "Serve on buns or with your favorite sides."],
            cookTime: "30 mins",
            type: "Dinner"
        },
        {
            title: "Creamy Cavatappi",
            description: "This creamy cavatappi pasta is rich and comforting, made with Parmesan cheese, heavy cream, and garlic. It's a simple yet elegant dish perfect for weeknights.",
            ingredients: ["8 ounces cavatappi pasta", "1 tablespoon unsalted butter", "2 cloves garlic, minced", "3/4 cup heavy cream", "1/2 teaspoon kosher salt", "1/2 teaspoon black pepper", "1/2 cup grated Parmesan cheese", "1 tablespoon fresh lemon juice", "1 cup frozen peas"],
            instructions: ["Cook pasta according to package directions, reserving 1/2 cup pasta water.", "While pasta cooks, melt butter in a skillet and sauté garlic for 30 seconds.", "Add cream, salt, and pepper, bring to a simmer.", "Stir in Parmesan cheese until melted.", "Add lemon juice and thawed peas.", "Drain pasta and add to sauce with reserved water.", "Toss until creamy and serve immediately."],
            cookTime: "20 mins",
            type: "Dinner"
        },
        {
            title: "Grilled Cedar Plank Brie",
            description: "Grilled brie on a cedar plank is smoky, melty, and delicious. Served with crusty bread, it's the perfect appetizer for any gathering.",
            ingredients: ["1 (8-ounce) wheel brie cheese", "1/2 cup fresh blackberries, halved", "1 tablespoon honey", "2 teaspoons balsamic vinegar", "1/2 tablespoon chopped fresh thyme", "1/2 teaspoon kosher salt", "1/2 teaspoon black pepper"],
            instructions: ["Soak cedar plank in water for 30 minutes to 2 hours.", "Preheat grill to medium heat.", "Mix blackberries, honey, balsamic vinegar, thyme, salt, and pepper.", "Place brie on plank and top with blackberry mixture.", "Grill over indirect heat for 10-12 minutes until brie is soft.", "Serve immediately with crusty bread."],
            cookTime: "15 mins",
            type: "Appetizer"
        },
        {
            title: "Pizza Lasagna",
            description: "Pizza lasagna combines the best of both worlds - layers of lasagna noodles with pizza toppings and cheese. It's a fun twist on traditional lasagna.",
            ingredients: ["9 ounces oven-ready lasagna noodles", "1 (48-ounce) jar marinara sauce", "1 1/2 pounds low-moisture mozzarella, shredded", "5 ounces sliced pepperoni"],
            instructions: ["Preheat oven to 375°F.", "Spread marinara sauce in a 9x13-inch baking dish.", "Layer 3 noodles, sauce, mozzarella, and pepperoni.", "Repeat layers 4 more times.", "Cover with foil and bake for 25 minutes.", "Remove foil and bake 5 more minutes until bubbly.", "Let cool 15 minutes before serving."],
            cookTime: "45 mins",
            type: "Dinner"
        },
        {
            title: "Cambodian Lemongrass Beef Skewers",
            description: "These Cambodian lemongrass beef skewers are flavorful and aromatic, marinated in kroeung paste and grilled to perfection. They're perfect for appetizers or main course.",
            ingredients: ["1 pound boneless ribeye or chuck steak", "1/2 cup kroeung paste", "2 1/2 teaspoons brown sugar", "4 cloves garlic, finely minced", "2 tablespoons neutral oil", "1/2 tablespoon oyster sauce", "1/2 tablespoon chicken bouillon powder", "1/2 tablespoon Shaoxing wine", "1/2 teaspoon fish sauce", "1 teaspoon ground white pepper"],
            instructions: ["Freeze beef for 30 minutes, then slice into 1/8-inch thick pieces.", "Mix all marinade ingredients and marinate beef for 2 hours.", "Thread beef onto soaked bamboo skewers.", "Grill over high heat for 3 minutes per side.", "Serve immediately."],
            cookTime: "20 mins",
            type: "Dinner"
        },
        {
            title: "Strawberry Shortcake Cake",
            description: "This strawberry shortcake cake is a layered dessert with tender cake, macerated strawberries, and whipped cream. It's perfect for summer celebrations.",
            ingredients: ["2 2/3 cups all-purpose flour", "1 1/2 cups sugar", "2 tablespoons baking powder", "1 teaspoon salt", "1 teaspoon baking soda", "1 cup unsalted butter, softened", "1 1/4 cups buttermilk", "2 teaspoons vanilla extract", "3 large eggs", "2 pounds fresh strawberries", "2 cups heavy cream", "1/2 cup powdered sugar"],
            instructions: ["Preheat oven to 350°F. Grease three 8-inch cake pans.", "Mix dry ingredients, then add butter and buttermilk.", "Beat in eggs and vanilla.", "Bake for 21-24 minutes until done.", "Slice and macerate strawberries with sugar.", "Whip cream with powdered sugar.", "Layer cake with strawberries and whipped cream."],
            cookTime: "45 mins",
            type: "Dessert"
        },
        {
            title: "Grilled Chicken Caprese Sandwich",
            description: "This grilled chicken Caprese sandwich features juicy chicken, fresh mozzarella, tomatoes, and basil pesto on ciabatta bread. It's a delicious and satisfying lunch.",
            ingredients: ["2 large boneless, skinless chicken breasts", "2 tablespoons olive oil", "2 teaspoons Italian seasoning", "1/2 teaspoon salt", "1/4 teaspoon pepper", "4 ciabatta rolls", "1/4 cup pesto", "1 (8-ounce) ball mozzarella, sliced", "2 (8-ounce) beefsteak tomatoes, sliced", "20 fresh basil leaves", "2 tablespoons balsamic glaze"],
            instructions: ["Cut chicken breasts in half lengthwise and pound to 1/4-inch thickness.", "Marinate in olive oil, Italian seasoning, salt, and pepper for 30 minutes.", "Grill chicken for 3 minutes per side until cooked through.", "Toast rolls on grill.", "Spread pesto on rolls, add mozzarella, tomato, chicken, and basil.", "Drizzle with balsamic glaze and serve."],
            cookTime: "25 mins",
            type: "Lunch"
        },
        {
            title: "Sour Cream and Onion Potato Salad",
            description: "This potato salad is creamy and flavorful with sour cream, fresh herbs, and green onions. It's a refreshing twist on traditional potato salad.",
            ingredients: ["2 pounds Yukon gold potatoes, cut into 1-inch pieces", "1 1/2 teaspoons kosher salt, divided", "1 bunch green onions, sliced", "3/4 cup sour cream", "3 tablespoons mayonnaise", "1 tablespoon fresh lemon juice", "1 teaspoon Dijon mustard", "1 teaspoon dried minced garlic", "1 teaspoon dried minced onion", "1/2 teaspoon black pepper", "1 bunch fresh chives, chopped"],
            instructions: ["Boil potatoes in salted water until tender, about 15 minutes.", "Drain and let cool.", "Mix sour cream, mayonnaise, lemon juice, mustard, garlic, onion, salt, and pepper.", "Toss with cooled potatoes and green onions.", "Chill for at least 1 hour before serving.", "Garnish with chopped chives."],
            cookTime: "30 mins",
            type: "Salad"
        },
        {
            title: "Yuca Fries with Spicy Mayo",
            description: "Crispy yuca fries served with a spicy mayonnaise dipping sauce. Yuca (cassava) makes for delicious fries that are naturally gluten-free.",
            ingredients: ["2 pounds fresh yuca", "Kosher salt", "2 quarts neutral oil for frying", "1/2 cup mayonnaise", "2 jalapeños, minced", "2 cloves garlic, minced", "1 tablespoon lime juice", "1 tablespoon vinegar", "Salt and pepper to taste"],
            instructions: ["Peel and cut yuca into 4-inch chunks.", "Boil in salted water until tender, about 20 minutes.", "Cool, then cut into wedges and remove fibrous core.", "Fry in hot oil (375°F) until golden, about 4 minutes per batch.", "Mix mayonnaise with jalapeños, garlic, lime juice, and vinegar.", "Season spicy mayo with salt and pepper.", "Serve fries hot with spicy mayo."],
            cookTime: "35 mins",
            type: "Appetizer"
        },
        {
            title: "Corn Dog Muffins",
            description: "These corn dog muffins combine the flavors of corn dogs in muffin form. They're fun, kid-friendly, and perfect for parties or snacks.",
            ingredients: ["1/2 cup finely ground yellow cornmeal", "1/2 cup all-purpose flour", "1 teaspoon baking powder", "1/4 teaspoon baking soda", "1/8 teaspoon salt", "2 tablespoons granulated sugar", "1/4 cup butter, melted", "1 egg", "1/2 cup buttermilk", "5-6 hot dogs, cut into 1-inch pieces"],
            instructions: ["Preheat oven to 375°F. Grease mini muffin tin.", "Mix dry ingredients.", "Whisk melted butter, egg, and buttermilk.", "Combine wet and dry ingredients.", "Fill muffin cups halfway, add hot dog piece to each.", "Bake for 8-10 minutes until golden.", "Serve warm with mustard or ketchup."],
            cookTime: "20 mins",
            type: "Appetizer"
        },
        {
            title: "Lumpia Shanghai",
            description: "Crispy Filipino spring rolls filled with ground pork, shrimp, and vegetables. These lumpia are perfect as appetizers or snacks.",
            ingredients: ["30-40 egg roll wrappers", "1 pound ground pork", "1/2 pound fresh shrimp, chopped", "2 green onions, sliced", "1 medium onion, chopped", "1 cup finely chopped carrots", "1 large egg", "1 tablespoon all-purpose flour", "2 tablespoons soy sauce", "1 tablespoon rice wine", "1/2 tablespoon sesame oil", "1/2 teaspoon salt", "1/4 teaspoon black pepper", "3 cups vegetable oil for frying"],
            instructions: ["Mix pork, shrimp, vegetables, egg, flour, soy sauce, rice wine, sesame oil, salt, and pepper.", "Place 1 tablespoon filling on each wrapper.", "Roll tightly into thin cylinders.", "Freeze for at least 1 hour.", "Deep fry at 350°F for 5-6 minutes until golden.", "Serve with sweet-sour sauce."],
            cookTime: "45 mins",
            type: "Appetizer"
        },
        {
            title: "Oreo Ice Cream Cake",
            description: "This no-churn Oreo ice cream cake features layers of cookies and cream ice cream, chocolate, and crunchies. It's a decadent frozen dessert.",
            ingredients: ["6 whole Oreos", "1 (14-ounce) can sweetened condensed milk", "1 3/4 teaspoons vanilla extract", "1/4 teaspoon kosher salt", "2 cups cold heavy cream", "10 Oreos for crunchies", "2 tablespoons melted butter", "Chocolate shell topping"],
            instructions: ["Line a springform pan with plastic wrap.", "Crush 6 Oreos and mix with condensed milk, vanilla, and salt.", "Whip heavy cream to stiff peaks.", "Fold whipped cream into condensed milk mixture.", "Make crunchies by mixing crushed Oreos with butter.", "Layer vanilla ice cream, Oreos, fudge, and crunchies in pan.", "Freeze overnight.", "Frost with whipped cream and decorate with Oreos."],
            cookTime: "30 mins + freezing",
            type: "Dessert"
        },
        {
            title: "Mul Naengmyeon (Korean Cold Noodle Soup)",
            description: "Chilled Korean noodle soup with beef broth, pickled radish, and various toppings. It's refreshing and perfect for hot summer days.",
            ingredients: ["1 pound beef brisket", "8 cups water", "4 cloves garlic, smashed", "2 large green onions, cut in thirds", "1 (1-inch) piece ginger", "1 1/2 tablespoons soy sauce", "Korean radish for pickling", "Rice vinegar", "Sugar", "Gochujang paste", "Hard-boiled eggs", "Cucumbers", "Korean pear", "Naengmyeon noodles"],
            instructions: ["Simmer beef brisket with water, garlic, green onions, ginger, and soy sauce for 1 hour.", "Strain and chill broth overnight.", "Pickle radish slices in vinegar and sugar mixture.", "Cook noodles according to package.", "Assemble bowls with noodles, cold broth, beef, pickled radish, eggs, cucumbers, and pear.", "Serve with gochujang sauce for spice."],
            cookTime: "1 hr 30 mins",
            type: "Soup"
        },
        {
            title: "Boba Tea",
            description: "Homemade bubble tea with chewy tapioca pearls and your choice of tea. This classic drink is fun to make and even better to sip.",
            ingredients: ["3 1/2 cups water", "1 cup dried tapioca pearls", "4 bags black tea", "1 cup sugar", "2 cups water for simple syrup", "2 cups milk", "Ice cubes"],
            instructions: ["Cook tapioca pearls in boiling water for 15 minutes, then let sit for 20 minutes.", "Brew tea bags in hot water for 5 minutes.", "Make simple syrup by dissolving sugar in hot water.", "Mix tea, milk, simple syrup, and cooked pearls.", "Serve over ice."],
            cookTime: "30 mins",
            type: "Drink"
        },
        {
            title: "Easy Meatloaf",
            description: "This simple meatloaf is juicy and flavorful, made with ground chuck and basic seasonings. It's comfort food at its best.",
            ingredients: ["2 pounds ground chuck", "2 large eggs", "1/2 cup dry breadcrumbs", "1 tablespoon yellow mustard", "1 tablespoon Worcestershire sauce", "1 tablespoon ketchup", "2 teaspoons onion powder", "1 teaspoon garlic powder", "1 teaspoon salt", "1/2 teaspoon black pepper", "1 cup milk"],
            instructions: ["Preheat oven to 350°F.", "Mix all ingredients except ketchup in a bowl.", "Form into a loaf in a 9x13-inch pan.", "Spread ketchup on top.", "Bake for 1 hour 20 minutes until internal temperature reaches 160°F.", "Let rest 10 minutes before slicing."],
            cookTime: "1 hr 30 mins",
            type: "Dinner"
        },
        {
            title: "Peach Crumb Bars",
            description: "These peach crumb bars feature a buttery crust, fresh peach filling, and crumbly topping. They're perfect for summer desserts.",
            ingredients: ["1 3/4 cups all-purpose flour", "3/4 cup granulated sugar", "1/2 teaspoon kosher salt", "1/4 teaspoon ground cinnamon", "1 1/2 sticks cold unsalted butter, cubed", "2 teaspoons vanilla extract", "2 pounds fresh peaches, sliced", "1/2 cup brown sugar", "2 tablespoons cornstarch", "1 tablespoon lemon juice", "1 teaspoon ground cinnamon"],
            instructions: ["Preheat oven to 375°F. Grease an 8x8-inch pan.", "Mix flour, sugar, salt, and cinnamon.", "Cut in cold butter until crumbly.", "Press 3/4 of mixture into pan for crust.", "Toss peaches with brown sugar, cornstarch, lemon juice, and cinnamon.", "Spread over crust and top with remaining crumb mixture.", "Bake for 50 minutes until golden.", "Cool before slicing."],
            cookTime: "1 hr",
            type: "Dessert"
        },
        {
            title: "Goetta",
            description: "Goetta is a German-inspired breakfast meat made with ground pork, beef, and oats. It's sliced and fried until crispy, perfect for breakfast.",
            ingredients: ["4 cups water", "2 1/2 cups pinhead oats", "2 teaspoons salt", "1 pound ground pork", "1 pound ground beef", "2 teaspoons poultry seasoning", "2 teaspoons onion powder", "2 teaspoons garlic powder", "1 teaspoon white pepper", "1/4 teaspoon cayenne", "1/4 teaspoon nutmeg", "4 cups low-sodium beef stock", "2 bay leaves"],
            instructions: ["Cook oats in water with salt until thick, about 30 minutes.", "Mix meats with seasonings.", "Combine meat mixture with oats and stock.", "Cook for 1-2 hours until very thick.", "Pour into loaf pans and refrigerate overnight.", "Slice and fry until crispy.", "Serve hot."],
            cookTime: "2 hrs + chilling",
            type: "Breakfast"
        },
        {
            title: "Air Fryer Zucchini Chips",
            description: "Crispy air-fried zucchini chips are a healthy alternative to potato chips. They're lightly seasoned and perfect for snacking.",
            ingredients: ["2 medium zucchini", "1/2 teaspoon kosher salt", "1/3 cup plain breadcrumbs", "3 tablespoons grated Parmesan", "2 teaspoons cornstarch", "1 teaspoon granulated garlic", "1/4 teaspoon black pepper", "1 pinch cayenne", "1 tablespoon olive oil", "Cooking spray"],
            instructions: ["Slice zucchini into thin rounds and salt for 5 minutes.", "Mix breadcrumbs, Parmesan, cornstarch, garlic, pepper, and cayenne.", "Pat zucchini dry and toss with olive oil.", "Coat zucchini in breadcrumb mixture.", "Air fry at 325°F for 10 minutes, then flip and cook 8-12 minutes more.", "Serve immediately."],
            cookTime: "25 mins",
            type: "Appetizer"
        },
        {
            title: "Oreo Ice Cream Sandwiches",
            description: "These 2-ingredient ice cream sandwiches are made with just Oreos and ice cream. They're simple, delicious, and no-churn required.",
            ingredients: ["16 Oreo sandwich cookies", "1 pint premium ice cream"],
            instructions: ["Line a loaf pan with plastic wrap.", "Soften ice cream slightly and spread into pan.", "Freeze until firm.", "Cut ice cream into slices.", "Sandwich each slice between two Oreo halves.", "Freeze until solid.", "Serve immediately or wrap for later."],
            cookTime: "15 mins + freezing",
            type: "Dessert"
        },
        {
            title: "Homemade Poultry Seasoning",
            description: "A versatile homemade poultry seasoning blend perfect for chicken, turkey, and other poultry dishes. This aromatic mix adds depth and flavor to your roasted birds.",
            ingredients: ["1 tablespoon rubbed sage", "2 teaspoons dried thyme", "1 teaspoon dried marjoram", "1/2 teaspoon dried crushed rosemary", "1/8 teaspoon ground white pepper", "1/8 teaspoon ground nutmeg"],
            instructions: ["Combine the ingredients: Whisk together all of the ingredients in a small bowl until evenly combined.", "Grind until fine: If desired, process the mixture in a spice grinder (or grind with a mortar and pestle) until a fine powder forms, about 30 seconds.", "Store: Transfer to an airtight jar or container. Store in a cool, dry place for up to 6 months."],
            cookTime: "0 mins",
            type: "Seasoning"
        },
        {
            title: "Banh Mi Salad",
            description: "A fresh and vibrant Vietnamese-inspired salad featuring pickled vegetables, marinated chicken, and crisp lettuce. It's a lighter take on the classic banh mi sandwich.",
            ingredients: ["1/2 cup distilled white vinegar", "1/2 cup water", "1/4 cup granulated sugar", "1/2 teaspoon salt", "2 medium carrots", "1 (6-ounce) piece daikon", "1/2 cup lemongrass", "4 cloves garlic", "1 tablespoon granulated sugar", "2 tablespoons olive oil", "2 tablespoons fish sauce", "1 tablespoon soy sauce", "1 teaspoon black pepper", "1 1/2 pounds chicken thighs", "1/4 cup lime juice", "1/4 cup mayonnaise", "1 jalapeño", "1 clove garlic", "1/2 teaspoon salt", "1 head lettuce", "2 tablespoons dồ chua", "1 pound chicken", "2 cucumbers"],
            instructions: ["Prepare the dồ chua: Combine the vinegar, water, sugar, and salt in a medium bowl and stir until fully dissolved. Cut the carrots and daikon into 3-inch long, 1/8-inch thick matchsticks (about 1 cup each). Add to the bowl and stir to combine. Gently push down any vegetables that aren't submerged in the pickling liquid and let the mixture sit for at least 30 minutes.", "Marinate the chicken: Combine the lemongrass, garlic, sugar, olive oil, fish sauce, soy sauce, and black pepper in an 8x8-inch baking dish. Add the chicken thighs, toss to coat, and spread in an even layer. Transfer to the refrigerator to marinate for at least 15 minutes while the oven preheats, or cover and let marinate up to overnight in the fridge.", "Preheat the oven and make the dressing: While the chicken is marinating, arrange a rack in the middle of the oven and heat the oven to 425°F. Whisk together the lime juice, mayonnaise, olive oil, jalapeño, garlic, and salt in a small bowl until combined and emulsified.", "Bake the chicken: Transfer the chicken to the oven and bake until it reaches an internal temperature of 165°F, 20 to 25 minutes. Use two forks to shred the chicken into large pieces and toss to coat in the pan juices.", "Assemble the salad: Drain the dồ chua. Place the lettuce in a large bowl and toss with 1/4 cup of the dressing. Divide the lettuce among individual shallow bowls or plates then arrange the dồ chua, chicken, and cucumbers in sections on top of the dressed lettuce. Drizzle with the remaining dressing and garnish with the cilantro."],
            cookTime: "25 mins",
            type: "Salad"
        },
        {
            title: "Pizza Salad",
            description: "A fun and flavorful salad that captures all the best elements of pizza - pepperoni, cheese, olives, and a tangy vinaigrette dressing.",
            ingredients: ["1/4 cup red wine vinegar", "1 teaspoon tomato paste", "2 teaspoons Dijon mustard", "1/2 teaspoon sugar", "1 1/2 teaspoons dried oregano", "1 teaspoon garlic powder", "1/2 teaspoon kosher salt", "1 teaspoon black pepper", "3/4 cup extra-virgin olive oil", "1/2 cup pepperoni", "1 cup mozzarella cheese", "1/2 cup black olives", "1/2 red onion", "1 bell pepper", "2 cups romaine lettuce", "2 cups iceberg lettuce", "1/2 cup grated Parmesan cheese"],
            instructions: ["Make the dressing: Add the red wine vinegar, tomato paste, Dijon mustard, salt, pepper, sugar, dried oregano,garlic powder and olive oil to a resealable jar or airtight container. Shake really well to combine. Taste and season with more salt, pepper and sugar as desired; it should be a very flavorful, emulsified vinaigrette.", "Prepare the salad ingredients: Add pepperoni, mozzarella cheese, black olives, red onion, bell pepper and both lettuces to a large bowl.", "Toss and serve: Once ready to serve, shake the dressing really well once more. Add about half to the bowl with the salad and toss until everything is well and evenly coated. Add more dressing if desired, and keep the rest in the jar in the fridge for up to 3 days. Top the salad with grated Parmesan cheese and serve immediately with warm breadsticks on the side."],
            cookTime: "0 mins",
            type: "Salad"
        },
        {
            title: "Homemade Cosmic Brownies",
            description: "Rich, fudgy brownies topped with a decadent chocolate ganache and colorful candy-coated sprinkles. These brownies are a fun and indulgent treat.",
            ingredients: ["Nonstick cooking spray", "1/2 cup (113g) unsalted butter", "1/4 cup (28g) Dutch-process cocoa powder", "2 tablespoons neutral oil, such as canola or vegetable", "5 ounces (142g) bittersweet chocolate, finely chopped", "2/3 cup (145g) granulated sugar", "1/3 cup (72g) packed light brown sugar", "2 large eggs, at room temperature", "1 teaspoon vanilla extract", "1/4 cup (32g) all-purpose flour", "1/2 teaspoon baking powder", "1/2 teaspoon kosher salt", "4 ounces (113g) bittersweet chocolate, finely chopped", "Pinch kosher salt", "1/2 cup heavy cream", "1/2 cup candy-coated chocolate chip sprinkles"],
            instructions: ["Preheat the oven to 350°F. Place a rack in the middle of the oven and preheat. Lightly spray an 8x8-inch square baking pan with nonstick cooking spray and line with a sheet of parchment that completely covers the bottom with a slight overhang on two sides. Lightly spray the pan once more, taking care to grease the parchment and sides.", "Make the chocolate mixture: In a small saucepan, melt the butter over medium heat until just melted, swirling the pan as needed to avoid browning, 2 1/2 to 3 minutes. Remove from the heat. Add the cocoa powder and oil to the hot butter and whisk to fully incorporate and bloom the cocoa. Add the chopped bittersweet chocolate and whisk until fully melted and combined. Set aside to cool slightly while you whisk the egg mixture.", "Whisk the sugars, eggs, and vanilla together: In a large bowl, vigorously whisk the granulated sugar, light brown sugar, eggs, and vanilla until lightened in color and well combined, about 2 minutes. Scrape the chocolate mixture into the bowl with the egg mixture and whisk to combine.", "Combine the dry ingredients and add to the batter: In a small bowl, whisk the flour, baking powder, and salt to combine. Add the flour mixture to the chocolate mixture and whisk until just combined. It's okay if there are some flour streaks. Use a rubber spatula to give the batter a few good folds, taking care to scrape the bottom of the bowl to get all the dry ingredients, until all the flour is incorporated.", "Transfer the batter to the pan and bake: The brownie batter will be on the thicker side. Scrape the batter into the prepared pan and spread into an even layer using the spatula, a small offset spatula, or the back of a spoon. Bake the brownies on the middle rack of the oven the top has a paper-thin crinkly appearance, and a toothpick comes out clean or with moist crumbs (not wet batter), 25 to 28 minutes. The brownies will likely puff around the 25-minute mark with a toothpick still coming out wet, then settle in the next couple minutes. Once the brownies settle, they are typically ready. Cool the brownies completely in their pan set over a wire rack, about 1 hour.", "Make the ganache: Once the brownies are cool, make the ganache. Combine the chopped chocolate and pinch of salt in a small bowl or large glass measuring cup. In a small saucepan (you can rinse, dry, and reuse the same one from the brownies), heat the heavy cream over medium heat until it comes to a simmer with vigorous bubbling just around the edges and steam coming off the surface, 1 to 2 minutes. Immediately pour the hot cream over the chocolate, let sit for a minute, then stir until smooth and silky and all the chocolate is melted.", "Pour the ganache over the brownies: Lift the brownies out of the pan by the parchment overhang and transfer to a cutting board. If desired, you can flip the brownies over so that the bottom is facing up for a very even surface to spread the ganache. While the ganache is still warm and spreadable, pour it over the brownies and use a small offset spatula or the back of a spoon to spread into an even layer. It's okay if it doesn't look completely smooth at first. The ganache will settle into itself. Try to avoid pushing the ganache over the sides. Top the ganache with the candy-coated chocolate chip sprinkles as desired.", "Set, slice, and serve: Transfer the brownies to the refrigerator to chill until the ganache is set and firm enough to cut, about 30 minutes. Use a hot, dry knife (I like to run my knife under hot water and then wipe it dry with a clean towel) to cut the brownies, wiping the knife clean between each cut. If cutting into bars and adding the signature perforated line, first cut the brownies down the center to create two long halves. Lightly drag the side of an offset spatula, back of a butter knife, or skewer in a straight line down the middle length of each half to create the signature look, taking care to not drag through all the way to the brownie. Then, cut each half into 4 pieces with the indentation running crosswise to yield 8 bars total. Alternatively, you can cut the brownies into 16 squares and skip the perforated line altogether. The brownies can be stored in a single layer in an airtight container at room temperature for up to 2 days or chilled in the refrigerator for up to 1 week."],
            cookTime: "25-28 mins",
            type: "Dessert"
        },
        {
            title: "Garlic Fried Rice",
            description: "Simple and flavorful fried rice infused with aromatic garlic. This quick side dish pairs perfectly with Asian-inspired meals.",
            ingredients: ["3 to 4 cups cooked long grain white rice, 1 to 2 days old, refrigerated", "1 teaspoon salt, divided", "2 tablespoons vegetable oil", "4 large cloves garlic, minced", "1/4 teaspoon white pepper", "1 thinly sliced green onion or a handful of chives, optional, for garnish"],
            instructions: ["Prepare the rice: Add the cooked, cold rice to a large mixing bowl. Use your hands to fluff the grains to break apart and loosen them up. Sprinkle 1/2 teaspoon salt all over the rice. Mix well with a spoon and set aside.", "Stir fry: Place a large skillet or wok over medium-high heat and add the oil. Once hot, add the garlic and cook for 30 seconds to 1 minute until crisp and light golden brown but not burnt. Add the rice. Using a spatula or cooking spoon, stir thoroughly to mix the garlic and oil into the grains. This should take about 2 minutes. Lower the heat to medium if the skillet gets too hot. You'll know it's too hot if the rice is sticking to the pan—you do not want the rice to burn. Sprinkle the remaining 1/2 teaspoon of salt and the white pepper all over the rice. Stir the rice well for seasonings to blend, about 1 to 2 minutes.", "Serve: Garnish with green onion or chives, if desired. Serve warm as an accompaniment to breakfast, lunch, or dinner."],
            cookTime: "5 mins",
            type: "Dinner"
        },
        {
            title: "Monster Cookies",
            description: "Chewy, oatmeal cookies loaded with peanut butter, chocolate chips, and M&Ms. These cookies are thick, soft, and full of mix-ins.",
            ingredients: ["1 cup (255g) creamy peanut butter", "1/4 cup unsalted butter, room temperature", "1/2 cup (100g) packed light brown sugar", "1/2 cup (100g) granulated sugar", "2 large eggs, room temperature", "2 teaspoons vanilla extract", "1 teaspoon baking soda", "1/2 teaspoon kosher salt", "3 cups (260g) quick-cooking oats", "1 cup M&Ms", "1 cup semi-sweet chocolate chips"],
            instructions: ["Preheat the oven to 350°F. Line two baking sheets with parchment paper or silicone baking mats.", "Cream the peanut butter, butter, and sugars: In a large bowl or stand mixer, cream together the peanut butter, butter, brown sugar, and granulated sugar on medium speed for 2 minutes, scraping down the sides halfway through.", "Add the eggs and vanilla: Stop the mixer and add both eggs and the vanilla. Beat for 2 minutes on medium speed. It will look like a thick paste.", "Add the dry ingredients and mix-ins: Stop the mixer and scrape down the sides. Add the baking soda and salt and beat for 30 seconds more. Add the oats and mix on low speed until fully combined. Reserve 2 tablespoons each of the M&Ms and chocolate chips and add the remainder to the oat mixture. Stir by hand with a spatula and combine thoroughly.", "Scoop and bake: Use a heaping medium cookie scoop or spoon to portion the dough into 1 1/2-inch balls (for a total of 22 or so balls) and place them at least 2 inches apart on the prepared baking sheets. Then, using your hands, roll them into uniform balls and press the reserved M&Ms and chocolate chips onto the tops of each cookie dough ball. Bake until the edges are just starting to turn golden brown, 12 to 16 minutes, rotating the pans halfway."],
            cookTime: "12-16 mins",
            type: "Dessert"
        },
        {
            title: "Stuffed Pepper Soup",
            description: "A hearty soup that captures all the flavors of stuffed peppers in a comforting bowl. Loaded with ground beef, rice, and vegetables in a savory broth.",
            ingredients: ["2 tablespoons olive oil", "1 large yellow onion, chopped (about 2 cups)", "3 cups chopped bell pepper, any color (from 3 bell peppers)", "6 garlic cloves, chopped (about 2 tablespoons)", "2 teaspoons smoked paprika", "1 teaspoon kosher salt", "1 teaspoon ground cumin", "1 pound lean ground beef (85:15)", "1 (15-ounce) can crushed tomatoes", "4 cups beef broth", "1 (8.8-ounce) package precooked microwavable white rice", "6 ounces sharp white Cheddar cheese, shredded (about 1 1/2 cups)", "Chopped fresh flat-leaf parsley, for serving"],
            instructions: ["Sauté the vegetables: Heat the oil in a large Dutch oven over medium. Add the onion, bell pepper, garlic, paprika, salt, and cumin; cook, stirring often, until the vegetables are tender, about 8 minutes.", "Brown the beef: Increase the heat to medium-high and stir in the ground beef. Cook, stirring often with a wooden spoon to crumble the meat into smaller pieces, until cooked through, about 6 minutes. If there's a lot of fat in the pan, drain off most (but not all) of it. Stir in the crushed tomatoes, beef broth, and rice.", "Simmer the soup: Bring the soup to a boil over medium-high; reduce the heat to medium-low and simmer until the flavors meld, about 25 minutes.", "Serve the soup: Divide the soup evenly among 6 bowls. Top evenly with cheese and garnish with parsley."],
            cookTime: "25 mins",
            type: "Soup"
        },
        {
            title: "Chicken Pot Pie Soup",
            description: "Creamy, comforting soup with all the classic chicken pot pie flavors - tender chicken, vegetables, and herbs in a rich broth.",
            ingredients: ["3 tablespoons unsalted butter", "1 large yellow onion, chopped (about 2 cups)", "2 small carrots, chopped (about 1 1/4 cups)", "2 medium ribs celery, sliced (about 1 1/4 cups)", "6 large garlic cloves, chopped (about 2 tablespoons)", "1 1/2 teaspoons kosher salt", "1 teaspoon dried thyme", "3 tablespoons all-purpose flour", "6 cups chicken broth", "2 cups shredded chicken (from 1 rotisserie chicken)", "2 cups chopped red potatoes (about 4 potatoes)", "2 cups frozen peas (from one 16-ounce bag)", "1/2 cup half and half", "2 cups oyster crackers", "2 tablespoons olive oil", "1/2 teaspoon kosher salt", "1/2 teaspoon dried thyme", "1/8 teaspoon cayenne pepper (optional)"],
            instructions: ["Preheat the oven If you're making the optional toasted oyster crackers, preheat the oven to 375°F. Line a large rimmed baking sheet with foil; set aside. Start the soup: Melt the butter in a large Dutch oven over medium. Add the onion, carrots, celery, garlic, salt, and thyme. Cook, stirring often, until the vegetables are tender, 10 to 12 minutes. Stir in the flour; cook, stirring constantly, until the flour coats the vegetables, about 1 minute.", "Simmer the soup: Stir the broth, chicken, and potatoes together in a Dutch oven. Bring to a boil over medium-high; reduce heat to medium-low, and simmer until the flavors meld and the potatoes are cooked through, about 20 minutes. Stir in the frozen peas and half-and-half and let cook an additional 5 minutes until peas are warm throughout.", "Meanwhile, make the toasted oyster crackers: Combine the oyster crackers, olive oil, kosher salt, dried thyme, and cayenne pepper (if using) in a large bowl and toss to coat. Transfer to the baking sheet and spread in an even layer. Bake until golden brown and toasted, about 10 minutes, stirring once halfway through.", "Serve: Divide soup evenly among 6 bowls. Top with toasted oyster crackers, if desired."],
            cookTime: "20 mins",
            type: "Soup"
        },
        {
            title: "Baked Chicken Breasts",
            description: "Simple, juicy baked chicken breasts seasoned with salt and pepper. This basic preparation lets the natural flavors shine through.",
            ingredients: ["4 medium boneless, skinless chicken breasts (about 2 pounds total)", "1 tablespoon kosher salt", "1 teaspoon black pepper", "1 tablespoon olive oil"],
            instructions: ["Dry brine the chicken and preheat the oven: Lay the chicken breasts on a plate or cutting board. Grab about half the salt with your fingertips and hold your hand at least 1 foot over the cutting board, then sprinkle the salt evenly over the chicken. Flip them and repeat so both sides are well seasoned. Set a timer for 15 minutes and preheat the oven to 425°F.", "Prepare the chicken: Once the timer has gone off, use a clean paper towel to pat the top of the chicken breasts dry. Transfer the chicken breasts dry side down to a rimmed baking pan or casserole dish, in a single layer, then pat the side that's now facing up dry. Season with black pepper and drizzle with olive oil.", "Bake, rest, and serve: Bake at 425°F for 20 to 30 minutes, or until the thickest part of each breast reads at least 155°F with an instant-read thermometer. Remove the chicken from the oven and let rest for at least 10 minutes, ensuring that the temperature rises to 165°F before serving."],
            cookTime: "20-30 mins",
            type: "Dinner"
        },
        {
            title: "Honey Popcorn",
            description: "Sweet and crunchy popcorn coated in a honey-butter mixture. This caramelized popcorn is perfect for snacking or dessert.",
            ingredients: ["2 tablespoons oil, such as canola, avocado, or coconut oil", "1/2 cup (104g) popcorn kernels", "1/2 cup honey", "1/4 cup (56g) salted butter", "1/2 teaspoon kosher salt, optional"],
            instructions: ["Preheat the oven to 250°F. Line a large baking sheet with parchment paper.", "Pop the popcorn: Heat the oil in a large stockpot on medium-high heat and add 3 popcorn kernels to the pot. Once the popcorn kernels pop, add the remaining kernels and cover. Remove from the heat and let it rest for 30 seconds. Put the pot back on medium-high heat and set the lid ajar, preferably to the side so that the oil doesn't splatter towards you. Step away from the pot while the popcorn is popping. When the popping slows enough that you can hear individual kernels popping, remove the pot from the heat and let it finish popping off the heat, about 30 seconds longer.", "Discard any kernels: Slowly pour the popcorn onto the baking sheet, keeping unpopped kernels in the pot. Look through the popped popcorn and remove any additional unpopped kernels.", "Make the honey coating: Wipe out the pot and set it back on the stove. Add the honey and butter to the pot and heat on low. Stir with a flexible spatula and simmer for 1 minute.", "Coat the popcorn: Use the parchment as a sling to pour the popcorn into the pot. Return the parchment paper to the baking sheet. Using a flexible spatula, start at the bottom of the pot and scoop up use a folding motion to coat the popcorn with the honey mixture. Scrape the sides and continue stirring from the bottom to the top until the popcorn is evenly coated and no liquid is pooled at the bottom. The popcorn will be a glossy golden-yellow color. Dump the coated popcorn back onto the parchment-lined baking sheet and spread it out evenly with a flexible spatula. Sprinkle with 1/2 teaspoon of kosher salt, if using.", "Bake: Bake until the popcorn has deepened to a caramel color and it feels dry and firm, about 45 minutes, stirring every 15 minutes. The popcorn will end up chewy and soft if not baked long enough. You can tell the popcorn is done when you can smell the honey, the popcorn has darkened slightly, and it feels dry and firm to the touch. It becomes even crispier as it cools. Let the popcorn cool for 15 minutes, then break the popcorn into bite-sized chunks or individual kernels. Once completely cool, about 30 minutes, serve or store at room temperature in an airtight container for up to 5 days."],
            cookTime: "45 mins",
            type: "Appetizer"
        },
        {
            title: "Johnny Marzetti Casserole",
            description: "A classic Midwestern casserole with ground beef, pasta, and cheese in a tomato sauce. This comforting dish is perfect for family dinners.",
            ingredients: ["12 ounces mushrooms, cleaned and chopped or sliced", "1 tablespoon olive oil or neutral cooking oil", "1 large onion, chopped", "5 cloves garlic, minced", "1 bell pepper (any color), seeded and cored, finely chopped", "Salt, to taste", "1 1/2 pounds lean ground beef (90:10 is good)", "1 (28-ounce) can whole plum tomatoes in juice", "3 tablespoons tomato paste", "3/4 teaspoon dried oregano", "1/4 teaspoon crushed red pepper flakes", "Freshly ground black pepper", "12 ounces (2 3/4 cups) uncooked elbow macaroni", "8 ounces grated cheddar cheese (2 generous cups), divided", "4 ounces grated Parmesan cheese (1 1/2 cups), divided"],
            instructions: ["Preheat the oven to 350°F. Grease a 9x13-inch baking dish; set aside.", "Cook the vegetables and beef: Heat a large, deep skillet over medium-high heat. Add the mushrooms to the dry skillet. As they heat, the mushrooms will give off their moisture. Stir them occasionally until they are soft, slightly browned, and most of their liquid has evaporated, 5 to 8 minutes. Scrape the mushrooms in a bowl; set aside. Wipe out the skillet and return it to the burner. Add the oil; when it ripples, add the onion and cook until translucent, about 6 minutes. Add the garlic and bell pepper and cook 1 minute longer. Season generously with salt. Add the beef, reduce the heat to medium, and cook, breaking the beef up with a spoon into small clumps. Stop when the meat is no longer pink, about 8 minutes.", "Add the tomatoes and seasoning: Use your hands to crush the tomatoes directly into the pan (wear an apron) and add the remaining juices from the can. Add the tomato paste, oregano, pepper flakes, and black pepper and simmer until saucy, about 20 minutes. Add the reserved mushrooms; simmer 2 minutes longer. Taste and adjust the seasoning as needed with salt.", "Boil the pasta: As the sauce cooks, bring a large pot of salted water to boil. Add the pasta and cook until it still retains a bit of bite. Drain.", "Assemble the casserole: Return the pasta to the pot; add the cooked sauce and toss. Mix in half of the cheeses, then dump into the greased dish. Scatter the remaining grated cheese on top.", "Bake: Bake until the sauce bubbles and the cheese is lightly browned, about 30 minutes. Let rest 10 minutes before serving."],
            cookTime: "30 mins",
            type: "Dinner"
        },
        {
            title: "One-Pot Mac and Cheese",
            description: "Creamy, cheesy mac and cheese made in one pot for easy cleanup. This comforting dish is ready in about 15 minutes.",
            ingredients: ["2 tablespoons unsalted butter", "24 (76g) Ritz crackers, crushed (about 1 cup plus 2 tablespoons)", "1/8 teaspoon freshly ground black pepper", "Pinch kosher salt", "4 tablespoons unsalted butter", "1 teaspoon ground mustard", "1/2 teaspoon freshly ground black pepper", "1/8 teaspoon cayenne pepper (optional)", "4 cups water", "2 cups half and half", "2 teaspoons kosher salt", "1 pound elbow macaroni", "4 ounces cream cheese", "8 ounces shredded cheddar cheese", "8 ounces shredded Monterey Jack cheese"],
            instructions: ["Prepare the topping (optional): Melt the butter in a 10-inch Dutch oven or other heavy, deep pot over medium heat. Add the crushed crackers, black pepper, and kosher salt and stir to coat with the melted butter. Continue to toast over medium heat, stirring often, until golden brown, 2 to 4 minutes. Transfer the toasted cracker crumbs to a plate to cool and wipe the pot clean of any tiny crumbs.", "Begin preparing the mac and cheese: In the same pot, melt the butter over medium heat. Once melted, add the ground mustard, pepper, and cayenne (if using). Stir to combine with the butter and lightly toast until fragrant, 15 to 30 seconds. Take care to not let the spices or butter begin to brown. Add the water, half and half, and kosher salt to the butter mixture and stir to combine. Bring the mixture to a boil over high heat, uncovered.", "Cook the pasta: Once boiling, stir in the elbow macaroni, adjusting the heat as needed to maintain a rolling boil (but not boil over). Continue to cook uncovered, stirring every minute or so, until the pasta is tender and the liquid is reduced enough to reveal the top layer of elbows, 6 to 9 minutes. The liquid mixture should just be visible around the edges of the pot, but still with enough to pool when you drag a spatula through the pasta. Remove from the heat.", "Add the cheeses: Add the cream cheese to the pasta mixture and stir until almost completely melted. Add the shredded cheddar and Monterey Jack and stir until the cheeses are completely melted and saucy.", "Season and serve: Taste the mac and cheese. Season with more salt and pepper as needed. Serve immediately topped with the toasted Ritz topping, if using."],
            cookTime: "6-9 mins",
            type: "Dinner"
        },
        {
            title: "Carne Picada",
            description: "Tender beef stewed in a flavorful sauce with peppers and onions. This Tex-Mex dish is perfect for tacos, burritos, or served over rice.",
            ingredients: ["1 1/2 tablespoons all-purpose flour", "1/2 teaspoon kosher salt", "1/2 teaspoon freshly ground black pepper", "2 pounds chuck roast, excess fat removed, cut into 1-inch cubes", "2 tablespoons neutral oil, like canola or avocado, plus more as needed", "1 cup beef broth", "1/2 cup tomato sauce", "1/4 cup Worcestershire sauce", "2 tablespoons apple cider vinegar", "1 tablespoon chili powder", "1 teaspoon ground cumin", "1 teaspoon garlic powder", "1 teaspoon onion powder", "1 teaspoon dried oregano", "1/2 teaspoon smoked paprika", "1/2 teaspoon kosher salt", "1 tablespoon neutral oil", "1 large yellow onion, sliced", "1 large green bell pepper, sliced", "1 large red bell pepper, sliced", "Kosher salt", "Freshly ground black pepper"],
            instructions: ["Brown the beef: Combine the flour, salt, and pepper in a medium bowl. Add the beef and toss to coat. Heat the oil in a large Dutch oven or heavy-bottomed pot over medium-high heat. Add half the beef. Cook for about 5 minutes untouched, then flip and cook another 5 minutes, making sure you get a nice rich brown color on each side. Remove the beef to a bowl or plate and repeat the process with the rest of the beef, adding more oil if needed.", "Make the sauce: While the beef browns, make the sauce. Add all the ingredients to a blender and blend until smooth.", "Sauté the vegetables: Once the beef is done and set aside, cook the vegetables for the braise in the same pan. Add the oil followed by the peppers and onion. Season with salt and pepper and cook, stirring occasionally, until the onions are slightly translucent, 5 to 7 minutes.", "Braise: Add the sauce to deglaze the Dutch oven, scraping up all the brown bits that might've stuck to the bottom of the pan. Add the browned beef and bring the mixture up to a simmer. Reduce the heat to medium-low and cover the pot with a lid. Cook for 1 hour, stirring occasionally to make sure nothing is sticking to the pot, then remove the lid and cook for about 15 minutes to allow the sauce to thicken up slightly. Taste for salt and adjust to your liking. Serve as a filling for tacos or over rice."],
            cookTime: "75 mins",
            type: "Dinner"
        },
        {
            title: "Budae Jjigae (Army Base Stew)",
            description: "A Korean fusion stew with American ingredients like Spam, hot dogs, and cheese. This comforting, spicy soup is packed with flavors and textures.",
            ingredients: ["2 tablespoons gochujang", "2 tablespoons soy sauce", "2 tablespoons mirin", "2 tablespoons gochugaru", "1 tablespoon fish sauce", "2 teaspoons granulated sugar", "2 ramen spice packets", "4 cloves garlic, grated", "1 cup rice cakes", "2 green onions", "1 cup kimchi", "1/2 head napa cabbage", "1 bunch enoki mushrooms", "4 Vienna sausages", "1/2 block Spam", "1/2 block firm tofu", "1 (15-ounce) can baked beans", "4 cups chicken broth", "2 packages instant ramen noodles", "4 slices American cheese"],
            instructions: ["Make the sauce: Combine all of the sauce ingredients in a small bowl and mix to combine. Set aside.", "Prepare the soup ingredients: Soak the rice cakes in cold water for at least 15 minutes to help soften them and to remove excess starch. Prepare the green onions by removing the root end and slicing on an angle into about 1/8-inch slices. Set aside for garnishing the budae jjigae at the end. Chop the kimchi into bite-size pieces. Slice the napa cabbage into bite-size pieces. Remove the base from enoki mushrooms and separate them into individual pieces, removing any excess dirt as you do this. Slice the Vienna sausages into 1/4-inch diagonal slices. Cut the Spam and tofu blocks in half and slice into 1/4-inch slices.", "Assemble the soup: Drain the rice cakes. In a large, shallow pot or wok, artfully arrange the rice cakes, kimchi, cabbage, mushrooms, sausages, Spam, tofu, and beans around the edge, leaving the middle of the pan empty. Spoon your sauce into the middle.", "Boil: Pour the chicken broth in around the edges and bring to a boil over high heat. Once the mixture starts boiling, turn the heat down to medium-high and use long chopsticks or a spoon to blend the broth and sauce together in the center. Cover with a lid and continue to simmer for about 10 minutes to warm the proteins and cook the other ingredients.", "Add the noodles: Remove the lid. Place the ramen noodles in the center space of the pot and cook them, ladling broth over the noodles and using chopsticks to loosen, until the ramen is soft and bouncy, about 3 to 4 minutes.", "Add the cheese, garnish, and serve: Add cheese slices on top of the ramen and cover until the cheese is melted, about 30 seconds. Remove the lid and garnish your budae jjigae with sliced green onion. Use a ladle and tongs to serve everyone their favorite parts. Serve over hot rice, if desired."],
            cookTime: "10 mins",
            type: "Soup"
        },
        {
            title: "Steak Tips",
            description: "Tender steak tips marinated in a sweet and tangy sauce, then seared to perfection. These flavorful bites are perfect for a quick dinner.",
            ingredients: ["1/2 cup ketchup", "1/4 cup red wine vinegar", "1/4 cup extra-virgin olive oil", "1/4 cup water", "4 ounces Coca-Cola", "1/2 tablespoon Worcestershire sauce", "1/2 tablespoon garlic powder", "1/2 tablespoon oregano", "1 3/4 teaspoon Diamond Crystal Kosher Salt (or 1 teaspoon Morton Kosher Salt), plus more for your seasoning", "1/2 teaspoon black pepper", "2 pounds steak tips, cut into 2-inch pieces", "Canola oil, for searing", "2 tablespoons finely minced parsley, for serving (optional)"],
            instructions: ["Marinate the meat: In a large bowl, whisk the ketchup, vinegar, oil, water, Coca-Cola, Worcestershire sauce, garlic powder, oregano, salt, and pepper until smooth. Add the steak and toss to combine. Cover and seal the bowl. Marinate the steak tips for at least 30 minutes and up to 4 hours (if marinating for longer than 30 minutes, transfer to the fridge).", "Sear the steak: Using tongs, transfer the marinated steak to a plate, draining off any excess liquid (do not discard the marinade). Set a large cast-iron skillet over medium-high heat with 1 tablespoon canola oil. Once the oil starts shimmering and the pan begins smoking, add the meat in an even layer (you don't want the pieces to touch, so you will likely need to do this in 2-3 batches). Sear the meat on one side until deeply browned and caramelized, about 2-3 minutes. Flip each piece, and sear for 2-3 minutes or until the meat is medium rare or medium, depending on your preference. Transfer the cooked meat to a plate and tent with foil to keep warm.", "Make the sauce: While the meat is cooking, make the sauce. To a small saucepan, add the leftover marinade and set over medium heat. Bring to a simmer. Simmer the mixture for 10-15 minutes, whisking occasionally, until the sauce is thickened and syrupy. Season with additional salt if desired. Once reduced, lower the heat and keep warm.", "Serve: Divide the steak amongst serving plates with a bit of sauce on the side. Serve immediately, and enjoy!"],
            cookTime: "5 mins",
            type: "Dinner"
        },
        {
            title: "Banana Pecan Bread With Caramelized White Chocolate Sorghum Glaze",
            description: "A moist banana bread topped with a decadent caramelized white chocolate glaze made with sorghum syrup. This bread combines classic flavors with a sophisticated twist.",
            ingredients: ["10 ounces chopped high-quality white chocolate", "2 cups all-purpose flour", "1 teaspoon baking soda", "1 teaspoon salt", "1 teaspoon mace", "1 teaspoon cinnamon", "1 cup chopped pecans", "1 cup light brown sugar", "1/2 cup sour cream", "2 large eggs", "1/2 cup unsalted butter, melted", "2 teaspoons vanilla extract", "3 medium very ripe bananas, mashed", "4 tablespoons sorghum syrup", "1/4 cup heavy cream", "1/2 teaspoon salt"],
            instructions: ["Preheat oven to 350°F. Butter a 9x5-inch loaf pan and line with parchment.", "Whisk flour, baking soda, salt, mace, cinnamon, and pecans in a bowl.", "Mix brown sugar, sour cream, eggs, butter, vanilla, and bananas.", "Fold wet ingredients into dry ingredients.", "Bake for 50-60 minutes until tester comes out clean.", "Cool in pan 5-10 minutes, then transfer to rack.", "For glaze: Melt caramelized white chocolate, add sorghum and cream, whisk until emulsified.", "Pour glaze over cooled bread."],
            cookTime: "50-60 mins",
            type: "Dessert"
        },
        {
            title: "Dark and Stormy Banana Bread",
            description: "A spiced banana bread with dark rum and candied ginger, inspired by the classic Dark and Stormy cocktail. Perfect for brunch or dessert.",
            ingredients: ["2 cups all-purpose flour", "1 teaspoon baking soda", "1 teaspoon ground cinnamon", "3/4 teaspoon ground ginger", "1/2 teaspoon ground nutmeg", "1/2 teaspoon fine sea salt", "1 cup light brown sugar", "1/2 cup unsalted butter, melted", "2 large eggs", "2 tablespoons dark spiced rum", "2 teaspoons vanilla extract", "1 teaspoon finely grated fresh ginger", "2 medium very ripe bananas, mashed", "1/3 cup finely diced candied ginger"],
            instructions: ["Preheat oven to 350°F. Grease a 9x5-inch loaf pan and line with parchment.", "Whisk flour, baking soda, cinnamon, ginger, nutmeg, and salt.", "Whisk brown sugar, melted butter, eggs, rum, vanilla, and fresh ginger until combined.", "Stir in mashed bananas.", "Fold wet ingredients into dry ingredients, then stir in candied ginger.", "Pour batter into pan and bake 45-55 minutes until toothpick comes out clean.", "Cool in pan 15 minutes, then transfer to rack."],
            cookTime: "45-55 mins",
            type: "Dessert"
        },
        {
            title: "Spiced Dulce de Leche Banana Bread",
            description: "Banana bread with dulce de leche and warm spices, topped with a buttery crumb topping. A rich and comforting treat.",
            ingredients: ["1 1/2 cups all-purpose flour", "1/2 teaspoon baking soda", "1/2 teaspoon kosher salt", "1/2 teaspoon ground cinnamon", "1/2 teaspoon ground nutmeg", "3/4 cup granulated sugar", "3/4 cup dulce de leche", "3 medium ripe bananas, chopped", "1/3 cup unsalted butter, melted", "2 large eggs", "1/4 cup all-purpose flour (for streusel)", "1/4 cup brown sugar (for streusel)", "1/2 teaspoon cinnamon (for streusel)", "2 tablespoons cold butter (for streusel)"],
            instructions: ["Preheat oven to 350°F. Grease a 9x5-inch loaf pan.", "Whisk flour, baking soda, salt, cinnamon, and nutmeg.", "Mix sugar, dulce de leche, bananas, melted butter, and eggs in a mixer.", "Add dry ingredients to wet mixture.", "Pour into pan.", "Make streusel: Mix flour, brown sugar, cinnamon, and cold butter until crumbly.", "Sprinkle over batter.", "Bake 50-70 minutes until tester comes out clean."],
            cookTime: "50-70 mins",
            type: "Dessert"
        },
        {
            title: "Pickle Pizza",
            description: "A unique pizza topped with dill cream sauce and plenty of pickles. A tangy, crunchy twist on traditional pizza.",
            ingredients: ["1/2 cup sour cream", "1/4 cup mayonnaise", "1 teaspoon dried dill", "1 teaspoon pickle juice", "1/2 teaspoon garlic powder", "1/2 teaspoon kosher salt", "1/4 teaspoon ground black pepper", "1 pizza dough ball", "1 cup mozzarella cheese", "1/2 cup Parmesan cheese", "1 cup dill pickles, sliced"],
            instructions: ["Preheat oven to 500°F with pizza stone inside.", "Mix sour cream, mayonnaise, dill, pickle juice, garlic powder, salt, and pepper for sauce.", "Stretch dough to 12-14 inches.", "Spread sauce on dough, leaving 1/2-inch border.", "Top with mozzarella, Parmesan, and pickles.", "Bake 11-13 minutes until crust is golden and cheese bubbly."],
            cookTime: "11-13 mins",
            type: "Dinner"
        },
        {
            title: "Homemade Cavatelli",
            description: "Fresh homemade pasta shaped like hot dog buns. These tender dumplings are perfect with your favorite sauce.",
            ingredients: ["2 2/3 cups semolina flour", "2 1/2 teaspoons kosher salt", "1 cup warm water"],
            instructions: ["Mix flour and salt, form well, add water gradually.", "Knead dough 5-7 minutes until smooth.", "Rest dough 1 hour wrapped in plastic.", "Roll dough into 1/2-inch logs.", "Cut into 1/2-inch pieces.", "Drag each piece across butter knife at 45-degree angle to curl.", "Cook in boiling salted water 5-6 minutes until floating.", "Serve with sauce."],
            cookTime: "5-7 mins",
            type: "Dinner"
        },
        {
            title: "Dongchimi (Korean Radish Water Kimchi)",
            description: "A refreshing Korean radish water kimchi that's lightly fermented and perfect for cooling down spicy dishes.",
            ingredients: ["1 1/2 large Korean radishes, thinly sliced", "2 tablespoons kosher salt", "2 tablespoons honey", "1 Asian pear, cubed", "1 red apple, cubed", "1/4 white onion, diced", "1-inch ginger piece", "2 cloves garlic", "4 cups cold water", "2 green onions, sliced", "1 serrano pepper (optional)"],
            instructions: ["Toss radish slices with salt and honey, let sit 1 hour.", "Blend pear, apple, onion, ginger, garlic with 1 cup water.", "Strain blended mixture to get liquid.", "Rinse radishes to remove excess salt.", "Combine radishes, green onions, pepper, strained liquid, and remaining water.", "Let ferment at room temperature 48 hours until bubbly.", "Refrigerate for up to 3 months."],
            cookTime: "48 hrs (fermentation)",
            type: "Appetizer"
        },
        {
            title: "Chicken Alfredo Pizza",
            description: "Creamy Alfredo sauce pizza topped with grilled chicken, mozzarella, and Parmesan. A rich and satisfying meal.",
            ingredients: ["1 pizza dough ball", "1/2 cup Alfredo sauce", "6 ounces boneless chicken breast", "1 teaspoon salt", "1 teaspoon black pepper", "2 tablespoons olive oil", "2 cups mozzarella cheese", "1/2 cup Parmesan cheese", "1/2 red onion, sliced"],
            instructions: ["Preheat oven to 475°F with pizza stone.", "Season chicken with salt and pepper, cook in oil until 165°F, cube.", "Stretch dough to 10-12 inches.", "Spread Alfredo sauce on dough.", "Top with chicken, mozzarella, Parmesan, and onions.", "Bake 10-15 minutes until crust golden and cheese bubbly."],
            cookTime: "10-15 mins",
            type: "Dinner"
        },
        {
            title: "Plantain Chips",
            description: "Crispy baked plantain chips that are healthier than fried. Perfect for snacking with a sprinkle of salt.",
            ingredients: ["2 green plantains", "2 tablespoons olive oil", "1 teaspoon kosher salt"],
            instructions: ["Preheat oven to 375°F.", "Peel plantains by scoring skin and removing.", "Slice into 1/16-inch rounds.", "Toss with olive oil and salt.", "Bake on unlined baking sheets in single layer.", "Bake 7 minutes, rotate pans, bake 8-9 more minutes until golden.", "Cool and serve."],
            cookTime: "15-16 mins",
            type: "Appetizer"
        },
        {
            title: "Homemade Old Bay Seasoning",
            description: "A classic seafood seasoning blend that's perfect for shrimp, crab, fries, and more. Make your own at home.",
            ingredients: ["2 teaspoons ground bay leaf", "2 tablespoons plus 1 teaspoon celery salt", "1 tablespoon sweet paprika", "1 teaspoon dry mustard powder", "1/2 teaspoon ground ginger", "1/2 teaspoon ground black pepper", "1/4 teaspoon ground nutmeg", "1/4 teaspoon ground cinnamon", "1/4 teaspoon cayenne", "1/8 teaspoon ground allspice", "1/8 teaspoon ground clove", "1/8 teaspoon cardamom"],
            instructions: ["Whisk all ingredients together in a small bowl.", "Store in airtight container for up to 6 months."],
            cookTime: "0 mins",
            type: "Seasoning"
        },
        {
            title: "Boba Tea (Bubble Tea)",
            description: "Homemade bubble tea with chewy tapioca pearls and your choice of tea. A fun and refreshing drink.",
            ingredients: ["3 1/2 cups water", "1 cup dried tapioca pearls", "4 black tea bags", "1 cup sugar", "2 cups water (for syrup)", "2 cups milk", "Ice cubes"],
            instructions: ["Cook tapioca pearls in boiling water 15 minutes, rest 20 minutes.", "Brew tea bags in hot water 5 minutes.", "Make syrup: dissolve sugar in hot water.", "Mix tea, milk, syrup, and cooked pearls.", "Serve over ice."],
            cookTime: "30 mins",
            type: "Drink"
        },
        {
            title: "Jamaican Jerk Seasoning",
            description: "A spicy and aromatic Jamaican jerk seasoning blend perfect for marinating meats and adding authentic Caribbean flavor.",
            ingredients: ["2 tablespoons ground allspice", "2 teaspoons ground cloves", "2 teaspoons ground cinnamon", "2 teaspoons ground black pepper", "1 teaspoon ground ginger", "1 teaspoon ground nutmeg", "1 teaspoon paprika", "1 tablespoon ground Scotch bonnet", "1 tablespoon onion powder", "1 tablespoon garlic powder", "1 tablespoon salt", "2 tablespoons cane sugar", "2 tablespoons dried thyme"],
            instructions: ["Toast whole spices if using (allspice, cloves, cinnamon, peppercorns) in a dry skillet until fragrant.", "Grind toasted spices in a spice grinder.", "Combine all ingredients in a bowl and whisk until well mixed.", "Store in an airtight container in a cool, dark place.", "Use to marinate meats before grilling or cooking."],
            cookTime: "10 mins",
            type: "Seasoning"
        },
        {
            title: "Sad Cake",
            description: "A dense, moist cake that starts high but collapses dramatically - hence the name! Made with simple pantry ingredients.",
            ingredients: ["4 eggs", "2 1/4 cups packed brown sugar", "2 teaspoons vanilla extract", "1/2 teaspoon salt", "2 cups Bisquick or baking mix", "1 cup sweetened shredded coconut", "Butter or cooking spray for greasing"],
            instructions: ["Preheat oven to 350°F and generously grease a 9x13-inch pan.", "Beat eggs with brown sugar, vanilla, and salt until frothy.", "Add baking mix and stir until thick batter forms.", "Fold in coconut.", "Spread in prepared pan and bake 35-40 minutes until toothpick comes out clean.", "Cool completely before cutting into bars."],
            cookTime: "50 mins",
            type: "Dessert"
        },
        {
            title: "Easy Zucchini Butter",
            description: "A savory, spreadable zucchini condiment that's like a cross between pesto and butter. Perfect for sandwiches or crackers.",
            ingredients: ["2 tablespoons extra-virgin olive oil", "2 1/2 pounds zucchini", "3 cloves garlic, smashed", "3 sprigs fresh thyme", "Salt to taste", "Freshly ground black pepper", "1 teaspoon fresh lemon juice"],
            instructions: ["Heat oil in a large skillet over medium heat.", "Grate zucchini and add to skillet as you go.", "Add garlic cloves and thyme sprigs, season with salt.", "Cook, stirring occasionally, until zucchini melts down and becomes jammy (20-45 minutes).", "Remove thyme stems and mash garlic cloves.", "Finish with more olive oil, pepper, and lemon juice.", "Cool and store in refrigerator up to 1 week."],
            cookTime: "45 mins",
            type: "Condiment"
        },
        {
            title: "Chicken Over Rice",
            description: "Halal cart-style chicken and rice with spiced chicken, yellow rice, lettuce, tomatoes, and white sauce.",
            ingredients: ["3 tablespoons lemon juice", "1/4 cup neutral oil", "2 tablespoons grated garlic", "2 teaspoons kosher salt", "1 tablespoon dried oregano", "1 1/2 teaspoons coriander powder", "1/2 teaspoon allspice", "1 1/2 teaspoons cumin powder", "1 1/2 teaspoons black pepper", "2 pounds boneless chicken thighs", "For rice: 2 cups basmati rice, butter, shallots, turmeric, cardamom, chicken stock", "For white sauce: yogurt, mayonnaise, lemon juice, sugar, garlic", "For serving: tomato, lettuce, red sauce"],
            instructions: ["Marinate chicken in lemon juice, oil, garlic, salt, and spices for 1-4 hours.", "Cook rice with butter, shallots, turmeric, cardamom, and stock.", "Make white sauce by mixing yogurt, mayo, lemon juice, sugar, and garlic.", "Cook chicken in batches until browned and cooked through.", "Slice chicken and serve over rice with lettuce, tomato, white sauce, and red sauce."],
            cookTime: "60 mins",
            type: "Dinner"
        },
        {
            title: "Arrachera (Mexican Skirt Steak)",
            description: "Tender Mexican skirt steak marinated in pineapple, beer, and lime juice, then grilled to perfection.",
            ingredients: ["4 green onions, chopped", "4 cloves garlic, peeled", "1/4 cup cilantro leaves", "1 serrano pepper, stemmed", "3/4 cup pineapple juice", "1/2 cup blonde Mexican lager", "1/3 cup lime juice", "1 tablespoon neutral oil", "1 tablespoon kosher salt", "2 pounds skirt steak"],
            instructions: ["Blend green onions, garlic, cilantro, serrano, pineapple juice, beer, lime juice, oil, and salt until smooth.", "Marinate steak in mixture for 3-4 hours in refrigerator.", "Preheat grill to high heat.", "Remove steak from marinade and grill 4-5 minutes per side for medium doneness.", "Rest 5 minutes, then slice thinly against the grain."],
            cookTime: "25 mins",
            type: "Dinner"
        },
        {
            title: "Million Dollar Pie",
            description: "A no-bake pie with pineapple, pecans, and whipped topping - named because it tastes like a million bucks!",
            ingredients: ["1 (20 oz) can crushed pineapple, drained", "1 cup chopped pecans", "1 cup sweetened shredded coconut", "1 (8 oz) package cream cheese, softened", "1/2 cup butter, softened", "1 1/2 cups powdered sugar", "1 (8 oz) container whipped topping", "1 (9-inch) graham cracker crust"],
            instructions: ["Mix drained pineapple, pecans, and coconut in a bowl.", "Beat cream cheese and butter until smooth.", "Gradually add powdered sugar and beat until fluffy.", "Fold in whipped topping.", "Combine with pineapple mixture.", "Pour into graham cracker crust and refrigerate at least 4 hours.", "Serve chilled."],
            cookTime: "15 mins",
            type: "Dessert"
        },
        {
            title: "Maduros (Fried Sweet Plantains)",
            description: "Sweet, caramelized fried plantains that are a staple in Caribbean and Latin American cuisine.",
            ingredients: ["2 sweet plantains, very ripe", "1 cup neutral oil for frying"],
            instructions: ["Cut off ends of plantains and make shallow slit along length to remove peel.", "Slice plantains on bias into 1/2-inch thick pieces.", "Heat 1/4 inch oil in large skillet over medium heat.", "Fry plantains in single layer until golden brown, about 2-3 minutes per side.", "Drain on paper towels and serve immediately while hot."],
            cookTime: "10 mins",
            type: "Side"
        },
        {
            title: "Garam Masala",
            description: "A warm, aromatic Indian spice blend essential for curries and many Indian dishes.",
            ingredients: ["2 tablespoons coriander seeds", "4 teaspoons cumin seeds", "2 teaspoons green cardamom pods", "3/4 teaspoon whole cloves", "1 teaspoon black peppercorns", "1/2 cinnamon stick", "1/2 teaspoon Tej patta (optional)"],
            instructions: ["Toast all whole spices in a dry skillet over medium-low heat until fragrant (2-3 minutes).", "Cool spices completely.", "Grind in spice grinder until fine powder.", "Store in airtight jar in cool, dark place.", "Use within 6 months for best flavor."],
            cookTime: "10 mins",
            type: "Seasoning"
        },
        {
            title: "Almond Croissants",
            description: "Flaky croissants filled with almond frangipane and topped with sliced almonds and simple syrup.",
            ingredients: ["1/4 cup granulated sugar", "1/4 cup water", "1 tablespoon dark rum or vanilla", "1/2 cup almond flour", "1/4 cup all-purpose flour", "1/4 teaspoon salt", "1/2 cup butter, softened", "1/3 cup powdered sugar", "1 large egg", "1 teaspoon almond extract", "4 croissants", "1/4 cup sliced almonds"],
            instructions: ["Make simple syrup: dissolve sugar in water, add rum, cool.", "Make frangipane: whisk almond flour, flour, salt.", "Beat butter and powdered sugar, add egg and almond extract.", "Fold in dry ingredients.", "Slice croissants horizontally, brush with syrup.", "Spread frangipane on bottom halves, replace tops.", "Spread frangipane on tops, sprinkle with almonds.", "Bake at 350°F for 20 minutes until golden."],
            cookTime: "30 mins",
            type: "Breakfast"
        },
        {
            title: "Caribbean Green Seasoning",
            description: "A fresh, herbaceous seasoning blend used throughout the Caribbean for marinating meats and flavoring dishes.",
            ingredients: ["1 large onion, chopped", "16 cloves garlic, peeled", "6 Trinidadian pimento peppers or 1 red Cubanelle pepper", "8 green onions, trimmed", "4 Guyanese wiri wiri peppers or 1 Scotch bonnet or 2-3 habaneros", "6 culantro leaves", "Leaves from 10 sprigs parsley", "16 sprigs thyme", "10 basil leaves"],
            instructions: ["Rinse all vegetables and herbs.", "Remove stems from hot peppers.", "Add all ingredients to food processor in batches.", "Pulse until paste-like consistency.", "Store in glass jar in refrigerator up to 2 weeks or freeze up to 6 months.", "Use for marinating meats or seasoning dishes."],
            cookTime: "15 mins",
            type: "Seasoning"
        },
        {
            title: "Marble Blondies",
            description: "Chewy blondies with chocolate swirls throughout, combining the best of chocolate chip cookies and brownies.",
            ingredients: ["1 cup butter, melted", "1 1/3 cups brown sugar", "1/3 cup granulated sugar", "2 eggs plus 1 yolk", "1 tablespoon vanilla", "2 cups flour", "1 1/4 teaspoons salt", "1 teaspoon baking powder", "3 1/2 oz semi-sweet chocolate, melted", "2 tablespoons cocoa powder", "1/4 teaspoon espresso powder", "1/2 cup white chocolate chips", "1/2 cup semi-sweet chocolate chips"],
            instructions: ["Preheat oven to 350°F, grease 9-inch square pan and line with parchment.", "Whisk melted butter, sugars, eggs, yolk, and vanilla until combined.", "Whisk flour, salt, and baking powder.", "Fold dry ingredients into wet batter.", "Transfer 1/3 batter to another bowl, add melted chocolate, cocoa, espresso.", "Fold chocolate chips into respective batters.", "Drop alternating tablespoons of batter into pan.", "Swirl batters with spatula or knife.", "Bake 30-40 minutes until set.", "Cool completely before slicing."],
            cookTime: "45 mins",
            type: "Dessert"
        },
        {
            title: "Simple Roast Chicken",
            description: "A foolproof method for roasting a whole chicken with vegetables for a complete one-pan meal.",
            ingredients: ["1 (3-5 lb) whole chicken", "5 cups mixed vegetables (carrots, onions, potatoes, etc.)", "2 tablespoons olive oil", "Salt and pepper", "1 small lemon, halved", "1/2 yellow onion, wedged", "2 sprigs rosemary or thyme", "3 tablespoons butter (optional)"],
            instructions: ["Preheat oven to 400°F.", "Toss vegetables with oil, salt, pepper on rimmed baking sheet.", "Pat chicken dry, season cavity with salt and pepper.", "Stuff cavity with lemon, onion, and herbs.", "Rub chicken with butter if using, season exterior.", "Place chicken on vegetables.", "Roast until internal temperature reaches 165°F (15 min/lb).", "Rest 20-30 minutes before carving."],
            cookTime: "75 mins",
            type: "Dinner"
        }
    ];

  const inventoryString = inventory.map(i => i.item).join(', ');

  const handleSpecificSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specificQuery.trim()) return;
    performSearch({ query: specificQuery, ingredients: '' });
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inventory.length === 0) {
        alert("Please add items to your pantry list first!");
        return;
    }
    performSearch({ 
        ingredients: inventoryString,
        strictMode: strictMode
    });
  };

    const performSearch = async (params: any) => {
        setLoadingState(LoadingState.LOADING);
        setResult(null);
        setSearchError(null);
        if (setPersistedResult) setPersistedResult(null);
        try {
            console.debug('Recipe search params:', params);
            const data = await searchRecipes({
                ...params,
                maxCookTime: parseInt(maxCookTime),
                maxIngredients: parseInt(maxIngredients),
                measurementSystem: measurement,
                type: recipeType
            });
            // Filter results by type (quick meal, dinner, dessert)
            let filteredRecipes = data.recipes;
            if (recipeType) {
                filteredRecipes = filteredRecipes.filter((r: StructuredRecipe) => {
                    if (!r.type) return true;
                    return r.type.toLowerCase() === recipeType.toLowerCase();
                });
            }
            setResult({ ...data, recipes: filteredRecipes });
            if (setPersistedResult) setPersistedResult({ ...data, recipes: filteredRecipes });
            setLoadingState(LoadingState.SUCCESS);
            // Log search event
            if (analytics) {
              logEvent(analytics, 'search', {
                  query: params.query || 'generate_from_pantry',
                  resultCount: filteredRecipes?.length || 0,
                  recipeType: recipeType || 'any'
              });
            }
        } catch (error: any) {
            console.error('performSearch error:', error);
            setSearchError(error?.message ? String(error.message) : JSON.stringify(error));
            setLoadingState(LoadingState.ERROR);
        }
    };

  const getRatingInfo = (title: string) => {
      const related = ratings.filter(r => !!r?.recipeTitle && r.recipeTitle.toLowerCase() === title.toLowerCase());
      if (related.length === 0) return null;
      
      const total = related.reduce((a, b) => a + (b?.rating || 0), 0);
      return {
          avg: (total / related.length).toFixed(1),
          count: related.length,
          snippet: related[0].comment
      };
  };

        const [imageUrls, setImageUrls] = useState<{ [title: string]: string }>({});

        React.useEffect(() => {
            if (result && result.recipes) {
                result.recipes.forEach(async (recipe) => {
                    if (!imageUrls[recipe.title]) {
                        const url = await fetchRecipeImage(recipe.title);
                        if (url) setImageUrls(prev => ({ ...prev, [recipe.title]: url }));
                    }
                });
            }
        }, [result]);

        const openRecipeModal = (recipe: any, isSavedView = false) => {
            // Normalize recipe shape so modal can safely render instructions/ingredients
            const normalized: any = { ...recipe };
            normalized.title = normalized.title || 'Untitled Recipe';
            if (!Array.isArray(normalized.instructions)) {
                if (typeof normalized.instructions === 'string') {
                    // Split on newlines or numbered steps
                    normalized.instructions = normalized.instructions.split(/\r?\n+/).map(s => s.trim()).filter(Boolean);
                } else if (normalized.instructions && typeof normalized.instructions === 'object') {
                    // If stored as object with numeric keys, convert to array
                    normalized.instructions = Object.values(normalized.instructions).map(String).filter(Boolean);
                } else {
                    normalized.instructions = [];
                }
            }
            if (!Array.isArray(normalized.ingredients)) {
                if (typeof normalized.ingredients === 'string') {
                    normalized.ingredients = normalized.ingredients.split(/\r?\n+/).map(s => s.trim()).filter(Boolean);
                } else if (normalized.ingredients && typeof normalized.ingredients === 'object') {
                    normalized.ingredients = Object.values(normalized.ingredients).map(String).filter(Boolean);
                } else {
                    normalized.ingredients = [];
                }
            }
            setModalRecipe(normalized as StructuredRecipe);
            setModalIsSavedView(Boolean(isSavedView));
            setShowRecipeModal(true);
        };

        const renderRecipeCard = (recipe: StructuredRecipe, isSavedView = false, isCompact = false) => {
            const ratingInfo = getRatingInfo(recipe.title);
            const isSaved = savedRecipes.some(r => r.title === recipe.title);
            const titleKey = recipe.title || 'Untitled Recipe';
            const imgUrl = imageUrls[titleKey] || `https://source.unsplash.com/600x400/?${encodeURIComponent((titleKey as string).split(' ').slice(0,2).join(','))},food`;
            // Filter out staple items from ingredient list
            const filteredIngredients = recipe.ingredients.filter(ing => {
                const ingLower = ing.toLowerCase();
                return !STAPLES.some(staple => ingLower.includes(staple));
            });

            if (isCompact) {
                return (
                    <div key={titleKey} className="bg-theme-secondary rounded-lg shadow-md border border-theme overflow-hidden group hover:shadow-lg transition-all cursor-pointer" onClick={() => openRecipeModal(recipe, isSavedView)}>
                        <div className="h-24 relative bg-gray-200 overflow-hidden">
                            <div 
                                className="absolute inset-0 bg-cover bg-center opacity-80 group-hover:scale-105 transition-transform duration-300"
                                style={{
                                    backgroundImage: `url(${imgUrl})`,
                                    backgroundColor: '#2A0A10'
                                }}
                            ></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                            <div className="absolute bottom-2 left-2 right-2 text-white">
                                <h4 className="text-sm font-bold leading-tight">{recipe.title}</h4>
                            </div>
                        </div>
                    </div>
                );
            }

            return (
                <div key={titleKey} className="bg-theme-secondary rounded-2xl shadow-xl border border-theme overflow-hidden group hover:shadow-2xl transition-all mb-6 cursor-pointer" onClick={() => openRecipeModal(recipe, isSavedView)}>
                    {/* Recipe Image */}
                    <div className="h-40 relative bg-gray-200 overflow-hidden">
                        <div 
                            className="absolute inset-0 bg-cover bg-center opacity-80 group-hover:scale-105 transition-transform duration-500"
                            style={{
                                backgroundImage: `url(${imgUrl})`,
                                backgroundColor: '#2A0A10'
                            }}
                        ></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent"></div>
                        <div className="absolute bottom-4 left-4 right-4 text-white">
                            <h4 className="text-xl font-serif font-bold leading-tight mb-1 shadow-black drop-shadow-md">{recipe.title}</h4>
                            <div className="flex items-center gap-3 text-xs font-medium opacity-90">
                                <span className="bg-black/40 backdrop-blur px-2 py-1 rounded flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-[var(--accent-color)]" /> {recipe.cookTime}
                                </span>
                                {ratingInfo && (
                                    <span className="bg-black/40 backdrop-blur px-2 py-1 rounded flex items-center gap-1">
                                        <Star className="w-3 h-3 text-yellow-400" /> {ratingInfo.avg} ({ratingInfo.count})
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <p className="text-theme-secondary opacity-70 text-sm mb-4 leading-relaxed">{recipe.description}</p>
                        <div className="grid gap-4 mb-6">
                            <div className="bg-theme-primary/50 p-4 rounded-lg">
                                <h5 className="text-xs font-bold text-[var(--accent-color)] uppercase mb-2 flex items-center gap-2">
                                    <List className="w-3 h-3" /> Ingredients
                                </h5>
                                <ul className="text-sm text-theme-secondary opacity-80 space-y-1 list-disc list-inside">
                                    {filteredIngredients.map((ing, i) => <li key={i}>{ing}</li>)}
                                </ul>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onAddToPlan(recipe); }}
                                className="flex-1 bg-theme-primary border border-theme hover:border-[var(--accent-color)] text-[var(--accent-color)] font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 hover:bg-[var(--accent-color)] hover:text-white"
                            >
                                <Plus className="w-5 h-5" /> Add to Schedule
                            </button>
                        </div>

                        <div className="mt-4 pt-4 border-t border-theme" onClick={(e) => e.stopPropagation()}>
                             <RecipeRatingUI recipeTitle={recipe.title} recipe={recipe} onRate={onRate} />
                        </div>
                    </div>
                </div>
            );
        };

  return (
    <div className="space-y-6 pb-24 max-w-2xl mx-auto animate-fade-in">
      <div className="flex justify-center gap-4 mb-2">
          <button 
            onClick={() => setActiveView('search')}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${activeView === 'search' ? 'bg-[var(--accent-color)] text-white' : 'text-theme-secondary opacity-50'}`}
          >
              Search & Generate
          </button>
          <button 
            onClick={() => setActiveView('saved')}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${activeView === 'saved' ? 'bg-[var(--accent-color)] text-white' : 'text-theme-secondary opacity-50'}`}
          >
              <Bookmark className="w-4 h-4" /> Saved ({savedRecipes.length})
          </button>
      </div>

      {activeView === 'saved' ? (
          <PremiumFeature
            feature="savedRecipes"
            user={user}
            limit={25}
            currentCount={savedRecipes.length}
            fallbackMessage="Upgrade to Premium to save more than 25 recipes"
            onUpgrade={() => setActiveTab(Tab.SETTINGS)}
          >
            <div className="space-y-4">
                {savedRecipes.length === 0 ? (
                    <div className="text-center py-12 opacity-30">
                        <Bookmark className="w-12 h-12 mx-auto mb-2" />
                        <p>No saved recipes yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-4">
                        {savedRecipes.map(r => renderRecipeCard(r, true, true))}
                    </div>
                )}
            </div>
          </PremiumFeature>
      ) : (
        <>
            <div className="bg-theme-secondary p-5 rounded-2xl border border-theme shadow-lg">
                <form onSubmit={handleSpecificSearch} className="flex gap-2">
                    <input
                    value={specificQuery}
                    onChange={(e) => setSpecificQuery(e.target.value)}
                    placeholder="Search e.g. Pasta..."
                    className="flex-1 bg-theme-primary border border-theme rounded-xl px-4 py-3 text-theme-primary focus:border-[var(--accent-color)] outline-none"
                    />
                    <button
                        type="submit"
                        disabled={loadingState === LoadingState.LOADING || !specificQuery.trim()}
                        className="bg-[var(--accent-color)] text-white px-4 rounded-xl font-bold"
                    >
                        <Search className="w-5 h-5" />
                    </button>
                </form>
            </div>

            <div className="flex items-center gap-4">
                <div className="h-px bg-theme opacity-30 flex-1"></div>
                <span className="text-xs font-bold text-theme-secondary opacity-50 uppercase tracking-widest">OR</span>
                <div className="h-px bg-theme opacity-30 flex-1"></div>
            </div>

            <div className="bg-theme-secondary p-6 rounded-2xl border border-theme shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-color)] rounded-full blur-3xl opacity-10"></div>
                <h3 className="text-xs font-bold text-[var(--accent-color)] uppercase mb-4 flex items-center gap-2 relative z-10">
                    <Sparkles className="w-4 h-4" /> Generate Ideas from Pantry
                </h3>

                <form onSubmit={handleGenerate} className="space-y-4 relative z-10">
                    {/* Toggles Row */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Inventory Toggle */}
                        <div 
                            onClick={() => setStrictMode(!strictMode)}
                            className="flex flex-col justify-between bg-theme-primary p-3 rounded-xl border border-theme cursor-pointer hover:border-[var(--accent-color)]/30 transition-all group"
                        >
                            <div>
                                <span className="text-xs font-bold text-theme-primary block">Use Inventory Only</span>
                                <span className="text-[10px] text-theme-secondary opacity-60 leading-tight block mt-0.5">
                                    {strictMode ? "Strict match" : "Allow extra items"}
                                </span>
                            </div>
                            <div className="self-end mt-1">
                                {strictMode ? (
                                    <ToggleRight className="w-7 h-7 text-[var(--accent-color)]" />
                                ) : (
                                    <ToggleLeft className="w-7 h-7 text-theme-secondary opacity-30" />
                                )}
                            </div>
                        </div>

                        {/* Measurement Toggle */}
                        <div className="flex flex-col justify-between bg-theme-primary p-3 rounded-xl border border-theme">
                             <span className="text-[10px] text-[var(--accent-color)] font-bold uppercase mb-1">Measurement</span>
                             <div className="flex bg-theme-secondary rounded-lg p-1 border border-theme h-8">
                                <button
                                    type="button"
                                    onClick={() => setMeasurement('Standard')}
                                    className={`flex-1 text-[10px] font-bold rounded transition-all ${measurement === 'Standard' ? 'bg-[var(--accent-color)] text-white shadow-sm' : 'text-theme-secondary opacity-50'}`}
                                >
                                    Standard
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMeasurement('Metric')}
                                    className={`flex-1 text-[10px] font-bold rounded transition-all ${measurement === 'Metric' ? 'bg-[var(--accent-color)] text-white shadow-sm' : 'text-theme-secondary opacity-50'}`}
                                >
                                    Metric
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Recipe Type Selector & Inputs Row */}
                                        <div className="grid grid-cols-4 gap-3">
                                                <div>
                                                        <label className="text-[10px] text-[var(--accent-color)] font-bold uppercase mb-1 block">Type</label>
                                                        <select
                                                            value={recipeType}
                                                            onChange={e => setRecipeType(e.target.value as 'Snack' | 'Dinner' | 'Dessert' | '')}
                                                            className="w-full p-2.5 rounded-lg border border-theme bg-theme-primary text-theme-primary focus:border-[var(--accent-color)] outline-none text-sm"
                                                        >
                                                            <option value="">Any</option>
                                                            <option value="Snack">Quick Snack</option>
                                                            <option value="Dinner">Dinner</option>
                                                            <option value="Dessert">Dessert</option>
                                                        </select>
                                                </div>
                                                {/* Dietary restrictions removed */}
                                                <div></div>
                                                <div>
                                                        <label className="text-[10px] text-[var(--accent-color)] font-bold uppercase mb-1 block">Max Time</label>
                                                        <div className="relative">
                                                                <input
                                                                type="number"
                                                                value={maxCookTime}
                                                                onChange={(e) => setMaxCookTime(e.target.value)}
                                                                className="w-16 p-2.5 rounded-lg border border-theme bg-theme-primary text-theme-primary focus:border-[var(--accent-color)] outline-none text-sm"
                                                                />
                                                                <span className="absolute right-2 top-2.5 opacity-50 text-[10px] font-bold mt-1">MIN</span>
                                                        </div>
                                                </div>
                                                <div>
                                                        <label className="text-[10px] text-[var(--accent-color)] font-bold uppercase mb-1 block">Max Items</label>
                                                        <input
                                                                type="number"
                                                                value={maxIngredients}
                                                                onChange={(e) => setMaxIngredients(e.target.value)}
                                                                className="w-16 p-2.5 rounded-lg border border-theme bg-theme-primary text-theme-primary focus:border-[var(--accent-color)] outline-none text-sm"
                                                        />
                                                </div>
                                        </div>

                    <button
                        type="submit"
                        disabled={loadingState === LoadingState.LOADING}
                        className="w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-3 bg-gradient-to-r from-[var(--accent-color)] to-[var(--text-secondary)] text-white shadow-lg mt-2"
                    >
                        {loadingState === LoadingState.LOADING ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChefHat className="w-5 h-5" />}
                        Suggest Recipes
                    </button>
                </form>
            </div>

            {loadingState === LoadingState.ERROR && (
                <div className="p-4 bg-red-900/20 border border-red-500 text-red-400 rounded-xl text-center font-medium">
                <div>Search failed. Please try again.</div>
                {searchError && (
                    <div className="text-xs mt-2 text-red-300">Error: {searchError}</div>
                )}
                </div>
            )}

            {result && result.recipes && (
                    <div className="animate-fade-in-up space-y-8 mt-8">
                            {result.recipes.map((recipe, idx) => renderRecipeCard(recipe))}
                    </div>
            )}

            {/* Popular Recipes Section */}
            <div className="mt-12">
                <h2 className="text-xl font-bold text-theme-primary mb-6">Popular Recipes</h2>
                
                {/* Category Filter */}
                <div className="mb-6">
                    <div className="flex flex-wrap gap-2">
                        {['All', 'Dinner', 'Lunch', 'Breakfast', 'Dessert', 'Appetizer', 'Salad', 'Soup', 'Drink'].map((category) => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                    selectedCategory === category
                                        ? 'bg-theme-primary text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                                }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                    {csvRecipes
                        .filter(recipe => selectedCategory === 'All' || recipe.type === selectedCategory)
                        .map((recipe) => renderRecipeCard(recipe, false, true))}
                </div>
            </div>

        </>
      )}

      {/* Modal for full recipe details */}
      {showRecipeModal && modalRecipe && (
        <RecipeModal
          recipe={modalRecipe}
          isOpen={showRecipeModal}
          onClose={() => setShowRecipeModal(false)}
          onAddToPlan={(r) => { onAddToPlan(r); }}
          onSaveRecipe={(r) => { onSaveRecipe(r); }}
          onDeleteRecipe={(r) => { onDeleteRecipe(r); }}
          onRate={onRate}
          onMarkAsMade={(r) => { if (onMarkAsMade) onMarkAsMade(r); }}
          showSaveButton={!modalIsSavedView}
          showDeleteButton={modalIsSavedView}
          showMarkAsMade={true}
          showAddToPlan={true}
        />
      )}
    </div>
  );
};