const axios = require("axios");
const Dev = require("../models/Dev");
const parseStringAsArray = require("../utils/parseStringAsArray");
const { findConnections, sendMessage } = require("../websocket");

//index, show, store, update, destroy
module.exports = {
  async index(req, res) {
    const devs = await Dev.find();

    return res.json(devs);
  },

  async store(req, res) {
    const { github_username, techs, latitude, longitude } = req.body;

    let dev = await Dev.findOne({ github_username });

    if (!dev) {
      const response = await axios.get(
        `https://api.github.com/users/${github_username}`
      );

      const { name = login, avatar_url, bio } = response.data;

      const techsArray = parseStringAsArray(techs);

      const location = {
        type: "Point",
        coordinates: [longitude, latitude]
      };

      dev = await Dev.create({
        github_username,
        name,
        avatar_url,
        bio,
        techs: techsArray,
        location
      });

      const sendSocketMessageTo = findConnections(
        {
          latitude,
          longitude
        },
        techsArray
      );

      sendMessage(sendSocketMessageTo, "new-dev", dev);
    }

    return res.json(dev);
  },

  async update(req, res) {
    const { id } = req.params;
    const { github_username, latitude, longitude } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Validation fails." });
    }

    const dev = await Dev.findById(id);

    if (github_username !== dev.github_username) {
      const devExistis = await Dev.findOne({ where: { github_username } });

      if (devExistis) {
        return res.status(400).json({ error: "Dev already exists." });
      }
    }

    const response = await axios.get(
      `https://api.github.com/users/${github_username}`
    );

    const { name = login, avatar_url, bio } = response.data;

    const location = {
      type: "Point",
      coordinates: [longitude, latitude]
    };

    const devUpdated = await Dev.findByIdAndUpdate(
      id,
      { ...req.body, location, name, avatar_url, bio },
      { new: true }
    );

    return res.json(devUpdated);
  },

  async delete(req, res) {
    const { id } = req.params;

    const deleted = await Dev.findByIdAndDelete(id);

    return res.json(deleted);
  }
};
