const express = require("express");
const router = express.Router();
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");

const User = require("../models/User");

router.post("/user/signup", async (req, res) => {
  try {
    const { email, username, phone, password } = req.fields; // desctructuring
    // Est-ce qu'il n'y pas déjà un user qui possède cet email ?
    const user = await User.findOne({ email: email });
    if (!user) {
      if (email && password && username) {
        // Etape1 : encrypter le mot de passe
        // Générer hash, salt, token
        const salt = uid2(16);
        const hash = SHA256(salt + password).toString(encBase64);
        const token = uid2(64);

        // Déclarer le nouveau user
        const newUser = new User({
          email: email,
          account: {
            username: username,
            phone: phone,
          },
          token: token,
          hash: hash,
          salt: salt,
        });

        // Enregistrer dans la BDD
        await newUser.save();

        // Répondre au client
        res.status(200).json({
          _id: newUser._id,
          token: newUser.token,
          account: newUser.account,
        });
      } else {
        res.status(400).json({ message: "Missing parameter(s)" });
      }
    } else {
      res.status(409).json({ message: "This email already has an account" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/user/login", async (req, res) => {
  try {
    // chercher le user qui veut se connecter
    const user = await User.findOne({ email: req.fields.email });
    if (user) {
      // Générer un hash avec le salt du user + le password renseigné
      const newHash = SHA256(user.salt + req.fields.password).toString(
        encBase64
      );
      // Si le hash généré est égal au hash de la BDD ===> OK
      if (newHash === user.hash) {
        res.status(200).json({
          _id: user._id,
          token: user.token,
          account: user.account,
        });
      } else {
        // Sinon ===> Unauthorized
        res.status(401).json({ message: "Unauthorized" });
      }
    } else {
      res.status(400).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
