const mongoose = require('mongoose');
require('dotenv').config();

const Brand = require('../models/brand');

// Sample brand data
const brandsData = [
  {
    name: "Nike",
    website: "https://www.nike.com",
    email: "contact@nike.com",
  },
  {
    name: "Adidas",
    website: "https://www.adidas.com",
    email: "contact@adidas.com",
  },
  {
    name: "Puma",
    website: "https://www.puma.com",
    email: "contact@puma.com",
  },
  {
    name: "Gucci",
    website: "https://www.gucci.com",
    email: "contact@gucci.com",
  },
  {
    name: "Louis Vuitton",
    website: "https://www.louisvuitton.com",
    email: "contact@louisvuitton.com",
  },
  {
    name: "Zara",
    website: "https://www.zara.com",
    email: "contact@zara.com",
  },
  {
    name: "H&M",
    website: "https://www.hm.com",
    email: "contact@hm.com",
  },
  {
    name: "Forever 21",
    website: "https://www.forever21.com",
    email: "contact@forever21.com",
  },
  {
    name: "Uniqlo",
    website: "https://www.uniqlo.com",
    email: "contact@uniqlo.com",
  },
  {
    name: "Gap",
    website: "https://www.gap.com",
    email: "contact@gap.com",
  },
  {
    name: "Apple",
    website: "https://www.apple.com",
    email: "contact@apple.com",
  },
  {
    name: "Samsung",
    website: "https://www.samsung.com",
    email: "contact@samsung.com",
  },
  {
    name: "Sony",
    website: "https://www.sony.com",
    email: "contact@sony.com",
  },
  {
    name: "Microsoft",
    website: "https://www.microsoft.com",
    email: "contact@microsoft.com",
  },
  {
    name: "Google",
    website: "https://www.google.com",
    email: "contact@google.com",
  },
  {
    name: "Meta",
    website: "https://www.meta.com",
    email: "contact@meta.com",
  },
  {
    name: "Coca-Cola",
    website: "https://www.coca-cola.com",
    email: "contact@coca-cola.com",
  },
  {
    name: "Pepsi",
    website: "https://www.pepsi.com",
    email: "contact@pepsi.com",
  },
  {
    name: "McDonald's",
    website: "https://www.mcdonalds.com",
    email: "contact@mcdonalds.com",
  },
  {
    name: "Starbucks",
    website: "https://www.starbucks.com",
    email: "contact@starbucks.com",
  },
];

// Connect to MongoDB and insert brands
async function insertBrands() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ MongoDB Connected");

    // Clear existing brands (optional - comment out if you want to keep existing data)
    // await Brand.deleteMany({});
    // console.log("🗑️  Cleared existing brands");

    // Insert new brands
    const result = await Brand.insertMany(brandsData);
    console.log(`✅ Successfully inserted ${result.length} brands into the database`);

    // Display inserted brands
    console.log("\n📋 Inserted Brands:");
    result.forEach((brand, index) => {
      console.log(`${index + 1}. ${brand.name} (ID: ${brand._id})`);
    });

    // Get total count
    const totalCount = await Brand.countDocuments();
    console.log(`\n📊 Total brands in database: ${totalCount}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error inserting brands:", error.message);
    process.exit(1);
  }
}

insertBrands();
