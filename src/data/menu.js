// ─────────────────────────────────────────────────────────────────────────────
// REAL MENU — Joy-Full Java + Juice, 3811 KY 54, Owensboro KY
// Names, descriptions, sizes, prices and add-ons are the cafe's published menu
// (captured Nov 2, 2026). To update the menu, edit this file only — the website,
// the cart and the order server all read prices from here.
// ─────────────────────────────────────────────────────────────────────────────

export const categories = [
  {
    id: 'java',
    name: 'Coffee, Teas & More',
    short: 'Java',
    blurb: 'Espresso and drip coffee locally roasted by Mylke Coffee in Island, Kentucky.',
    items: [
      { name: 'Americano', desc: 'Espresso shots topped with hot water to create a light layer of crema resulting in a smooth and rich coffee. Also available iced. Served black unless otherwise specified.', sizes: [['Hot 16 oz', 4.25], ['Hot 20 oz', 4.75], ['Iced 16 oz', 4.25], ['Iced 24 oz', 4.75]] },
      { name: 'Cappuccino', desc: 'Hot coffee drink made with espresso, steamed milk, and a thick layer of milk foam', sizes: [['Regular 16 oz', 5]] },
      { name: 'Chai Latte', desc: "Chai latte is tea-based, not coffee-based: It's made with black tea + warm spices + milk so it tastes creamy, cozy, and lightly earthy. Also available iced or blended.", sizes: [['16 oz', 5], ['20 oz', 6]] },
      { name: 'Nitro Cold Brew', desc: 'Nitro cold brew is a version of cold brew coffee that has been infused with nitrogen gas, giving it a cascading, frothy texture and a velvety-smooth finish. This process creates microbubbles that give the coffee a rich, creamy head of foam.', sizes: [['16 oz', 4.25], ['24 oz', 4.75]] },
      { name: 'Drip Coffee', desc: 'Locally roasted by Mylke Coffee in Island, Kentucky. Medium roast blend with hints of nuttiness and subtle notes of sweetness, creating a symphony of tantalizing tastes. A gentle acidity brightens the ensemble, adding a refreshing touch to the overall drinking experience.', sizes: [['Regular 16 oz', 3], ['Large 20 oz', 3.5]] },
      { name: 'Espresso', desc: 'Robust flavor profile, accentuated by indulgent notes of dark chocolate and caramel.', sizes: [['Single', 2], ['Double', 3.5]] },
      { name: 'Hot Chocolate', desc: 'Rich chocolate and steamed milk. Topped with whipped cream.', sizes: [['Regular 16 oz', 4], ['Large 20 oz', 4.5], ["Kid's 12 oz (with adult purchase only)", 2.5]] },
      { name: 'Latte', popular: true, desc: 'Rich espresso roasted locally, blended with steamed milk with a light layer of froth. Make it your own by choosing custom flavors and milks, or keep it traditional. Available hot or iced. Regular size includes 2 shots of Espresso, and Large includes 3 shots.', sizes: [['Hot 16 oz', 5], ['Hot 20 oz', 6], ['Iced 16 oz', 5], ['Iced 24 oz', 6], ['Blended 16 oz', 5], ['Blended 24 oz', 6]] },
    ],
  },
  {
    id: 'specials',
    name: 'Drink Specials',
    short: 'Specials',
    blurb: 'Seasonal lattes and chais — ask what’s on the board today.',
    items: [
      { name: 'Banana Bread Latte', feature: true, desc: 'Rich espresso, milk, caramel, banana, and cinnamon. Available hot, iced, or blended with ice. Now available sugar-free!', sizes: [['Regular 16 oz', 6], ['Large', 7]] },
      { name: 'Wedding Cake Latte', popular: true, desc: 'Smooth White Chocolate and sweet Caramel are blended with almond cookie flavor, espresso, and your choice of milk to make a delectable coffee experience. Available hot, iced, or blended.', sizes: [['16 oz Regular', 6], ['Large (20 oz hot or 24 oz iced)', 7]] },
      { name: 'Caramel Apple Butter Chai', desc: 'Chai Latte with Caramel Apple Butter flavor. Available hot, iced, or blended. Like Fall in a cup! (Not available decaffeinated)', sizes: [['Regular', 5.5], ['Large', 6.5]] },
      { name: 'Pumpkin Caramel Cookie Butter Latte', desc: 'Pumpkin pie flavor, caramel, and cookie butter unite in this cozy latte, available hot or iced. We recommend our Caramel Pumpkin Spice Cold Foam on the iced version.', sizes: [['Regular', 6], ['Large', 7]] },
      { name: 'Pumpkin Caramel Cookie Butter Iced Nitro Cold Brew', desc: 'Pumpkin pie flavor, caramel, and cookie butter unite in this cozy Iced Nitro Cold Brew with a splash of cream. Topped with Caramel Pumpkin Spice Cold Foam and drizzled caramel.', sizes: [['Regular', 6.5], ['Large', 7.5]] },
      { name: 'Banana Peanut Butter Fudge Latte', desc: "Smooth and Sweet! Banana, White Chocolate, and Reese's Peanut Butter Sauce mixed with Espresso and your choice of milk. Available hot, iced, or blended. We recommend Banana Cold Foam on iced version.", sizes: [['Regular', 6], ['Large', 7]] },
      { name: 'German Chocolate Cake Latte', desc: 'Rich chocolate, hints of coconut, and a delicate nutty undertone blend with smooth espresso and your choice of milk. Topped with toasted coconut, unless otherwise specified. Available hot or iced.', sizes: [['Regular', 6], ['Large', 7]] },
      { name: 'Maple Nut Goodie Latte', desc: "Tastes like ole' fashioned Maple Nut Goodie candies! Butter Pecan, Toffee, & Maple blended with espresso & your choice of milk. Available hot or iced. We recommend Maple Sea Salt Cold Foam with iced.", sizes: [['Regular 16 oz', 6], ['Large', 7]] },
      { name: 'Mellow Matcha Iced Latte', desc: 'We take our housemade brown sugar vanilla syrup and mix it with lavender syrup and your choice of milk, then top with a fluffy matcha cold foam "cloud" made with real matcha powder.', sizes: [['Regular', 6.5], ['Large', 7.5]] },
    ],
  },
  {
    id: 'acai',
    name: 'Acai Bowls',
    short: 'Acai',
    blurb: 'Blended to order and loaded with fresh fruit and gluten-free granola.',
    items: [
      { name: 'Happy Acai Bowl', popular: true, desc: 'Pineapple, apple & acai. Topped with gluten-free granola, coconut, cacao nibs, strawberry, blueberry, banana, chia seeds & almond butter.', sizes: [['Regular', 11.5]] },
      { name: 'Peanut Butter Passion Acai Bowl', desc: 'Peanut butter, strawberry, mango & acai. Topped with gluten-free granola, coconut, cacao nibs, strawberry, blueberry, banana, chia seeds & almond butter.', sizes: [['Regular', 11.5]] },
      { name: 'Tropical Colada Blue Spirulina Bowl', desc: 'A Coconut and Pineapple Blue Spirulina Sorbet flavored with pineapple and coconut, topped with gluten-free granola, shredded coconut, mango, strawberry, banana, chia seeds, and agave syrup.', sizes: [['Regular', 11.5]] },
    ],
  },
  {
    id: 'smoothies',
    name: 'Smoothies',
    short: 'Smoothies',
    blurb: 'Customizations welcome. Any smoothie can be made into a bowl for $2.00.',
    items: [
      { name: 'Berry Kind Smoothie', desc: 'Blueberry, strawberry, apple, mango, banana & almond milk. Make into a "bowl" with granola on top and bottom and bananas, blueberries, strawberries, and Agave on top for additional $2.00', sizes: [['16 oz', 9.5], ['24 oz', 11], ["Kid's 12 oz (only with adult purchase)", 5]] },
      { name: 'Gentle George Smoothie', desc: 'Mango, pineapple, banana, almond butter, cacao nibs, unsweetened almond milk & vegan chocolate protein powder.', sizes: [['16 oz', 10.5], ['24 oz', 12], ["Kid's 12 oz (only with adult purchase)", 5]] },
      { name: 'Green Goodness Smoothie', popular: true, desc: 'Mango, pineapple, spinach, apple, banana & almond milk.', sizes: [['16 oz', 9.5], ['24 oz', 11], ["Kid's 12 oz (only with adult purchase)", 5]] },
      { name: 'Groovy Love Smoothie', desc: 'Strawberry, banana, apple & almond milk.', sizes: [['16 oz', 9.5], ['24 oz', 11], ["Kid's 12 oz (only with adult purchase)", 5]] },
      { name: 'PB & Joy Smoothie', desc: 'Peanut butter, blueberry, strawberry, banana & almond milk. Also available with almond butter instead of peanut butter.', sizes: [['16 oz', 9.5], ['24 oz', 11], ["Kid's 12 oz (only with adult purchase)", 5]] },
      { name: 'Peacefull Sunshine', desc: 'Lemon, Orange, Carrot, mango, pineapple, banana & vanilla protein', sizes: [['16 oz', 10.5], ['24 oz', 12], ["Kid's 12 oz (only with adult purchase)", 5]] },
    ],
  },
  {
    id: 'juice',
    name: 'Juices',
    short: 'Juice',
    blurb: 'Fresh squeezed in the cafe, or grab a bottle from the cooler.',
    items: [
      { name: 'Main Squeeze Juice', desc: 'Lemon, orange & carrot.', sizes: [['Cooler Bottle', 7.5], ['Fresh Squeezed', 8.5]] },
      { name: 'Fruit Root Juice', desc: 'Beet, carrot, ginger, carrot, & apple.', sizes: [['Cooler Bottle', 7.5], ['Fresh Squeezed', 8.5]] },
      { name: 'Old Faithful Juice', desc: 'Lemon, celery, cucumber, carrot, apple, beet & ginger.', sizes: [['Cooler Bottle', 7.5], ['Fresh Squeezed', 8.5]] },
      { name: 'Joyous Jade Juice', desc: 'Lemon, spinach, cucumber, & apple', sizes: [['Cooler Bottle', 7.5], ['Fresh Squeezed', 8.5]] },
      { name: 'Ginger Shot', desc: 'Ginger Root, Apple, Lemon, Cayenne Pepper', sizes: [['8 oz Bottle', 8]] },
      { name: 'Turmeric Shot', desc: 'Oranges, Black Pepper, Turmeric, Olive Oil', sizes: [['8 oz Bottle', 8]] },
    ],
  },
  {
    id: 'breakfast',
    name: 'Bountiful Breakfast',
    short: 'Breakfast',
    blurb: 'Served from opening. Customizations welcome.',
    items: [
      { name: 'The Ultimate', desc: 'Enjoy an over-the-top indulgent treat that will kick-start your day! A buttery croissant is stacked high with eggs, crispy bacon, sausage, avocado, house-made garlic tomato jam, & Pepper Jack cheese.', sizes: [['Regular', 8]] },
      { name: 'Avocado Toast', popular: true, desc: 'Toasted flatbread or whole wheat smothered with roasted red pepper hummus, fresh avocado, tomato, olive oil, red pepper flakes & topped off with seasoning. Upgrade to a Flatbread for additional $2.00', sizes: [['Regular', 5]] },
      { name: 'Best Burrito of the South', popular: true, desc: 'Get things done after enjoying this protein packed burrito stuffed with Colby cheese, sausage crumbles, bacon, sautéed peppers, & scrambled eggs. Served with either salsa or chipotle ranch on the side. Make it a Bowl without tortilla at same cost.', sizes: [['Regular', 6.5]] },
      { name: "Lil' Bit Nutty", desc: 'Almond butter or peanut butter spread onto artisan toast & topped with banana, honey or agave & cinnamon.', sizes: [['Regular', 5]] },
      { name: 'Rise & Shine / Maple Waffle Sammy', desc: 'Create your own sammy with your choice of bread stacked with egg patty, your choice of cheese, & your choice of meat (or double the egg instead of meat). Make it a little sweeter with our Maple Waffle Sammy for an additional $1.00 Jazz it up with avocado, leafy greens, tomato, and spicy mayo for additional $1.00.', sizes: [['Regular', 6.5]] },
      { name: 'Cinnamon Roll', desc: 'Fresh baked cinnamon roll with house made cream cheese icing', sizes: [['One Roll', 4.5]] },
    ],
  },
  {
    id: 'lunch',
    name: 'Soups, Salads, Sammies & Wraps',
    short: 'Lunch',
    blurb: 'Sammies and wraps include chips. Swap for carrots & hummus (+$2.00).',
    items: [
      { name: 'Soup of the Day', desc: "Call for options! Enjoy a piping hot bowl of fresh hot homemade soup that's made in house with only the best! Served with crackers.", sizes: [['Regular', 7]] },
      { name: 'Chicken Caesar Salad', desc: 'Crisp & refreshing Romaine, grilled chicken, Italian cheese, pickled red onion, olives, tomato & croutons. Served with Caesar dressing. Make your salad into a wrap with a bag of chips for same price. Substitute chicken salad, if desired.', sizes: [['Regular', 10.5]] },
      { name: "Chef's Choice Salad", desc: 'A fresh bed of greens topped with diced ham, turkey, tomato, onion, crisp bacon, Cheddar & Colby cheese blend, boiled egg & your choice of dressing. Served with club crackers.', sizes: [['Regular', 10.5]] },
      { name: 'Summer Berry Splender Salad', desc: 'Tender baby spinach topped with sweet strawberries, blueberries, cranberry pecan crunch, Feta cheese & poppy seed vinaigrette. Add chicken or chicken salad for additional $2.00', sizes: [['Regular', 10.5]] },
      { name: 'The Gobbler Sammy', desc: 'Toasted sourdough bread is topped with your choice of ham or turkey, bacon & Cheddar or Pepper Jack cheese topped off with homemade lemon-garlic aioli, fresh greens & tomato. Includes Chips.', sizes: [['Regular', 10]] },
      { name: 'Chicken Salad Sammy', desc: 'A scoop of our delicious chicken is stacked on your choice of toasted sourdough, toasted whole wheat, toasted croissant, or made into a wrap. Topped with fresh spring greens, red onion & tomato. Served with chips.', sizes: [['Regular', 10]] },
      { name: 'Virtuous Veggie Wrap', desc: 'This super healthy & delicious wrap is layered with red pepper hummus & piled high with tomato, onion, spinach, bell pepper, banana peppers, carrot, cucumbers, red cabbage, & home grown sprouts. Includes chips.', sizes: [['Regular', 10]] },
      { name: 'Chicken Bacon Ranch Flatbread', desc: 'Toasted flatbread with house made ranch, chicken, crispy bacon and shredded cheese. Includes Chips. Make it a wrap at no additional cost.', sizes: [['Regular', 10]] },
      { name: 'Pesto Chicken Flatbread', desc: 'Toasted flatbread with basil pesto, chicken, cherry tomatoes, Italian cheeses, and a balsamic glaze. Includes chips. Make it into a wrap with a bag of chips at no additional cost.', sizes: [['Regular', 10]] },
    ],
  },
  {
    id: 'chillers',
    name: 'Chillers',
    short: 'Chillers',
    blurb: 'Icy blended frappes. Add a shot of espresso for an extra boost.',
    items: [
      { name: 'Vanilla Chai Chiller', desc: 'Just the right amount of sweet and spicy black tea, honey, vanilla and spices, creating the perfect cup of icy blended chai.', sizes: [['Regular 16 oz', 5.5], ['Large 24 oz', 6]] },
      { name: 'Dulce de Leche Chiller', desc: 'Dulce de leche is a creamy confection made with sugar and milk that are slow-cooked for deep caramel flavor. Our take on the Latin American favorite stays true to its inspiration, with full-bodied Arabica coffee, sweet, silky caramel flavor and butterscotch candy pieces. Topped with whipped cream and caramel drizzle.', sizes: [['Regular 16 oz', 5.5], ['Large 24 oz', 6]] },
      { name: '"Almond Joy" Chiller', desc: 'Rich Chocolate and Coconut flavors mixed into an icy blended beverage. Topped with whipped cream and drizzled with chocolate.', sizes: [['Regular 16 oz', 5.5], ['Large 24 oz', 6]] },
      { name: 'Cotton Candy Chiller', desc: "A great kid's treat (that adults love as well!). A nostalgic cotton candy flavor, topped with whipped cream.", sizes: [['16 oz', 5.5], ['24 oz', 6]] },
      { name: 'Kona Mocha Chiller', desc: "Inspired by the full-bodied taste of Hawaii's Kona coffee, our mocha mix has deep-roasted flavor and big chocolate taste. Icy and blended, topped with whipped cream and chocolate drizzle.", sizes: [['Regular 16 oz', 5.5], ['Large 24 oz', 6]] },
      { name: '"Nutella" Chiller', desc: 'Iced Blended Beverage with rich chocolate and hazelnut flavors, topped with whipped cream', sizes: [['Regular 16 oz', 5.5], ['Large 24 oz', 6]] },
      { name: 'White Chocolate Chiller', desc: 'Iced Blended Beverage with decadent white chocolate flavor, topped with Whipped Cream. Add blueberry or raspberry flavor for extra indulgence!', sizes: [['Regular 16 oz', 5.5], ['Large 24 oz', 6]] },
    ],
  },
];

