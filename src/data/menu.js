// ─────────────────────────────────────────────────────────────────────────────
// REAL MENU — Joy-Full Java + Juice, 3811 KY 54, Owensboro KY
// Source: the cafe's live ChowNow ordering menu (restaurant 59239), captured
// Nov 2, 2026. Names, descriptions, sizes and prices are copied as published.
// To update: edit this file only. Nothing here is invented.
// ─────────────────────────────────────────────────────────────────────────────

export const ORDER_URL = 'https://order.chownow.com/order/38929/locations/59239';
export const itemOrderUrl = () => ORDER_URL;

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

// Real customization options from the ChowNow menu (prices are add-ons).
export const customizations = [
  { group: 'Milk', options: ['Non Fat Skim', '2%', 'Whole', ['Unsweetened Almond', 0.5], ['Oat', 0.5], ['Breve (Half & Half)', 0.5]] },
  { group: 'Add a Flavor (+$0.50)', options: ['White Chocolate', 'Raspberry', 'Mocha', 'Toffee Crunch', 'Caramel', 'Coconut', 'Vanilla', 'Peppermint', 'Salted Caramel', 'Hazelnut', 'Pumpkin Spice', 'French Vanilla', 'Sugar-Free Mocha', 'Sugar-Free White Chocolate'] },
  { group: 'Coffee Extras', options: [['Extra Espresso Shot', 1], ['Cold Foam', 1], ['Whipped Cream', 0.75], 'Make Decaf', 'Make Sugar-Free', 'Hot, Iced or Blended'] },
  { group: 'Acai & Smoothie Boosters', options: [['Vanilla Protein', 1], ['Chocolate Protein', 1], ['Hemp Protein', 1], ['Energize Booster', 1], ['Immune Support Booster', 1], ['Almond Butter', 0.5], ['Peanut Butter', 0.5], ['Honey', 0.5], ['Agave Syrup', 0.5], ['Make a Smoothie a Bowl', 2]] },
  { group: 'Breakfast', options: [['Maple Waffle bread', 1], 'Flaky Croissant', 'Toasted Whole Wheat', ['Extra Bacon or Sausage', 1.5], ['Avocado, Greens, Tomato & Spicy Mayo', 1], ['Candied Jalapeños on The Ultimate', 1]] },
  { group: 'Salads & Sammies', options: [['Add Chicken or Chicken Salad', 2], ['Grown In-House Sprouts', 1], ['Sliced Avocado', 1], ['Swap chips for Carrots & Hummus', 2], 'Ranch, Honey Mustard, Italian, Poppy Seed or Caesar dressing'] },
];

// Hours as published on the cafe's ChowNow pickup schedule. Confirm with owner.
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
