const got = require("got");
const cheerio = require("cheerio");
const config = require("./config.json");
const scrape = require("./scrape");

//cloth = false
//shoe = true 
let shoeOrCloth;
async function getDesiredItem(href, title) {
    let URL = `https://shop-usa.palaceskateboards.com${href}`;
    console.log(`Picked up Product:${URL} \nattemping checkout!`);
    const res = await got(URL);
    const body = await res.body;
    console.log(res.statusCode);
    const $ = cheerio.load(body);
    //problem pulling all size IDs instead of the first one 5_23_19 2:09 am
    let productID = $("#product-select option")
        .map((i, size) => {
            return $(size).attr("value");
        })
        .toArray();
    const sizeValues = $("#product-select option")
        .map((i, el) => $(el).text())
        .toArray();
    if (/\d/g.test(sizeValues[0])) {
        console.log('product is a shoe ')
        //since shoes have UK sizing i sliced the UK sizing part out 
        return sizeValues.map((shoe, index) => {
            return sizeValues[index] = shoe.slice(8).trim()

        }).reduce((end, currentItem, i) => {
            end[currentItem] = productID[i];
            shoeOrCloth = true
            return end;
        }, {});
    } else {
        console.log('product is a piece of clothing')
        return sizeValues.reduce((end, currentItem, i) => {
            shoeOrCloth = false
            end[currentItem] = productID[i];
            return end;
        }, {});
    }
}

 async function almost2Checkout(object) {
    let desiredItemID;
    let size = config.targetedSize;
    console.log(size)
    //to get size names to itertate through them

    //if statement checking if shoeOrCloth is true or not 
    if (shoeOrCloth) {
        for (const key of Object.keys(object)) {
            if (key.includes(size)) {
                console.log(`Key "${object[key]}" does include! size "${size}"!`);
                desiredItemID = object[key]
                return desiredItemID
            } else {
                console.log(`not ID with size`);
            }
        }
    } else {
        for (const key of Object.keys(object)) {
            if (key.includes(size)) {
                console.log(`Key "${object[key]}" does include! size "${size}"!`);
                desiredItemID = object[key]
                return desiredItemID
            } else {
                console.log('not ID with size')
            }
            //need to make a retry thing right here
            return console.log('no matches found in sizing ')
            
        }
    }


}





module.exports.getDesiredItem = getDesiredItem
module.exports.almost2Checkout = almost2Checkout