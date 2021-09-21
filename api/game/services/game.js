"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */

const axios = require("axios");
const slugify = require("slugify");

async function getGameInfo(slug) {
  const jsdom = require("jsdom");
  const { JSDOM } = jsdom;
  const body = await axios.get(`https://www.gog.com/game/${slug}`);
  const dom = new JSDOM(body.data);

  const description = dom.window.document.querySelector(".description");

  return {
    rating: "BR0",
    short_description: description.textContent.slice(0, 160),
    description: description.innerHTML,
  };
}

async function getByName(name, entityName) {
  const item = await strapi.services[entityName].find({ name });

  return item.length ? item[0] : null;
}

async function create(name, entityName) {
  const item = await getByName(name, entityName);

  return !item
    ? await strapi.services[entityName].create({
        name,
        slug: slugify(name, { lower: true }),
      })
    : null;
}

async function createManyToManyData(products) {
  const developers = {};
  const publishers = {};
  const categories = {};
  const platforms = {};

  products.forEach((product) => {
    const { developer, publisher, genres, supportedOperatingSystems } = product;

    developers[developer] = true;
    publishers[publisher] = true;
    genres && genres.forEach((item) => (categories[item] = true));
    supportedOperatingSystems &&
      supportedOperatingSystems.forEach((item) => (platforms[item] = true));
  });

  return Promise.all([
    Object.keys(developers).map((name) => create(name, "developer")),
    Object.keys(publishers).map((name) => create(name, "publisher")),
    Object.keys(categories).map((name) => create(name, "category")),
    Object.keys(platforms).map((name) => create(name, "platform")),
  ]);
}

module.exports = {
  populate: async (params) => {
    const gogUrl = `https://www.gog.com/games/ajax/filtered?mediaType=game&page=1&sort=popularity`;

    const {
      data: { products },
    } = await axios.get(gogUrl);

    await createManyToManyData(products);
    // console.log(await getGameInfo(products[0].slug));
  },
};
