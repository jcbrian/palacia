const got = require("got");
const cheerio = require("cheerio");
const config = require("./config.json");


async function firstBody() {
  let URL = "https://shop-usa.palaceskateboards.com/collections/accessories";
  const res = await got(URL);
  const body = await res.body;

  const $ = cheerio.load(body);
  const items = $(".product-grid-item");
  const products = items
    .map((i, n) => {
      const item = $(n);
      const alpha = item.data("alpha");
      const index = item.data("i");
      const price = item.data("price");
      const href = item.children('a[href^="/products"]').attr("href");
      return {
        alpha,
        price,
        index,
        href
      };
    })
    .toArray();
    return sortedProduct(products);
}
function sortedProduct(productArray) {
  //figured out i need to use a .some() method
  //set vars for this function
  const postiveKey = config.positiveKeywords;
  const negativeKey = config.negativeKeywords;
  const final = [];
  //loop running through product of array searching for product
  for (let i = 0; i < productArray.length; i++) {
    const currentProduct = productArray[i];
    const alpha = currentProduct.alpha;
    if (
      postiveKey.every(p => alpha.includes(p)) &&
      !negativeKey.some(n => alpha.includes(n))
    ) {
      final.push(currentProduct);
      console.log("product has been found");
      break;
    }
    console.log("not found");
  }
  return final
  
}
module.exports.firstBody = firstBody
module.exports.sortedProduct = sortedProduct