// Summary of add-ons shown under the menu (prices are add-ons).
export const customizations = [
  { group: 'Milk', options: ['Non Fat Skim', '2%', 'Whole', ['Unsweetened Almond', 0.5], ['Oat', 0.5], ['Breve (Half & Half)', 0.5]] },
  { group: 'Add a Flavor (+$0.50)', options: ['White Chocolate', 'Raspberry', 'Mocha', 'Toffee Crunch', 'Caramel', 'Coconut', 'Vanilla', 'Peppermint', 'Salted Caramel', 'Hazelnut', 'Pumpkin Spice', 'French Vanilla', 'Sugar-Free Mocha', 'Sugar-Free White Chocolate'] },
  { group: 'Coffee Extras', options: [['Extra Espresso Shot', 1], ['Cold Foam', 1], ['Whipped Cream', 0.75], 'Make Decaf', 'Make Sugar-Free', 'Hot, Iced or Blended'] },
  { group: 'Acai & Smoothie Boosters', options: [['Vanilla Protein', 1], ['Chocolate Protein', 1], ['Hemp Protein', 1], ['Energize Booster', 1], ['Immune Support Booster', 1], ['Almond Butter', 0.5], ['Peanut Butter', 0.5], ['Honey', 0.5], ['Agave Syrup', 0.5], ['Make a Smoothie a Bowl', 2]] },
  { group: 'Breakfast', options: [['Maple Waffle bread', 1], 'Flaky Croissant', 'Toasted Whole Wheat', ['Extra Bacon or Sausage', 1.5], ['Avocado, Greens, Tomato & Spicy Mayo', 1], ['Candied Jalapeños on The Ultimate', 1]] },
  { group: 'Salads & Sammies', options: [['Add Chicken or Chicken Salad', 2], ['Grown In-House Sprouts', 1], ['Sliced Avocado', 1], ['Swap chips for Carrots & Hummus', 2], 'Ranch, Honey Mustard, Italian, Poppy Seed or Caesar dressing'] },
];

