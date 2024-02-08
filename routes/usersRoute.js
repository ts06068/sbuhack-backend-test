const express = require("express");
const router = express.Router();

const User = require("../models/user");

const wrapAsync = require("../utils/helper");

router.get(
  "/users",
  wrapAsync(async (req, res) => {
    const uid = req.session.userId;
    const user = await User.findById(uid);
    res.json(user);
  })
);

router.put(
  "/users",
  wrapAsync(async (req, res) => {
    const uid = req.session.userId;
    const body = req.body;
    const { userName } = body;

    const updatedUser = await User.findByIdAndUpdate(
      uid,
      { userName },
      { new: true }
    );

    res.json(updatedUser);
  })
);

router.post(
  "/register",
  wrapAsync(async (req, res) => {
    const { userName } = req.body;
    const newUser = new User({ userName }).save();
    if (newUser) {
      req.session.userId = newUser._id;
      res.sendStatus(204);
    } else {
      res.sendStatus(401);
    }
  })
);

router.post(
  "/login",
  wrapAsync(async (req, res) => {
    const { userName } = req.body;
    const user = await User.findAndValidate(userName);

    if (user) {
      req.session.userId = user._id;
      res.sendStatus(204);
    } else {
      res.sendStatus(401);
    }
  })
);

router.post(
  "/logout",
  wrapAsync(async function (req, res) {
    req.session.userId = null;
    res.sendStatus(204);
  })
);

module.exports = router;
