const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2;
const isAuthenticated = require("../middlewares/isAuthenticated");
const Offer = require("../models/Offer");

router.post("/offer/publish", isAuthenticated, async (req, res) => {
  try {
    // créer une annonce
    console.log(req.fields);
    console.log(req.files.picture.path);

    // Desctructuring
    const { title, description, price, condition, city, brand, size, color } =
      req.fields;

    if (title && price && req.files.picture.path) {
      const newOffer = new Offer({
        product_name: title,
        product_description: description,
        product_price: price,
        product_details: [
          {
            MARQUE: brand,
          },
          {
            TAILLE: size,
          },
          {
            ÉTAT: condition,
          },
          {
            COULEUR: color,
          },
          {
            EMPLACEMENT: city,
          },
        ],
        owner: req.user,
      });

      // Uploader l'image vers cloudinary
      const result = await cloudinary.uploader.upload(req.files.picture.path, {
        folder: `/draco-vinted/offer/${newOffer._id}`,
      });

      // ajouter une clé product_image à newOffer
      newOffer.product_image = result;

      // sauvegarder l'annonce
      await newOffer.save();

      // répondre au clien
      res.status(200).json(newOffer);
    } else {
      res
        .status(400)
        .json({ message: "Title, Price and Picture are required" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/offers", async (req, res) => {
  try {
    const filters = {};

    if (req.query.title) {
      filters.product_name = new RegExp(req.query.title, "i");
    }

    if (req.query.priceMin) {
      filters.product_price = { $gte: Number(req.query.priceMin) };
    }

    if (req.query.priceMax) {
      if (filters.product_price) {
        filters.product_price.$lte = Number(req.query.priceMax);
      } else {
        filters.product_price = { $lte: Number(req.query.priceMax) };
      }
    }

    const sort = {};

    if (req.query.sort === "price-asc") {
      sort.product_price = 1;
    }

    if (req.query.sort === "price-desc") {
      sort.product_price = -1;
    }

    let page;
    const limit = Number(req.query.limit) || 10;

    if (Number(req.query.page) < 1) {
      page = 1;
    } else {
      page = Number(req.query.page);
    }

    const offers = await Offer.find(filters)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("owner", "account");
    // .populate({
    //   path: "owner",
    //   select: "account",
    // });

    const count = await Offer.countDocuments(filters);

    res.status(200).json({
      count: count,
      offers: offers,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/offer/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const offer = await Offer.findById(id).populate("owner", "account");
    res.status(200).json(offer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