// Pickup hours (America/Chicago). Confirm with owner.
export const hours = [
  { day: 'Sunday', open: '12:00', close: '15:00' },
  { day: 'Monday', open: '06:00', close: '15:00' },
  { day: 'Tuesday', open: '06:00', close: '15:00' },
  { day: 'Wednesday', open: '06:00', close: '18:00' },
  { day: 'Thursday', open: '06:00', close: '18:00' },
  { day: 'Friday', open: '06:00', close: '16:00' },
  { day: 'Saturday', open: '08:00', close: '15:00' },
];

export const business = {
  name: 'Joy-Full Java + Juice',
  owner: 'Ashley Webb',
  phone: '270-478-4409',
  phoneHref: 'tel:+12704784409',
  cateringPhone: '270-302-8337',
  cateringHref: 'sms:+12703028337',
  street: '3811 Leitchfield Rd (KY 54), Unit 103',
  city: 'Owensboro, KY 42303',
  mapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=3811+Leitchfield+Rd+Unit+103+Owensboro+KY+42303',
  facebook: 'https://www.facebook.com/158647707337785',
  instagram: 'https://www.instagram.com/joyfulljavajuice',
  classes: 'http://www.joyscookingclasses.com/',
  mealPrep: 'http://www.joyscookingclasses.com/joy-full-meal-prep',
  roaster: 'Mylke Coffee, Island, KY',
};

// ─────────────────────────────────────────────────────────────────────────────
// PHOTOS. Real cafe photos where they exist ("real"); otherwise a licensed
// Unsplash photo matched to the published recipe ("stock"), shown with a small
// "Sample photo" tag until the owner supplies her own. Replace a file in
// public/photos/menu/ with the same name and change `stock` to false.
// ─────────────────────────────────────────────────────────────────────────────
const REAL = {
  'Latte': '/photos/mocha-happy-sleeve.webp',
  'Happy Acai Bowl': '/photos/menu-happy-acai.webp',
  'Peanut Butter Passion Acai Bowl': '/photos/acai-bowl-booth.webp',
  'Avocado Toast': '/photos/menu-avocado-toast.webp',
  'Vanilla Chai Chiller': '/photos/menu-vanilla-chai-chiller.webp',
};
const STOCK = {
  'Americano': 'americano', 'Cappuccino': 'cappuccino', 'Chai Latte': 'chai-latte', 'Nitro Cold Brew': 'nitro-cold-brew',
  'Drip Coffee': 'drip-coffee', 'Espresso': 'espresso', 'Hot Chocolate': 'hot-chocolate',
  'Banana Bread Latte': 'banana-bread-latte', 'Wedding Cake Latte': 'wedding-cake-latte', 'Caramel Apple Butter Chai': 'caramel-apple-butter-chai',
  'Pumpkin Caramel Cookie Butter Latte': 'pumpkin-caramel-cookie-butter-latte', 'Pumpkin Caramel Cookie Butter Iced Nitro Cold Brew': 'pumpkin-nitro',
  'Banana Peanut Butter Fudge Latte': 'banana-pb-fudge-latte', 'German Chocolate Cake Latte': 'german-chocolate-cake-latte',
  'Maple Nut Goodie Latte': 'maple-nut-goodie-latte', 'Mellow Matcha Iced Latte': 'mellow-matcha',
  'Berry Kind Smoothie': 'berry-kind', 'Gentle George Smoothie': 'gentle-george', 'Green Goodness Smoothie': 'green-goodness',
  'Groovy Love Smoothie': 'groovy-love', 'PB & Joy Smoothie': 'pb-and-joy', 'Peacefull Sunshine': 'peacefull-sunshine',
  'Main Squeeze Juice': 'main-squeeze', 'Fruit Root Juice': 'fruit-root', 'Old Faithful Juice': 'old-faithful', 'Joyous Jade Juice': 'joyous-jade',
  'Ginger Shot': 'ginger-shot', 'Turmeric Shot': 'turmeric-shot',
  'The Ultimate': 'the-ultimate', 'Best Burrito of the South': 'best-burrito', "Lil' Bit Nutty": 'lil-bit-nutty',
  'Rise & Shine / Maple Waffle Sammy': 'rise-and-shine', 'Cinnamon Roll': 'cinnamon-roll',
  'Soup of the Day': 'soup', 'Chicken Caesar Salad': 'chicken-caesar', "Chef's Choice Salad": 'chefs-choice',
  'Summer Berry Splender Salad': 'summer-berry', 'The Gobbler Sammy': 'gobbler', 'Chicken Salad Sammy': 'chicken-salad-sammy',
  'Virtuous Veggie Wrap': 'veggie-wrap', 'Chicken Bacon Ranch Flatbread': 'cbr-flatbread', 'Pesto Chicken Flatbread': 'pesto-flatbread',
  'Dulce de Leche Chiller': 'dulce-de-leche', '"Almond Joy" Chiller': 'almond-joy', 'Cotton Candy Chiller': 'cotton-candy',
};
for (const c of categories) for (const it of c.items) {
  if (REAL[it.name]) { it.photo = REAL[it.name]; it.stock = false; }
  else if (STOCK[it.name]) { it.photo = `/photos/menu/${STOCK[it.name]}.webp`; it.stock = true; }
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDERING: stable item ids + the real customization groups for each item.
// Group types: 'one' = pick exactly one (required unless min: 0), 'many' = pick
// any (up to max). Prices are add-ons in dollars. The server re-prices every
// order from this file, so a customer can never change a price in their browser.
// ─────────────────────────────────────────────────────────────────────────────
export const slug = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/["']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const G = {
  temp: { id: 'temp', name: 'Hot, iced or blended', type: 'one', options: [['Hot', 0], ['Iced', 0], ['Blended', 0]] },
  tempHI: { id: 'temp', name: 'Hot or iced', type: 'one', options: [['Hot', 0], ['Iced', 0]] },
  milk: { id: 'milk', name: 'Milk', type: 'one', min: 0, options: [['Non Fat Skim', 0], ['2%', 0], ['Whole', 0], ['Unsweetened Almond', 0.5], ['Oat', 0.5], ['Breve (Half & Half)', 0.5]] },
  flavor: { id: 'flavor', name: 'Add a flavor', type: 'many', max: 3, options: ['White Chocolate Sauce', 'Raspberry', 'Mocha', 'Toffee Crunch', 'Caramel', 'Coconut', 'Vanilla', 'Peppermint', 'Salted Caramel', 'Hazelnut', 'Pumpkin Spice', 'French Vanilla', 'Sugar-Free Mocha', 'Sugar-Free White Chocolate'].map((n) => [n, 0.5]) },
  coffeeExtras: { id: 'extras', name: 'Extras', type: 'many', options: [['Extra espresso shot', 1], ['Add cold foam', 1], ['Add whipped cream', 0.75], ['Make decaf', 0], ['Make sugar-free', 0]] },
  chaiExtras: { id: 'extras', name: 'Extras', type: 'many', options: [['Add espresso shot (make it dirty)', 1], ['Add cold foam', 1], ['Add whipped cream', 0.75], ['Make sugar-free', 0]] },
  noWhip: { id: 'whip', name: 'Whipped cream', type: 'many', options: [['No whipped cream', 0]] },
  chillerExtras: { id: 'extras', name: 'Extras', type: 'many', options: [['Add espresso shot', 1], ['No whipped cream', 0]] },
  whiteChocFlavor: { id: 'flavor', name: 'Add flavor', type: 'many', options: [['Raspberry', 0.5], ['Blueberry', 0.5]] },
  boosters: { id: 'boost', name: 'Boosters', type: 'many', options: [['Vanilla protein', 1], ['Chocolate protein', 1], ['Hemp protein', 1], ['Energize booster', 1], ['Immune support booster', 1], ['Almond butter', 0.5], ['Peanut butter', 0.5], ['Honey', 0.5], ['Agave syrup', 0.5]] },
  makeBowl: { id: 'bowl', name: 'Make it a bowl', type: 'many', options: [['Make it a bowl (granola, strawberry, blueberry, banana & agave)', 2]] },
  acaiSwap: { id: 'swap', name: 'Swap', type: 'many', options: [['Peanut butter instead of almond butter', 0]] },
  tropicalMods: { id: 'mods', name: 'Leave off', type: 'many', options: [['No granola', 0], ['No shredded coconut', 0], ['No banana', 0], ['No mango', 0], ['No strawberry', 0], ['No agave', 0], ['No chia seeds', 0], ['Honey instead of agave', 0]] },
  tropicalAdd: { id: 'add', name: 'Add', type: 'many', options: [['Vanilla protein', 1], ['Nutella', 0.5], ['Almond butter', 0.5], ['Peanut butter', 0.5]] },
  georgeProtein: { id: 'protein', name: 'Protein', type: 'many', options: [['Vanilla protein instead of chocolate', 0]] },
  pbSwap: { id: 'swap', name: 'Nut butter', type: 'one', options: [['Peanut butter', 0], ['Almond butter', 0]] },
  riseBread: { id: 'bread', name: 'Bread', type: 'one', options: [['Flaky croissant', 0], ['Toasted whole wheat', 0], ['Maple waffle', 1]] },
  riseCheese: { id: 'cheese', name: 'Cheese', type: 'one', options: [['White American', 0], ['Cheddar', 0], ['Pepper Jack', 0], ['No cheese', 0]] },
  riseProtein: { id: 'protein', name: 'Meat', type: 'one', options: [['Sausage', 0], ['Bacon', 0], ['Ham', 0], ['Double egg (no meat)', 0]] },
  riseExtra: { id: 'extra', name: 'Extras', type: 'many', options: [['Extra bacon', 1.5], ['Extra sausage', 1.5], ['Avocado, leafy greens, tomato & spicy mayo', 1]] },
  jalapenos: { id: 'jal', name: 'Kick it up', type: 'many', options: [['Candied jalapeños', 1]] },
  avoBase: { id: 'base', name: 'Base', type: 'one', options: [['Whole wheat', 0], ['Toasted flatbread', 2]] },
  avoTop: { id: 'top', name: 'Toppings', type: 'many', options: [['No tomato', 0], ['Add bacon', 1], ['Add egg', 1]] },
  nuttySpread: { id: 'spread', name: 'Spread', type: 'one', options: [['Almond butter', 0], ['Peanut butter', 0]] },
  nuttySweet: { id: 'sweet', name: 'Drizzle', type: 'one', options: [['Honey', 0], ['Agave', 0]] },
  nuttyAdd: { id: 'add', name: 'Add', type: 'many', options: [['Strawberry, blueberry & granola', 1]] },
  burritoStyle: { id: 'style', name: 'Style', type: 'one', options: [['Wrapped in a tortilla', 0], ['Make it a bowl (no tortilla)', 0]] },
  burritoSauce: { id: 'sauce', name: 'On the side', type: 'one', options: [['Salsa', 0], ['Chipotle ranch', 0]] },
  burritoAdd: { id: 'add', name: 'Add', type: 'many', options: [['Avocado', 1], ['House-grown sprouts', 1]] },
  warmed: { id: 'warm', name: 'Warmed?', type: 'one', options: [['Warmed', 0], ['Not warmed', 0]] },
  gobblerMeat: { id: 'meat', name: 'Meat', type: 'one', options: [['Turkey', 0], ['Ham', 0]] },
  gobblerCheese: { id: 'cheese', name: 'Cheese', type: 'one', options: [['Cheddar', 0], ['Pepper Jack', 0]] },
  sammyBread: { id: 'bread', name: 'Bread', type: 'one', options: [['Toasted sourdough', 0], ['Toasted whole wheat', 0], ['Toasted croissant', 0], ['Wrap', 0]] },
  sammyTop: { id: 'top', name: 'Toppings', type: 'many', options: [['No tomato', 0], ['No onion', 0], ['No greens', 0], ['Add spicy mayo', 0], ['Add mayo', 0], ['Add avocado', 1], ['Add sprouts', 1]] },
  chipsSwap: { id: 'side', name: 'Side', type: 'many', options: [['Carrots & hummus instead of chips', 2]] },
  flatWrap: { id: 'style', name: 'Style', type: 'one', options: [['Flatbread', 0], ['Make it a wrap (with chips)', 0]] },
  dressing: { id: 'dressing', name: 'Dressing', type: 'one', options: [['Ranch', 0], ['Honey mustard', 0], ['Italian', 0], ['Poppy seed', 0], ['Caesar', 0], ['No dressing', 0]] },
  saladWrap: { id: 'wrap', name: 'Make it a wrap', type: 'many', options: [['Make it a wrap with a bag of chips', 0]] },
  saladAdd: { id: 'add', name: 'Add', type: 'many', options: [['Chicken', 2], ['Chicken salad', 2], ['Grown in-house sprouts', 1], ['Sliced avocado', 1]] },
  caesarSub: { id: 'sub', name: 'Swap', type: 'many', options: [['Chicken salad instead of grilled chicken', 0]] },
  decaf: { id: 'decaf', name: 'Decaf', type: 'many', options: [['Make decaf', 0]] },
  espressoAdd: { id: 'extras', name: 'Extras', type: 'many', options: [['Extra shot', 1]] },
  hotChoc: { id: 'extras', name: 'Extras', type: 'many', options: [['No whipped cream', 0], ['Add a flavor shot', 0.5]] },
};

const coffee = [G.milk, G.flavor, G.coffeeExtras];
const OPTIONS = {
  'Americano': [G.flavor, G.coffeeExtras],
  'Cappuccino': coffee,
  'Chai Latte': [G.milk, G.flavor, G.chaiExtras],
  'Nitro Cold Brew': [G.milk, G.flavor, G.coffeeExtras],
  'Drip Coffee': [G.milk, G.flavor, G.decaf],
  'Espresso': [G.espressoAdd, G.decaf],
  'Hot Chocolate': [G.milk, G.hotChoc],
  'Latte': coffee,
  'Banana Bread Latte': [G.temp, ...coffee],
  'Wedding Cake Latte': [G.temp, ...coffee],
  'Caramel Apple Butter Chai': [G.temp, G.milk, G.chaiExtras],
  'Pumpkin Caramel Cookie Butter Latte': [G.tempHI, ...coffee],
  'Pumpkin Caramel Cookie Butter Iced Nitro Cold Brew': [G.flavor, G.coffeeExtras],
  'Banana Peanut Butter Fudge Latte': [G.temp, ...coffee],
  'German Chocolate Cake Latte': [G.tempHI, ...coffee],
  'Maple Nut Goodie Latte': [G.tempHI, ...coffee],
  'Mellow Matcha Iced Latte': [G.milk, G.coffeeExtras],
  'Happy Acai Bowl': [G.acaiSwap, G.boosters],
  'Peanut Butter Passion Acai Bowl': [G.boosters],
  'Tropical Colada Blue Spirulina Bowl': [G.tropicalMods, G.tropicalAdd],
  'Berry Kind Smoothie': [G.makeBowl, G.boosters],
  'Gentle George Smoothie': [G.georgeProtein, G.makeBowl, G.boosters],
  'Green Goodness Smoothie': [G.makeBowl, G.boosters],
  'Groovy Love Smoothie': [G.makeBowl, G.boosters],
  'PB & Joy Smoothie': [G.pbSwap, G.makeBowl, G.boosters],
  'Peacefull Sunshine': [G.makeBowl, G.boosters],
  'The Ultimate': [G.jalapenos],
  'Avocado Toast': [G.avoBase, G.avoTop],
  'Best Burrito of the South': [G.burritoStyle, G.burritoSauce, G.burritoAdd],
  "Lil' Bit Nutty": [G.nuttySpread, G.nuttySweet, G.nuttyAdd],
  'Rise & Shine / Maple Waffle Sammy': [G.riseBread, G.riseCheese, G.riseProtein, G.riseExtra],
  'Cinnamon Roll': [G.warmed],
  'Chicken Caesar Salad': [G.saladWrap, G.caesarSub, G.saladAdd],
  "Chef's Choice Salad": [G.dressing, G.saladAdd],
  'Summer Berry Splender Salad': [G.saladAdd],
  'The Gobbler Sammy': [G.gobblerMeat, G.gobblerCheese, G.sammyTop, G.chipsSwap],
  'Chicken Salad Sammy': [G.sammyBread, G.sammyTop, G.chipsSwap],
  'Virtuous Veggie Wrap': [G.sammyTop, G.chipsSwap],
  'Chicken Bacon Ranch Flatbread': [G.flatWrap, G.sammyTop, G.chipsSwap],
  'Pesto Chicken Flatbread': [G.flatWrap, G.sammyTop, G.chipsSwap],
  'Vanilla Chai Chiller': [G.milk, G.chillerExtras],
  'Dulce de Leche Chiller': [G.milk, G.chillerExtras],
  '"Almond Joy" Chiller': [G.milk, G.chillerExtras],
  'Cotton Candy Chiller': [G.milk, G.chillerExtras],
  'Kona Mocha Chiller': [G.milk, G.chillerExtras],
  '"Nutella" Chiller': [G.milk, G.chillerExtras],
  'White Chocolate Chiller': [G.milk, G.whiteChocFlavor, G.chillerExtras],
};

// Build the size group + attach ids/options to every item.
export const itemsById = {};
for (const c of categories) for (const it of c.items) {
  it.id = slug(it.name);
  it.category = c.id;
  const groups = [];
  if (it.sizes.length > 1) groups.push({ id: 'size', name: 'Size', type: 'one', options: it.sizes.map(([n, p]) => [n, p]), isSize: true });
  for (const g of OPTIONS[it.name] ?? []) groups.push(g);
  it.groups = groups;
  itemsById[it.id] = it;
}
